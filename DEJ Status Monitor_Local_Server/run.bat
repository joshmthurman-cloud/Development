@echo off
echo Starting Terminal Status Monitor...
echo.

REM Check if virtual environment exists
if not exist "venv\Scripts\activate.bat" (
    echo Virtual environment not found!
    echo Please run setup.bat first.
    pause
    exit /b 1
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Run from the folder where this bat file lives (so run.py and app are found)
cd /d "%~dp0"

REM Run the application
python run.py

REM Keep window open if the app exits (so you can see any error)
pause
