import io
import re
import pandas as pd
from pathlib import Path
from typing import Any

from .models import Failure, TransactionResult


def _normalize_col(c: Any) -> str:
    if c is None:
        return ""
    return str(c).replace("\n", " ").strip()


def _find_column(columns: list[Any], *candidates: str) -> str | None:
    """Return first column in columns that matches any candidate (exact or normalized)."""
    for col in columns:
        if col is None:
            continue
        n = _normalize_col(col)
        for cand in candidates:
            if col == cand or n == cand or n == _normalize_col(cand):
                return col
    return None


def _parse_amount(val: Any) -> float | None:
    """Parse a cell value to float; strip currency, commas, spaces. Return None if not parseable."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    s = str(val).strip()
    if not s:
        return None
    s = re.sub(r"[$,\s]", "", s)
    try:
        return float(s)
    except ValueError:
        return None

# Exact error codes column name we use in code
ERROR_CODES_COLUMN = "Overall Observation(s) (For observation description please refer to 'Error Code Description Tab')"
TRX_PK_COLUMN = "Trx PK"

# Alternative header names that map to ERROR_CODES_COLUMN (for flexible file uploads)
ERROR_CODES_COLUMN_ALIASES = [
    "overall_observations_for_observation_description_please_refer_to_error_code_description_tab",
    "Overall Observations (For observation description please refer to 'Error Code Description Tab')",
    "Overall Observations",
    "Error Code Description Tab",
    "Observations",
]

# Merchant name column: file may use "TC05TCR0 Merchant Name" or "TC05TCR0\nMerchant Name"
MERCHANT_NAME_CANDIDATES = ("TC05TCR0 Merchant Name", "TC05TCR0\nMerchant Name")

# Columns to exclude from row_data in the response
EXCLUDED_COLUMNS = {"Trx PK", "Acq BID", "Acq Identifier", "Acq CIB BID", "Acq CIB BID Name"}

# Preferred display order for columns (Merchant Name and Failure Count are handled separately in UI)
PREFERRED_COLUMN_ORDER = [
    "TC05TCR5 Transaction Identifier",
    "Item Sequence Number.1",
    "TC05TCR0 Purchase Date",
    "TC05TCR0 Central Processing Date (CPD)",
    "TC05TCR0 Source Amount",
    "TC05TCR6 Local Tax Included",
    "TC05TCR6 Local Tax",
    "Discount Amount",
    "Freight/Shipping Amount",
    "Quantity",
    "Unit of Measure",
    "Unit Cost",
    "Line Item Total",
    "Item Commodity Code",
    "Item Descriptor",
    "Product Code",
    "Acquirer Name",
    "TC05TCR0 Authorization Code",
    "TC05TCR1 Card Acceptor ID",
    "TC05TCR0 Acquirer Reference Number",
    "GMR Business Name",
    "Merchant Street",
    "TC05TCR0 Merchant City",
    "TC05TCR0 Merchant State/Province Code",
    "TC05TCR0 Merchant Country Code",
    "TC05TCR0 Merchant ZIP Code",
    "TC05TCR0 Merchant Category Code",
    "Source Amount (USD)",
    "VAT/Tax Amount",
    "VAT/Tax Amount (Freight/Shipping)",
    "TC05TCR6 National Tax Included",
    "TC05TCR6 National Tax",
    "TC05TCR5 Merchant Verification Value",
    "TC05TCR0 Number of Payment Forms",
    "TC05TCR1 Purchase Identifier Format",
    "TC05TCR6 Time of Purchase",
    "TC05TCR6 Message Identifier",
    "Item Sequence Number",
    "Authorization Code",
    "Discount Amount Signage",
    "Freight/Shipping Amount Signage",
    "Order Date",
    "Duty Amount Signage",
    "Duty Amount",
    "Destination Postal/ZIP Code",
    "Destination Country Code",
    "Ship From Postal/ZIP Code",
    "Unique VAT Invoice Reference Number",
    "VAT/Tax Amount Signage",
    "VAT/Tax Rate (Freight/Shipping)",
    "Invoice Level Discount Treatment Code",
    "Tax Treatments",
    "VAT/Tax Rate",
    "Discount per Line Item",
    "Line Item Detail Indicator",
    "Line Item Level Discount Treatment Code",
    "Observation(s) (For observation description please refer to 'Error Code Description Tab')",
    "Overall Observation(s) (For observation description please refer to 'Error Code Description Tab')",
]

# Name key matrix: file header (alternative) -> canonical column name we use in code.
# Allows uploads with different header names; both standard and alternative names are accepted.
NAME_KEY_MATRIX = {
    "trx_pk__": "Trx PK",
    "acquirer_name__": "Acquirer Name",
    "acq_bid__": "Acq BID",
    "acq_identifier__": "Acq Identifier",
    "acq_cib_bid__": "Acq CIB BID",
    "acq_cib_bid_name__": "Acq CIB BID Name",
    "tc05tcr1card_acceptor_id__": "TC05TCR1 Card Acceptor ID",
    "tc05tcr0central_processing_date_cpd__": "TC05TCR0 Central Processing Date (CPD)",
    "tc05tcr0purchase_date__": "TC05TCR0 Purchase Date",
    "tc05tcr5_transaction_identifier__": "TC05TCR5 Transaction Identifier",
    "tc05tcr0_authorization_code__": "TC05TCR0 Authorization Code",
    "tc05tcr0_acquirer_reference_number__": "TC05TCR0 Acquirer Reference Number",
    "gmr_business_name__": "GMR Business Name",
    "tc05tcr0merchant_name__": "TC05TCR0 Merchant Name",
    "merchant_street__": "Merchant Street",
    "tc05tcr0_merchant_city__": "TC05TCR0 Merchant City",
    "tc05tcr0_merchant_stateprovince_code__": "TC05TCR0 Merchant State/Province Code",
    "tc05tcr0_merchant_country_code__": "TC05TCR0 Merchant Country Code",
    "tc05tcr0_merchant_zip_code__": "TC05TCR0 Merchant ZIP Code",
    "tc05tcr0_merchant_category_code__": "TC05TCR0 Merchant Category Code",
    "tc05tcr0_source_amount__": "TC05TCR0 Source Amount",
    "source_amount_usd__": "Source Amount (USD)",
    "tc05tcr6local_tax_included__": "TC05TCR6 Local Tax Included",
    "tc05tcr6_local_tax__": "TC05TCR6 Local Tax",
    "tc05tcr6national_tax_included__": "TC05TCR6 National Tax Included",
    "tc05tcr6_national_tax__": "TC05TCR6 National Tax",
    "tc05tcr5_merchant_verification_value__": "TC05TCR5 Merchant Verification Value",
    "tc05tcr0_number_of_payment_forms__": "TC05TCR0 Number of Payment Forms",
    "tc05tcr1_purchase_identifier_format__": "TC05TCR1 Purchase Identifier Format",
    "tc05tcr6_time_of_purchase__": "TC05TCR6 Time of Purchase",
    "tc05tcr6message_identifier__": "TC05TCR6 Message Identifier",
    "item_sequence_number__": "Item Sequence Number",
    "authorization_code__": "Authorization Code",
    "discount_amount_signage__": "Discount Amount Signage",
    "discount_amount__": "Discount Amount",
    "freightshipping_amount_signage__": "Freight/Shipping Amount Signage",
    "freightshipping_amount__": "Freight/Shipping Amount",
    "duty_amount_signage__": "Duty Amount Signage",
    "duty_amount__": "Duty Amount",
    "destination_postalzip_code__": "Destination Postal/ZIP Code",
    "destination_country_code__": "Destination Country Code",
    "ship_from_postalzip_code__": "Ship From Postal/ZIP Code",
    "unique_vat_invoice_reference_number__": "Unique VAT Invoice Reference Number",
    "order_date__": "Order Date",
    "vattax_amount_signage__": "VAT/Tax Amount Signage",
    "vattax_amount_freightshipping__": "VAT/Tax Amount (Freight/Shipping)",
    "vattax_rate_freightshipping__": "VAT/Tax Rate (Freight/Shipping)",
    "invoice_level_discount_treatment_code__": "Invoice Level Discount Treatment Code",
    "tax_treatments__": "Tax Treatments",
    "item_sequence_number1__": "Item Sequence Number.1",
    "item_commodity_code__": "Item Commodity Code",
    "item_descriptor__": "Item Descriptor",
    "product_code__": "Product Code",
    "quantity__": "Quantity",
    "unit_of_measure__": "Unit of Measure",
    "unit_cost__": "Unit Cost",
    "vattax_amount__": "VAT/Tax Amount",
    "vattax_rate__": "VAT/Tax Rate",
    "discount_per_line_item__": "Discount per Line Item",
    "line_item_total__": "Line Item Total",
    "line_item_detail_indicator__": "Line Item Detail Indicator",
    "line_item_level_discount_treatment_code__": "Line Item Level Discount Treatment Code",
    "observations_for_observation_description_please_refer_to_error_code_description_tab__": "Observation(s) (For observation description please refer to 'Error Code Description Tab')",
    "overall_observations_for_observation_description_please_refer_to_error_code_description_tab": "Overall Observation(s) (For observation description please refer to 'Error Code Description Tab')",
}

# CSV column names (case-insensitive in file); we normalize to snake_case
CSV_COLUMN_MAP = {
    "error codes": "error_code",
    "description": "description",
    "field name": "field_name",
    "content column": "content_column",
    "type": "type",
    "size": "size",
    "m/c/o": "mco",
    "notes": "notes",
}


def load_error_key(csv_path: str | Path) -> pd.DataFrame:
    """Load ErrorKey.csv and normalize column names to snake_case."""
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"Error key file not found: {path}")
    df = pd.read_csv(path, encoding="utf-8", dtype=str, keep_default_na=False)
    # Normalize: strip whitespace from column names, then map to snake_case
    df.columns = [c.strip() for c in df.columns]
    rename = {}
    for col in df.columns:
        key = col.lower().strip()
        if key in CSV_COLUMN_MAP:
            rename[col] = CSV_COLUMN_MAP[key]
    df = df.rename(columns=rename)
    return df


def read_transactions(xlsx_bytes: bytes) -> pd.DataFrame:
    """Read the transaction sheet from uploaded XLSX into a DataFrame.
    Uses sheet named 'Content' if present (case-insensitive), otherwise the first sheet.
    Column names are normalized using NAME_KEY_MATRIX so files with alternative
    header names (e.g. trx_pk__, tc05tcr0merchant_name__) are mapped to canonical names.
    """
    buf = io.BytesIO(xlsx_bytes)
    xl = pd.ExcelFile(buf)
    sheet_names = xl.sheet_names
    if not sheet_names:
        raise ValueError("Workbook has no worksheets")
    # Prefer sheet named "Content" (exact or case-insensitive), else first sheet
    content_sheet = None
    for name in sheet_names:
        if name.strip() == "Content":
            content_sheet = name
            break
    if content_sheet is None:
        for name in sheet_names:
            if name.strip().lower() == "content":
                content_sheet = name
                break
    sheet_name = content_sheet if content_sheet is not None else sheet_names[0]
    df = xl.parse(sheet_name, dtype=str, keep_default_na=False)
    # Map alternative header names to canonical names (case-insensitive for alternative keys)
    alias_lower = { k.lower(): v for k, v in NAME_KEY_MATRIX.items() }
    rename = {}
    for col in df.columns:
        c = str(col).strip()
        if c in NAME_KEY_MATRIX:
            rename[col] = NAME_KEY_MATRIX[c]
        elif c.lower() in alias_lower:
            rename[col] = alias_lower[c.lower()]
    if rename:
        df = df.rename(columns=rename)
    # If error codes column still missing, try aliases (case-insensitive, strip)
    if ERROR_CODES_COLUMN not in df.columns:
        alias_lower_set = { a.strip().lower() for a in ERROR_CODES_COLUMN_ALIASES }
        for col in df.columns:
            c = str(col).strip()
            if c.lower() in alias_lower_set:
                df = df.rename(columns={col: ERROR_CODES_COLUMN})
                break
        else:
            # Try normalized match: collapse spaces/punct to single underscore, lower
            def _norm(s: str) -> str:
                s = str(s).lower().strip()
                s = re.sub(r"[\s'\"\-()]+", "_", s)
                s = re.sub(r"_+", "_", s).strip("_")
                return s
            target_norm = _norm("overall_observations_for_observation_description_please_refer_to_error_code_description_tab")
            for col in df.columns:
                if _norm(col) == target_norm or _norm(col) == "overall_observations_for_observation_description_please_refer_to_error_code_description_tab":
                    df = df.rename(columns={col: ERROR_CODES_COLUMN})
                    break
    return df


def _ordered_data_columns(
    columns: list[Any],
    merchant_name_col: Any,
) -> list[Any]:
    """Build data column list in PREFERRED_COLUMN_ORDER; exclude merchant name and EXCLUDED_COLUMNS. Append any remaining columns at end."""
    allowed = {
        c for c in columns
        if c and str(c).strip() and c not in EXCLUDED_COLUMNS and c != merchant_name_col
    }
    ordered: list[Any] = []
    seen: set[Any] = set()
    for preferred in PREFERRED_COLUMN_ORDER:
        col = _find_column(list(columns), preferred)
        if col and col in allowed and col not in seen:
            ordered.append(col)
            seen.add(col)
    for c in columns:
        if c in allowed and c not in seen:
            ordered.append(c)
            seen.add(c)
    return ordered


def parse_codes(raw: Any) -> list[str]:
    """Parse comma-separated error codes from cell value; trim and drop empties."""
    if raw is None or (isinstance(raw, float) and pd.isna(raw)):
        return []
    s = str(raw).strip()
    if not s:
        return []
    return [c.strip() for c in s.split(",") if c.strip()]


def analyze(transactions_df: pd.DataFrame, error_key_df: pd.DataFrame) -> list[TransactionResult]:
    """
    For each transaction row, extract error codes, join to error key,
    build failures list and highlight_columns. Unknown codes and blank content_column
    are handled as per spec.
    """
    # Ensure we have required columns
    if ERROR_CODES_COLUMN not in transactions_df.columns:
        raise ValueError(f"Missing error codes column: {ERROR_CODES_COLUMN!r}")
    if TRX_PK_COLUMN not in transactions_df.columns:
        raise ValueError(f"Missing transaction ID column: {TRX_PK_COLUMN!r}")

    # Index error key by error_code for lookup
    key_by_code = {}
    for _, row in error_key_df.iterrows():
        code = str(row.get("error_code", "")).strip()
        if code:
            key_by_code[code] = row

    # Resolve merchant name column (Excel may use newline in header)
    merchant_name_col = None
    for c in transactions_df.columns:
        if c is None:
            continue
        s = str(c).replace("\n", " ").strip()
        if c in MERCHANT_NAME_CANDIDATES or s == "TC05TCR0 Merchant Name":
            merchant_name_col = c
            break
    if merchant_name_col is None:
        merchant_name_col = "TC05TCR0 Merchant Name"

    # Column order for row_data: preferred order, then any remaining columns
    data_columns = _ordered_data_columns(
        list(transactions_df.columns),
        merchant_name_col,
    )

    results: list[TransactionResult] = []
    for _, row in transactions_df.iterrows():
        trx_pk = str(row.get(TRX_PK_COLUMN, "")).strip()
        merchant_name = str(row.get(merchant_name_col, "")).strip() if merchant_name_col else ""
        row_data = {c: str(row.get(c, "")).strip() for c in data_columns}
        raw_codes = row.get(ERROR_CODES_COLUMN, "")
        codes = parse_codes(raw_codes)

        failures: list[Failure] = []
        highlight_columns: list[str] = []

        for code in codes:
            key_row = key_by_code.get(code)
            if key_row is None:
                failures.append(
                    Failure(
                        error_code=code,
                        field_name="",
                        content_column="",
                        description="Unknown code",
                        notes="",
                        type="",
                        size="",
                        mco="",
                        transaction_value=None,
                    )
                )
                continue

            content_col = str(key_row.get("content_column", "")).strip()
            # Get transaction value for the mapped column if present
            transaction_value = None
            if content_col and content_col in transactions_df.columns:
                val = row.get(content_col)
                if val is not None and str(val).strip() != "":
                    transaction_value = str(val).strip()

            notes = str(key_row.get("notes", "")).strip()
            if _normalize_col(content_col) == "TC05TCR6 Local Tax":
                notes = notes + "\n\nThis field can only be 0 when TC05TCR6 Local Tax Included is 2." if notes else "This field can only be 0 when TC05TCR6 Local Tax Included is 2."

            failure = Failure(
                error_code=code,
                field_name=str(key_row.get("field_name", "")).strip(),
                content_column=content_col,
                description=str(key_row.get("description", "")).strip(),
                notes=notes,
                type=str(key_row.get("type", "")).strip(),
                size=str(key_row.get("size", "")).strip(),
                mco=str(key_row.get("mco", "")).strip(),
                transaction_value=transaction_value,
            )
            failures.append(failure)
            if content_col and content_col not in highlight_columns:
                highlight_columns.append(content_col)

        yellow_columns: list[str] = []
        source_amount_message: str | None = None

        # TC50-1004: Line Item Total = (Quantity * Unit Cost) - Discount per Line Item
        if "TC50-1004" in codes:
            col_quantity = _find_column(list(transactions_df.columns), "Quantity")
            col_unit_cost = _find_column(list(transactions_df.columns), "Unit Cost")
            col_discount_li = _find_column(list(transactions_df.columns), "Discount per Line Item")
            col_line_item_total = _find_column(list(transactions_df.columns), "Line Item Total")
            if col_quantity is not None and col_unit_cost is not None and col_discount_li is not None and col_line_item_total is not None:
                q = _parse_amount(row.get(col_quantity))
                uc = _parse_amount(row.get(col_unit_cost))
                d = _parse_amount(row.get(col_discount_li))
                lit = _parse_amount(row.get(col_line_item_total))
                if q is not None and uc is not None and d is not None and lit is not None:
                    expected = (q * uc) - d
                    if abs(expected - lit) > 0.005:
                        if col_line_item_total not in highlight_columns:
                            yellow_columns.append(col_line_item_total)
                        if q == 0 and col_quantity not in highlight_columns:
                            yellow_columns.append(col_quantity)
                        if col_unit_cost not in highlight_columns:
                            yellow_columns.append(col_unit_cost)
                        if d != 0 and col_discount_li not in highlight_columns:
                            yellow_columns.append(col_discount_li)

        results.append(
            TransactionResult(
                trx_pk=trx_pk,
                merchant_name=merchant_name,
                merchant_name_column=merchant_name_col if isinstance(merchant_name_col, str) else "",
                row_data=row_data,
                column_order=[str(c) for c in data_columns],
                error_codes=codes,
                failures=failures,
                highlight_columns=highlight_columns,
                yellow_columns=yellow_columns,
                source_amount_message=source_amount_message,
            )
        )

    # CS-0011: Source Amount = sum(Line Item Totals) - Discount Amount + Freight/Shipping + TC05TCR6 Local Tax (once per transaction)
    col_txn_id = _find_column(list(transactions_df.columns), "TC05TCR5 Transaction Identifier")
    col_source = _find_column(list(transactions_df.columns), "TC05TCR0 Source Amount")
    col_line_item_total = _find_column(list(transactions_df.columns), "Line Item Total")
    col_discount = _find_column(list(transactions_df.columns), "Discount Amount")
    col_freight = _find_column(list(transactions_df.columns), "Freight/Shipping Amount")
    col_local_tax = _find_column(list(transactions_df.columns), "TC05TCR6 Local Tax")

    if col_txn_id and col_source and col_line_item_total:
        groups: dict[str, list[int]] = {}
        for idx, r in transactions_df.iterrows():
            tid = str(r.get(col_txn_id, "")).strip()
            if tid:
                groups.setdefault(tid, []).append(int(idx))

        for tid, indices in groups.items():
            rows_in_group = [transactions_df.iloc[i] for i in indices]
            has_cs0011 = any("CS-0011" in parse_codes(r.get(ERROR_CODES_COLUMN, "")) for r in rows_in_group)
            if not has_cs0011:
                continue
            source_val = _parse_amount(rows_in_group[0].get(col_source))
            if source_val is None:
                continue
            line_totals = [_parse_amount(r.get(col_line_item_total)) for r in rows_in_group]
            line_totals_sum = sum((x or 0) for x in line_totals)
            discount = _parse_amount(rows_in_group[0].get(col_discount)) if col_discount else 0
            discount = discount or 0
            freight = _parse_amount(rows_in_group[0].get(col_freight)) if col_freight else 0
            freight = freight or 0
            # Local Tax is same on every line for this transaction; add once
            local_tax = _parse_amount(rows_in_group[0].get(col_local_tax)) if col_local_tax else 0
            local_tax = local_tax or 0
            computed = line_totals_sum - discount + freight + local_tax
            if abs(computed - source_val) > 0.005:
                msg = "Source Amount is not equal to totals: Line Item Totals - Discount Amount + Freight/Shipping Amount + TC05TCR6 Local Tax"
                for i, row_idx in enumerate(indices):
                    if row_idx >= len(results):
                        continue
                    res = results[row_idx]
                    res_yellow = list(res.yellow_columns)
                    lit_val = _parse_amount(rows_in_group[i].get(col_line_item_total)) if col_line_item_total else None
                    def _add_yellow(c: str | None) -> None:
                        if c and c not in res.highlight_columns and c not in res_yellow:
                            res_yellow.append(c)
                    if col_line_item_total and (lit_val is None or lit_val == 0):
                        _add_yellow(col_line_item_total)
                    _add_yellow(col_discount)
                    _add_yellow(col_freight)
                    if local_tax <= 0:
                        _add_yellow(col_local_tax)
                    results[row_idx] = res.model_copy(
                        update=dict(yellow_columns=res_yellow, source_amount_message=msg)
                    )

    return results
