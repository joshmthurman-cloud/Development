from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .parsers import load_error_key, read_transactions, analyze
from .models import TransactionResult

app = FastAPI(title="CEDP Error Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://10.200.0.4:3000",
        "http://10.200.0.235:3000",
        "http://localhost:8093",
        "http://127.0.0.1:8093",
        "http://10.200.0.235:8093",
    ],
    allow_origin_regex=r"http://[^:]+:(3000|8093)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Error key path: backend/app/data/ErrorKey.csv relative to repo root
DATA_DIR = Path(__file__).resolve().parent / "data"
ERROR_KEY_PATH = DATA_DIR / "ErrorKey.csv"


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/analyze", response_model=list[TransactionResult])
async def analyze_upload(file: UploadFile = File(..., alias="file")):
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Please upload an .xlsx file")
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {e}")

    try:
        transactions_df = read_transactions(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse XLSX: {e}")

    if not ERROR_KEY_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Error key file not found at {ERROR_KEY_PATH}",
        )
    error_key_df = load_error_key(ERROR_KEY_PATH)

    try:
        results = analyze(transactions_df, error_key_df)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return results
