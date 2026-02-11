@echo off
cd /d "%~dp0"
echo Starting backend without reload (single process)...
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --port 8000 --host 127.0.0.1
pause
