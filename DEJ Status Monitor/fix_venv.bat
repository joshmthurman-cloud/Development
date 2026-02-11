@echo off
echo ========================================
echo Fixing Virtual Environment
echo ========================================
echo.

echo Removing old virtual environment...
if exist venv (
    rmdir /s /q venv
    echo Old venv removed.
) else (
    echo No existing venv found.
)
echo.

echo Creating new virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Failed to create virtual environment
    pause
    exit /b 1
)
echo Virtual environment created!
echo.

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.
echo ========================================
echo Virtual environment fixed!
echo ========================================
echo.
echo You can now run: python run.py
echo.
pause
