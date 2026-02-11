# CEDP Error Analyzer

Upload `Content.xlsx`, parse transaction error codes, join to `ErrorKey.csv`, and view a report with expandable failures and mapped columns.

## Setup

### Backend (Python)

From the **repo root** (`cedp-error-analyzer/`):

**Windows (PowerShell):**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

**Unix (bash/zsh):**
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

Backend runs at **http://localhost:8000**.

### Frontend (Next.js)

In a second terminal, from the repo root:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:3000**.

## Usage

1. Open http://localhost:3000.
2. Choose a `Content.xlsx` file (sheet name **Content**, with column **Overall Observation(s) (For observation description please refer to 'Error Code Description Tab')** for error codes and **Trx PK** for transaction id).
3. Click **Analyze**.
4. Use the table: expand a row to see failures; click a failure to highlight it and see the mapped column and value.

## Data

- **Error key:** `backend/app/data/ErrorKey.csv` (included).
- **Transaction file:** You upload `Content.xlsx` via the UI.

## Running on Ubuntu server (e.g. 10.200.0.235)

Users open **port 8093** (frontend). Backend runs on **port 8900**. Backend reloads on file changes; if either process exits, it is restarted.

**One command, keeps running after you close the terminal (recommended on server):**
```bash
cd /path/to/cedp-error-analyzer
cd frontend && cp env.example .env && cd ..
# Edit frontend/.env if your server IP is different: NEXT_PUBLIC_API_URL=http://10.200.0.235:8900
chmod +x run-all-persistent.sh run-all-stop.sh run-all.sh run-backend.sh run-frontend.sh
./run-all-persistent.sh
```
Then close the terminal; the app keeps running. Users open **http://10.200.0.235:8093**. Logs go to `run-all.log`. To stop later: `./run-all-stop.sh`.

**Foreground (stop with Ctrl+C):**
```bash
./run-all.sh
```

**Or run backend and frontend in separate terminals:**
- Terminal 1: `./run-backend.sh` (http://10.200.0.235:8900)
- Terminal 2: `./run-frontend.sh` (http://10.200.0.235:8093)

**Firewall:** Allow ports 8093 (frontend) and 8900 (backend):
```bash
sudo ufw allow 8093/tcp
sudo ufw allow 8900/tcp
sudo ufw reload
```

## API

- `GET /health` — returns `{ "ok": true }`.
- `POST /analyze` — `multipart/form-data` with field `file` (`.xlsx`). Returns a JSON array of transaction results with `trx_pk`, `error_codes`, `failures`, and `highlight_columns`.
