@echo off
echo Starting TPN Checker...
echo.
powershell.exe -ExecutionPolicy Bypass -File "%~dp0check_tpns.ps1"
if errorlevel 1 (
    echo.
    echo Error running script. Make sure PowerShell is available.
    pause
)
