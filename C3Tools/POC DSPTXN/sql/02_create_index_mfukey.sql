-- C3 IWS POC: Index on MFUKEY for fast lookup
-- Run on client IBM i (library C3).
-- If an equivalent index already exists on C3.C3FP9020(MFUKEY), skip this script.

CREATE INDEX C3.C3X9020_MFUKEY
ON C3.C3FP9020 (MFUKEY);
