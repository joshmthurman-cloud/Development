from pydantic import BaseModel
from typing import Optional


class Failure(BaseModel):
    error_code: str
    field_name: str
    content_column: str
    description: str
    notes: str
    type: str
    size: str
    mco: str
    transaction_value: Optional[str] = None


class TransactionResult(BaseModel):
    trx_pk: str
    merchant_name: str
    merchant_name_column: str
    row_data: dict[str, str]
    column_order: list[str] = []  # column names in display order; empty = use row_data keys order
    error_codes: list[str]
    failures: list[Failure]
    highlight_columns: list[str]
    yellow_columns: list[str] = []
    source_amount_message: Optional[str] = None
