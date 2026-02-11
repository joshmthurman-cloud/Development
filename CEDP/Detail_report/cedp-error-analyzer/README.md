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

## API

- `GET /health` — returns `{ "ok": true }`.
- `POST /analyze` — `multipart/form-data` with field `file` (`.xlsx`). Returns a JSON array of transaction results with `trx_pk`, `error_codes`, `failures`, and `highlight_columns`.
