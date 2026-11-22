#!/usr/bin/env bash
# Installs dependencies and downloads the speech model (about 480 MB) next to this script.
set -euo pipefail
cd "$(dirname "$0")"
python3 -m pip install -q sherpa-onnx soundfile opencv-python-headless pillow numpy
mkdir -p models && cd models
B=https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models
[ -s silero_vad.onnx ] || curl -L --fail -o silero_vad.onnx "$B/silero_vad.onnx"
if [ ! -d sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8 ]; then
  curl -L --fail -o pk.tar.bz2 "$B/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8.tar.bz2"
  tar xjf pk.tar.bz2 && rm pk.tar.bz2
fi
echo "ready"
