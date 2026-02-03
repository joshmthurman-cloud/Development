# Setup Guide for Terminal Status Monitor

## Step 1: Install Python 3.11 or Higher

You need to install Python first. Here are your options:

### Option A: Download from python.org (Recommended)
1. Go to https://www.python.org/downloads/
2. Download Python 3.11 or higher for Windows
3. **IMPORTANT**: During installation, check the box "Add Python to PATH"
4. Complete the installation

### Option B: Use Windows Store
1. Open Microsoft Store
2. Search for "Python 3.11" or "Python 3.12"
3. Install it

### Option C: Use Anaconda/Miniconda
1. Download from https://www.anaconda.com/download or https://docs.conda.io/en/latest/miniconda.html
2. Install it
3. Anaconda includes Python and pip

## Step 2: Verify Python Installation

Open a **new** PowerShell or Command Prompt window and run:

```powershell
python --version
```

You should see something like: `Python 3.11.x` or `Python 3.12.x`

If it still doesn't work:
- Try `python3 --version`
- Or `py --version`
- Make sure you opened a NEW terminal window after installing Python

## Step 3: Navigate to Project Directory

```powershell
cd "C:\DEJ Status Monitor"
```

## Step 4: Create Virtual Environment (Recommended)

```powershell
python -m venv venv
```

## Step 5: Activate Virtual Environment

```powershell
# In PowerShell:
.\venv\Scripts\Activate.ps1

# If you get an execution policy error, run this first:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or in Command Prompt (cmd):
venv\Scripts\activate.bat
```

After activation, you should see `(venv)` at the beginning of your prompt.

## Step 6: Install Dependencies

```powershell
python -m pip install -r requirements.txt
```

If `pip` doesn't work, use:
```powershell
python -m pip install -r requirements.txt
```

## Step 7: Update TPN File

Make sure `tpns.txt` contains your actual TPNs (one per line). 
You've already added your TPNs, so this should be ready!

## Step 8: Run the Application

```powershell
# Option 1: Using the run script
python run.py

# Option 2: Using uvicorn directly
python -m uvicorn app.main:app --reload

# Option 3: Using uvicorn command (if it's in PATH)
uvicorn app.main:app --reload
```

## Step 9: Access the Web Interface

Open your browser and go to:
```
http://localhost:8000
```

## Troubleshooting

### "pip is not recognized"
- Use `python -m pip` instead of just `pip`
- Make sure Python is installed and in your PATH
- Open a new terminal window after installing Python

### "uvicorn is not recognized"
- Use `python -m uvicorn` instead
- Or activate your virtual environment first

### "Module not found" errors
- Make sure you activated the virtual environment
- Reinstall dependencies: `python -m pip install -r requirements.txt`

### Port already in use
- Change the port: `python -m uvicorn app.main:app --reload --port 8001`
- Or find and stop the process using port 8000

### Database errors
- The database will be created automatically on first run
- If you need to reset, delete `status_monitor.db` file

## Quick Start (After Python is Installed)

```powershell
# 1. Navigate to project
cd "C:\DEJ Status Monitor"

# 2. Create and activate venv
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install dependencies
python -m pip install -r requirements.txt

# 4. Run the app
python run.py
```

Then open http://localhost:8000 in your browser!
