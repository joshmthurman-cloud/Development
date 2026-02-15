# TXNDTA – IWS integration and testing

## Procedure interface (what IWS calls)

- **Program:** `JOSH/TXNDTA`
- **Parameters (in order):**
  1. **Request** – `CHAR(1000)` or `VARCHAR(1000)` input. Optional filters as key=value pairs separated by `&`.
  2. **Response** – `CHAR(32700)` or `VARCHAR(32700)` with `OPTIONS(*VARSIZE)`. Output JSON is returned here.

## Request format (key=value in one string)

- `MFUKEY=value` – Return a single row by key. If present and non-blank, only this row is returned; other options are ignored.
- `MAXROWS=n` – For list mode, return at most `n` rows (default 50, max 500).
- `DATEFROM=yyyy-mm-dd` – Only rows with `MFDATE` >= this (character comparison).
- `DATETO=yyyy-mm-dd` – Only rows with `MFDATE` <= this.

Examples:

- Blank or empty → first 50 rows.
- `MAXROWS=10` → first 10 rows.
- `MFUKEY=ABC123` → single row with that key (if found).
- `MAXROWS=20&DATEFROM=2025-01-01&DATETO=2025-01-31` → up to 20 rows in that date range.

## IWS mapping (typical)

- **Input:** Map the **HTTP request body** (or query string concatenated) to the **first parameter** (request). If you use JSON from the client, the IWS handler can pass it as-is or convert to `key=value&...` before calling TXNDTA.
- **Output:** Map the **second parameter** (response) to the **HTTP response body**. IWS should set `Content-Type: application/json; charset=UTF-8` and return this string as the body.

No CGI, no `QtmhWrStout` – the program only receives one input string and returns one output string; IWS handles HTTP.

## 5250 test (blank filter, get first 50 as JSON)

From command line or a test CL:

```cl
CALL JOSH/TXNDTA (' '  PARM2)
```

Or with a 1000-byte request and 32700-byte response:

```cl
DCL VAR(&REQ) TYPE(*CHAR) LEN(1000)
DCL VAR(&RSP) TYPE(*CHAR) LEN(32700)
CHGVAR VAR(&REQ) VALUE(' ')
CALL JOSH/TXNDTA (&REQ &RSP)
```

Then display or dump `&RSP` to see the JSON. To test with a key:

```cl
CHGVAR VAR(&REQ) VALUE('MFUKEY=YOURKEY')
CALL JOSH/TXNDTA (&REQ &RSP)
```

To test list with limit and date range:

```cl
CHGVAR VAR(&REQ) VALUE('MAXROWS=5&DATEFROM=2025-01-01&DATETO=2025-12-31')
CALL JOSH/TXNDTA (&REQ &RSP)
```

## Registering in IWS

1. In IWS (Integrated Web Services), create or edit the **handler** for your REST operation (e.g. GET or POST for transaction data).
2. Set the **program** to `JOSH/TXNDTA`.
3. Map **parameter 1** to the request (body or query string, as one string).
4. Map **parameter 2** to the response body (the JSON output).
5. Ensure the service returns HTTP 200 with `Content-Type: application/json; charset=UTF-8` and the response parameter as the body.

If your IWS version uses a “program call” or “RPG program” template, use two parameters: input string, output string, as above.

## Source / compile / deploy (reminder)

1. Create long source PF:  
   `CRTSRCPF FILE(JOSH/QRPGLESRC) RCDLEN(240)`
2. Put source in `JOSH/QRPGLESRC(TXNDTA)` (e.g. copy from `TXNDTA.rpgle`; keep lines ≤ 80).
3. Compile:  
   `CRTRPGMOD MODULE(JOSH/TXNDTA) SRCFILE(JOSH/QRPGLESRC) SRCMBR(TXNDTA)`
4. Create program:  
   `CRTPGM PGM(JOSH/TXNDTA) MODULE(JOSH/TXNDTA) ACTGRP(*CALLER)`

Avoid copying into a short-RCDLEN source file so CPYFRMSTMF does not truncate lines and break the compile. The program uses `extfile('JOSH/C3FP3020')` so the file is resolved at compile time from library JOSH and avoids RNF2120.
