# If `pip install streamlit` Hangs on Windows

Do these in order. Use **Ctrl+C** to stop any stuck command.

---

## Step 1: Use a virtual environment (often fixes hangs)

In PowerShell or Command Prompt:

```powershell
cd "c:\Development\Availability Engine\Rentalman_Mobile_Gemini"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If you get "script execution disabled", run once:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then activate again: `.\.venv\Scripts\Activate.ps1`

You should see `(.venv)` in your prompt.

---

## Step 2: Upgrade pip (fast)

```powershell
python -m pip install --upgrade pip
```

---

## Step 3: Install Streamlit with verbose output (so you see progress)

```powershell
python -m pip install streamlit -v
```

If it hangs, note the **last package name** shown—that’s where it’s stuck.

---

## Step 4: If it still hangs – install with a timeout

```powershell
python -m pip install --default-timeout=100 streamlit
```

---

## Step 5: Run the app

```powershell
streamlit run rentalman_app.py
```

Or: `python -m streamlit run rentalman_app.py`

---

## If nothing works: use Conda (alternative)

If you have [Miniconda](https://docs.conda.io/en/latest/miniconda.html) or Anaconda:

```powershell
conda create -n rentalman python=3.11 -y
conda activate rentalman
pip install streamlit
streamlit run rentalman_app.py
```
