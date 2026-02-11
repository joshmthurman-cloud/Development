# TPN Finder

A tool to query terminal status and record TPNs (Terminal Point Numbers) that return "Online" status.

## Quick Start (No Installation Required!)

**Easiest way to run:**

1. **Double-click `run_check.bat`** - That's it!

The script will prompt you for:
- TPN length (10-12 digits)
- Starting TPN (optional - leave empty to start from all zeros)
- Number of TPNs to check (optional - leave empty for continuous)
- Delay between checks (default: 0.1 seconds)

**Output:**
- All responses saved to `tpn_results.txt`
- Online TPNs also saved to `online_tpns.txt`

## How It Works

The script checks TPNs sequentially in order:
- Starts at 0000000000 (or your specified start)
- Increments: 0000000001, 0000000002, ... 0000000009, 000000000A, ... 000000000Z, 0000000010, etc.
- Saves every response to the results file
- Highlights when "Online" TPNs are found

## Files

- **`check_tpns.ps1`** - PowerShell script (no installation needed - uses built-in Windows PowerShell)
- **`check_tpns.py`** - Python version (requires Python installation)
- **`tpn_finder.py`** - Advanced Python script with command-line options
- **`run_check.bat`** - Windows batch file to easily run the script

## Output Files

- **`tpn_results.txt`** - All TPNs checked with their status responses
- **`online_tpns.txt`** - Only TPNs that returned "Online" status

## Alternative: Python Version

If you prefer Python, first install it:
1. Install Python 3.7+ from python.org
2. Install dependencies: `pip install -r requirements.txt`
3. Run: `python check_tpns.py`
