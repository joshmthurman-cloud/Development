@echo off
cd /d "%~dp0"
echo Installing backend dependencies (60 sec timeout per package)...
echo.
.\.venv\Scripts\python.exe -m pip install --timeout 60 fastapi "uvicorn[standard]" pandas openpyxl python-multipart pydantic
echo.
echo Done. If you saw errors above, you may need Python 3.11 or 3.12 (see README).
pause
