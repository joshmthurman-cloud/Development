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

Backend on **port 8093**, frontend on **port 3000**. After pulling the repo on the server:

**1. Backend (terminal 1):**
```bash
cd /path/to/cedp-error-analyzer
chmod +x run-backend.sh
./run-backend.sh
```
Backend will be at **http://10.200.0.235:8093** (and http://localhost:8093).

**2. Frontend (terminal 2):**
```bash
cd /path/to/cedp-error-analyzer/frontend
cp env.example .env
# Edit .env if your server IP is different: NEXT_PUBLIC_API_URL=http://10.200.0.235:8093
cd ..
chmod +x run-frontend.sh
./run-frontend.sh
```
Frontend will be at **http://10.200.0.235:3000**. Open that URL in a browser; the app will call the backend at the URL in `.env`.

**Firewall:** If needed, allow ports 8093 and 3000:
```bash
sudo ufw allow 8093/tcp
sudo ufw allow 3000/tcp
sudo ufw reload
```

## API

- `GET /health` — returns `{ "ok": true }`.
- `POST /analyze` — `multipart/form-data` with field `file` (`.xlsx`). Returns a JSON array of transaction results with `trx_pk`, `error_codes`, `failures`, and `highlight_columns`.
