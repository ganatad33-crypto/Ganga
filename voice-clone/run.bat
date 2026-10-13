@echo off
REM התקנה (בפעם הראשונה) והפעלה — Windows
cd /d "%~dp0"
if not exist .venv (
  py -3.11 -m venv .venv || python -m venv .venv
  .venv\Scripts\python -m pip install --upgrade pip
  .venv\Scripts\pip install -r requirements.txt
)
.venv\Scripts\python app.py %*
