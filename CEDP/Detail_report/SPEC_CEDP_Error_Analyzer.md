# CEDP Error Analyzer — Cursor Build Spec (MVP)

Build a small web app that lets a user upload `Content.xlsx`, parses each transaction’s error codes, joins them to `ErrorKey.csv`, and returns a report where each transaction row can expand to show all failures. For each failure, show the *why* and (if mapped) highlight the implicated field/column.

---

## Goals (MVP)

1. Upload `Content.xlsx` via a web UI.
2. Backend parses the “Content” sheet into transactions.
3. Extract error codes from the error-code column (comma-separated).
4. Join each error code to the error key CSV (enriched descriptions/notes/constraints).
5. UI shows:
   - one row per transaction
   - a “Failures” count
   - a dropdown/accordion per row listing all failures
   - clicking a failure highlights the mapped column name (and ideally the cell value from the transaction)

**Must be resilient**:
- Unknown codes should not crash; show them as “Unknown code”.
- Missing/blank `content column` should not crash; show “Field mapping not set”.

---

## Repo structure

```
cedp-error-analyzer/
  backend/
    app/
      __init__.py
      main.py
      parsers.py
      models.py
      data/
        ErrorKey.csv
  frontend/
    (Next.js app)
```

Place the provided CSV at: `backend/app/data/ErrorKey.csv`

---

## Data sources

### 1) Error Key CSV: `ErrorKey.csv`

Expected columns (case-insensitive, trimmed):

- `Error Codes`  (primary key; e.g., CS-0004)
- `Description`
- `Field Name`
- `content column`  (exact column header in Content.xlsx; may be blank)
- `Type`
- `Size`
- `M/C/O`
- `Notes`

**Important**:
- Some rows may have blank `content column`. That is allowed.
- `Notes` may contain commas and newlines; CSV is properly quoted.

Normalize columns to snake_case in code:

- `error_code`
- `description`
- `field_name`
- `content_column`
- `type`
- `size`
- `mco`
- `notes`

### 2) Transaction File: `Content.xlsx`

- Sheet name: `Content`
- Contains one row per transaction.
- Error codes column contains one or more codes separated by commas (`,`) and optional spaces.

**Error codes column name (exact)**:
`Overall Observation(s) (For observation description please refer to 'Error Code Description Tab')`

Use `Trx PK` as the transaction row id.

---

## Backend: FastAPI (Python)

### Dependencies

- fastapi
- uvicorn
- pandas
- openpyxl
- python-multipart (for file upload)
- pydantic

### Endpoints

#### GET `/health`
Returns:
```json
{ "ok": true }
```

#### POST `/analyze`
Accepts `multipart/form-data` with file field name: `file`

Behavior:
1. Read uploaded XLSX with pandas, sheet `Content`.
2. Identify the error codes column exactly as specified above.
3. For each row:
   - `trx_pk = row["Trx PK"]`
   - `raw_codes = row[error_codes_col]`
   - split by `,` into list
   - trim whitespace
   - drop empties
4. Load `ErrorKey.csv` from `backend/app/data/ErrorKey.csv`
5. Join each code to error key table by `error_code`
6. Build response: list of transactions, each includes:
   - `trx_pk`
   - `error_codes` (list)
   - `failures` (list of enriched failures)
   - `highlight_columns` (unique list of non-empty `content_column` values)

Unknown codes:
- include a failure object with:
  - `description = "Unknown code"`
  - `field_name = ""`
  - `content_column = ""`
  - other fields empty

Blank content_column:
- still include failure, but do not include in highlight_columns

Return shape:
```json
[
  {
    "trx_pk": "123",
    "error_codes": ["CS-0004", "TC50-1004"],
    "failures": [
      {
        "error_code": "CS-0004",
        "field_name": "Local Tax Included",
        "content_column": "TC05TCR6\nLocal Tax Included",
        "description": "...",
        "notes": "...",
        "type": "N",
        "size": "1",
        "mco": "C",
        "transaction_value": "0"   // optional but recommended
      }
    ],
    "highlight_columns": ["TC05TCR6\nLocal Tax Included"]
  }
]
```

**Recommended addition**: include `transaction_value` for the mapped column (if present in Content.xlsx) to help the UI show “this exact cell is the issue”.

### CORS
Allow frontend dev origin:
- `http://localhost:3000`

### Files to implement

#### `backend/app/models.py`
Pydantic models:
- `Failure`
- `TransactionResult`

#### `backend/app/parsers.py`
Functions:
- `load_error_key(csv_path) -> pd.DataFrame`
- `read_transactions(xlsx_bytes) -> pd.DataFrame`
- `parse_codes(raw: Any) -> list[str]`
- `analyze(transactions_df, error_key_df) -> list[TransactionResult]`

#### `backend/app/main.py`
- FastAPI app
- CORS middleware
- endpoints `/health`, `/analyze`

### Backend run
From repo root:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

Create `backend/requirements.txt` with the dependencies above.

---

## Frontend: Next.js (App Router, TypeScript)

### Requirements
- A single page with:
  - file upload input (accept .xlsx)
  - submit button
  - results table

### UI behavior (MVP)
- After upload, call `POST http://localhost:8000/analyze`
- Render table:
  - `Trx PK`
  - `Failure Count`
  - Expand/collapse control (accordion per row)

Accordion content per transaction:
- List each failure:
  - `error_code` (bold)
  - `field_name`
  - `description`
  - `notes`
  - `type / size / mco`
  - `content_column` (or “Field mapping not set”)

Interaction:
- Clicking a failure item:
  - visually highlight it
  - display `content_column` prominently
  - if `transaction_value` is provided, show `Value: ...`

### Frontend run
```bash
cd frontend
npm install
npm run dev
```

---

## Acceptance Criteria (MVP)

1. Uploading `Content.xlsx` returns results without errors.
2. Rows with multiple codes show multiple failures in the accordion.
3. Unknown codes are displayed as “Unknown code” and do not break the UI.
4. Blank `content column` is handled gracefully with “Field mapping not set”.
5. Clicking a failure highlights it and shows the mapped `content column` (and value if available).

---

## Notes / Future Enhancements (not required for MVP)

- Add fuzzy matching for `content column` if exact header differs.
- Add export: download enriched Excel output.
- Add “Detail Records” view: one row per (trx_pk, error_code).
- Add validation rules engine (type/size/required/conditional) beyond code-driven mapping.
