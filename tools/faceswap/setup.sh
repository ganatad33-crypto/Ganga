#!/usr/bin/env bash
# Installs dependencies and downloads the models (about 1.3 GB) next to this script.
set -euo pipefail
cd "$(dirname "$0")"
python3 -m pip install -q insightface onnxruntime opencv-python-headless numpy
mkdir -p models/insight/models/buffalo_l && cd models
FF=https://github.com/facefusion/facefusion-assets/releases/download/models-3.0.0
for f in inswapper_128.onnx gfpgan_1.4.onnx bisenet_resnet_34.onnx; do
  [ -s "$f" ] || curl -L --fail -o "$f" "$FF/$f"
done
if [ ! -s insight/models/buffalo_l/det_10g.onnx ]; then
  curl -L --fail -o buffalo_l.zip https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip
  python3 -c "import zipfile; zipfile.ZipFile('buffalo_l.zip').extractall('insight/models/buffalo_l')"
  rm buffalo_l.zip
fi
echo "ready"
