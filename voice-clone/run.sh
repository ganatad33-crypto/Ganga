#!/usr/bin/env bash
# התקנה (בפעם הראשונה) והפעלה — Linux / macOS
set -e
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  python3.11 -m venv .venv 2>/dev/null || python3 -m venv .venv
  .venv/bin/pip install --upgrade pip
  .venv/bin/pip install -r requirements.txt
fi
.venv/bin/python app.py "$@"
