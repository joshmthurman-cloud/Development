export interface Failure {
  error_code: string;
  field_name: string;
  content_column: string;
  description: string;
  notes: string;
  type: string;
  size: string;
  mco: string;
  transaction_value: string | null;
}

export interface TransactionResult {
  trx_pk: string;
  merchant_name: string;
  merchant_name_column: string;
  row_data: Record<string, string>;
  column_order: string[];
  error_codes: string[];
  failures: Failure[];
  highlight_columns: string[];
  yellow_columns?: string[];
  source_amount_message?: string | null;
}
