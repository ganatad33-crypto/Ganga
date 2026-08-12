/*
 * ניתוח תווי פנים מהתמונה.
 * ניסיון ראשון: זיהוי אוטומטי עם MediaPipe FaceLandmarker (רץ כולו בדפדפן — התמונה לא עוזבת את המכשיר).
 * גיבוי: הזנה ידנית של תווי הפנים.
 */
const FaceEngine = (function () {
  let landmarker = null;
  let initTried = false;

  async function init() {
    if (landmarker || initTried) return landmarker;
    initTried = true;
    try {
      const vision = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm");
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        },
        runningMode: "IMAGE",
        numFaces: 1,
      });
      return landmarker;
    } catch (e) {
      console.warn("זיהוי אוטומטי לא זמין:", e);
      return null;
    }
  }

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const band = (v, lo, hi) => (v < lo ? "low" : v > hi ? "high" : "mid");

  /* המרת 468 נקודות הציון לרמות של 8 תווי הפנים */
  function metricsFromLandmarks(lm) {
    const p = (i) => lm[i];
    const faceH = dist(p(10), p(152));   // קצה מצח–סנטר
    const faceW = dist(p(234), p(454));  // רוחב לחיים
    if (!faceH || !faceW) return null;

    const eyeWL = dist(p(33), p(133));
    const eyeWR = dist(p(362), p(263));
    const avgEyeW = (eyeWL + eyeWR) / 2;

    return {
      forehead:  band(dist(p(10), p(8)) / faceH, 0.30, 0.36),
      faceWidth: band(faceW / faceH, 0.80, 0.92),
      eyeSpacing: band(dist(p(133), p(362)) / avgEyeW, 0.95, 1.20),
      eyeSize:   band(dist(p(159), p(145)) / eyeWL, 0.30, 0.42),
      noseWidth: band(dist(p(98), p(327)) / faceW, 0.24, 0.29),
      lips:      band((dist(p(0), p(13)) + dist(p(14), p(17))) / faceH, 0.055, 0.085),
      jaw:       band(dist(p(58), p(288)) / faceW, 0.72, 0.82),
      lowerFace: band(dist(p(2), p(152)) / faceH, 0.33, 0.38),
    };
  }

  /* ניתוח תמונה: מחזיר {metrics} או {error} */
  async function analyze(imgEl) {
    const lmk = await init();
    if (!lmk) return { error: "auto-unavailable" };
    try {
      const res = lmk.detect(imgEl);
      if (!res.faceLandmarks || !res.faceLandmarks.length) return { error: "no-face" };
      const metrics = metricsFromLandmarks(res.faceLandmarks[0]);
      return metrics ? { metrics } : { error: "no-face" };
    } catch (e) {
      console.warn(e);
      return { error: "auto-unavailable" };
    }
  }

  return { analyze };
})();
