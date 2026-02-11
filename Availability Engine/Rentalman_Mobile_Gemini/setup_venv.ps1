# Create venv and install Streamlit (run from project folder)
# Usage: .\setup_venv.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "Creating virtual environment..." -ForegroundColor Cyan
py -m venv .venv
if ($LASTEXITCODE -ne 0) { Write-Host "Failed to create venv. Is Python installed? Try: py --version" -ForegroundColor Red; exit 1 }

Write-Host "Activating venv..." -ForegroundColor Cyan
& .\.venv\Scripts\Activate.ps1

Write-Host "Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip --quiet

Write-Host "Installing Streamlit (this may take 2-5 min)..." -ForegroundColor Cyan
python -m pip install streamlit

Write-Host ""
Write-Host "Done. To run the app:" -ForegroundColor Green
Write-Host "  .\.venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "  streamlit run rentalman_app.py" -ForegroundColor White
