"""Local video face swap (CPU only).

Pipeline per frame: detect face -> swap (inswapper) -> face-parsing mask that keeps hair ->
restore the original mouth when the swapped mouth shape disagrees -> GFPGAN sharpening.
Use only with faces of people who agreed to it.
"""
import argparse, os, subprocess, sys, time, cv2, numpy as np, onnxruntime as ort, insightface
from insightface.app import FaceAnalysis
from insightface.utils import face_align
P=['CPUExecutionProvider']
FFHQ=np.array([[192.98138,239.94708],[318.90277,240.1936],[256.63416,314.01935],[201.26117,371.41043],[313.08905,371.15118]],np.float32)
area=lambda f:(f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1])
class Swapper:
    def __init__(s,root,src,enh=0.75,mouth=True):
        s.app=FaceAnalysis(name='buffalo_l',root=root+'/insight',providers=P,allowed_modules=['detection','recognition'])
        s.app.prepare(ctx_id=-1,det_size=(640,640))
        s.sw=insightface.model_zoo.get_model(root+'/inswapper_128.onnx',providers=P)
        s.par=ort.InferenceSession(root+'/bisenet_resnet_34.onnx',providers=P)
        s.gfp=ort.InferenceSession(root+'/gfpgan_1.4.onnx',providers=P)
        s.src=max(s.app.get(cv2.imread(src)),key=area); s.enh=enh; s.mouth=mouth; s.last=None; s.min_area=0.01
    def parse(s,img512):
        x=cv2.cvtColor(img512,cv2.COLOR_BGR2RGB).astype(np.float32)/255
        x=((x-[0.485,0.456,0.406])/[0.229,0.224,0.225]).transpose(2,0,1)[None].astype(np.float32)
        return s.par.run(None,{s.par.get_inputs()[0].name:x})[0][0].argmax(0)
    def enhance(s,img512):
        x=(cv2.cvtColor(img512,cv2.COLOR_BGR2RGB).astype(np.float32)/255-0.5)/0.5
        y=s.gfp.run(None,{s.gfp.get_inputs()[0].name:x.transpose(2,0,1)[None]})[0][0]
        y=((np.clip(y,-1,1)+1)/2*255).transpose(1,2,0)
        return cv2.cvtColor(y.astype(np.uint8),cv2.COLOR_RGB2BGR)
    def detect(s,fr):
        H,W=fr.shape[:2]; px,py=W//2,H//2
        big=cv2.copyMakeBorder(fr,py,py,px,px,cv2.BORDER_CONSTANT,value=(0,0,0))
        fs=[f for f in s.app.get(big) if area(f)>s.min_area*W*H]
        for f in fs: f.kps=f.kps-[px,py]; f.bbox=f.bbox-[px,py,px,py]
        if not fs: fs=[f for f in s.app.get(fr) if area(f)>s.min_area*W*H]   # small faces: retry without padding
        if not fs: s.last=None; return None
        f=max(fs,key=area)
        # light temporal smoothing of landmarks, reset on scene change
        size=np.linalg.norm(f.kps[0]-f.kps[1])
        if s.last is not None and np.abs(f.kps-s.last).max()<0.25*size: f.kps=(0.65*f.kps+0.35*s.last).astype(np.float32)
        s.last=f.kps.copy(); return f
    def __call__(s,fr,dbg=None):
        f=s.detect(fr)
        if f is None: return fr,0
        H,W=fr.shape[:2]
        Mf=cv2.estimateAffinePartial2D(f.kps,FFHQ,method=cv2.LMEDS)[0]
        o512=cv2.warpAffine(fr,Mf,(512,512),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
        fake,Ma=s.sw.get(fr,f,s.src,paste_back=False)
        # arcface-128 space -> ffhq-512 space
        A=np.vstack([Ma,[0,0,1]]); T=np.vstack([Mf,[0,0,1]])@np.linalg.inv(A)
        f512=cv2.warpAffine(fake,T[:2],(512,512),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)
        valid=cv2.warpAffine(np.full((128,128),255,np.uint8),T[:2],(512,512))
        valid=cv2.erode(valid,np.ones((25,25),np.uint8))
        po=s.parse(o512)
        FACE=[1,2,3,4,5,6,10,11,12,13]; LIPS=[11,12,13]
        m=(np.isin(po,FACE)&(valid>0)).astype(np.float32)
        m=cv2.GaussianBlur(cv2.erode(m,np.ones((5,5),np.uint8)),(0,0),6)[...,None]
        comp=o512*(1-m)+f512*m
        w=0.0
        if s.mouth:
            pf=s.parse(f512)
            lo=np.isin(po,LIPS); lf=np.isin(pf,LIPS)&(valid>0)
            iou=(lo&lf).sum()/max((lo|lf).sum(),1)
            w=float(np.clip((0.62-iou)/0.30,0,1))   # mouth shapes disagree -> trust the original mouth
            if w>0 and lo.sum()>50:
                skin=(po==1)&(valid>0)
                a=cv2.cvtColor(o512,cv2.COLOR_BGR2LAB).astype(np.float32); b=cv2.cvtColor(np.clip(comp,0,255).astype(np.uint8),cv2.COLOR_BGR2LAB).astype(np.float32)
                if skin.sum()>500:  # tone-match original mouth area to the new skin
                    sh=b[skin].mean(0)-a[skin].mean(0); sh[0]*=0.6; a=np.clip(a+sh,0,255)
                oc=cv2.cvtColor(a.astype(np.uint8),cv2.COLOR_LAB2BGR).astype(np.float32)
                k=max(9,int(np.sqrt(lo.sum())*0.9))|1
                mm=cv2.dilate((lo|lf).astype(np.float32),cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(k,k)))
                mm=cv2.GaussianBlur(mm,(0,0),k/3)[...,None]*w*m
                comp=comp*(1-mm)+oc*mm
        comp=np.clip(comp,0,255).astype(np.uint8)
        out=comp
        if s.enh>0:
            e=s.enhance(comp); out=cv2.addWeighted(e,s.enh,comp,1-s.enh,0)
        pm=cv2.GaussianBlur(cv2.dilate(m[...,0],np.ones((7,7),np.uint8)),(0,0),4)
        Mi=cv2.invertAffineTransform(Mf)
        back=cv2.warpAffine(out,Mi,(W,H),flags=cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
        mk=cv2.warpAffine(pm,Mi,(W,H))[...,None]
        if dbg is not None: dbg.append(w)
        return np.clip(fr*(1-mk)+back*mk,0,255).astype(np.uint8),1
def main():
    here=os.path.dirname(os.path.abspath(__file__))
    ap=argparse.ArgumentParser(description='Swap the largest face in a video with the face from a photo.')
    ap.add_argument('--video',required=True); ap.add_argument('--face',required=True,help='photo of the new face')
    ap.add_argument('--out',required=True); ap.add_argument('--start',type=float,default=0.0,help='seconds')
    ap.add_argument('--end',type=float,default=None,help='seconds (default: end of video)')
    ap.add_argument('--models',default=os.path.join(here,'models'))
    ap.add_argument('--sharpen',type=float,default=0.75,help='0 disables GFPGAN (twice as fast, softer)')
    ap.add_argument('--no-mouth-restore',action='store_true')
    a=ap.parse_args()
    cap=cv2.VideoCapture(a.video); fps=cap.get(5); W=int(cap.get(3)); H=int(cap.get(4)); total=int(cap.get(7))
    end=a.end if a.end is not None else total/fps
    sw=Swapper(a.models,a.face,enh=a.sharpen,mouth=not a.no_mouth_restore)
    cap.set(1,int(a.start*fps)); tmp=a.out+'.silent.mp4'
    vw=cv2.VideoWriter(tmp,cv2.VideoWriter_fourcc(*'mp4v'),fps,(W,H)); n=hit=0; N=int((end-a.start)*fps); t0=time.time()
    while n<N:
        ok,fr=cap.read()
        if not ok: break
        o,h=sw(fr); hit+=h; vw.write(o); n+=1
        if n%25==0: print(f'{n}/{N} frames, {hit} swapped, {time.time()-t0:.0f}s',flush=True)
    vw.release()
    # re-encode to H.264 and bring the original audio back
    subprocess.run(['ffmpeg','-loglevel','error','-y','-i',tmp,'-ss',str(a.start),'-t',str(n/fps),'-i',a.video,
                    '-map','0:v','-map','1:a?','-c:v','libx264','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-shortest',a.out],check=True)
    os.remove(tmp); print(f'done: {n} frames, {hit} swapped -> {a.out}')
if __name__=='__main__': main()
