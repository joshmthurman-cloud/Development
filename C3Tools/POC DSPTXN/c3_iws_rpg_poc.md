# C3 IWS + RPG POC — Transaction Lookup (Port of dsptxn.php)

**Owner:** Joshua Thurman  
**Date:** February 12, 2026  
**Target environment:** **Test client IBM i** (schema/library = `C3`)  
**Primary DB2 object:** `C3.C3FP9020`  
**Primary key input:** `MFUKEY` (15 chars; first 5 = `MFCUST`; if PLP then 6th char = `Y`)

---

## 0) What you have today (PHP baseline)
You have a working web tool implemented as PHP scripts. From the uploaded scripts:

- PHP loads DB credentials from an IFS `.ini` file and connects to DB2 for i using `db2_connect()`.
- The script `dsptxn.php` performs a **parameterized** lookup:
  - `WHERE MFUKEY = ?`
- The web server + PHP code lives in the **IFS** (not in DB2 libraries/files), and it reads DB2 data via a DB connection.

### What authentication the PHP tool is doing
There are two “auth layers” in the PHP setup:

1. **Web/app authentication (browser → PHP)**  
   This is whatever login/session mechanism the PHP app implements (or whatever Apache config enforces).  
   *(This is separate from DB2.)*

2. **DB authentication (PHP → DB2 for i)**  
   `dsptxn.php` uses `db2_connect(database, user, password)`.  
   The DB user/password are stored in an IFS config file (e.g., `/www/.../cs_menu.ini` in your environment).  
   This DB profile’s authorities determine what files/fields the PHP can read.

---

## 1) What we are building (IWS + RPG replacement)
We will replace the PHP lookup with:

**Gateway → IBM i IWS REST endpoint → RPG program (embedded SQL) → DB2**

### POC endpoint
- **HTTP method:** `GET`
- **Path:** `/api/txns/{mfukey}`
- **Behavior:** Look up **one** transaction record by `MFUKEY` and return **all fields** currently selected by `dsptxn.php`.

### Response behavior
- Use **proper HTTP status codes** (you chose this):
  - `200` OK (found)
  - `404` Not Found (no record)
  - `400` Bad Request (missing/invalid MFUKEY)
  - `500` Internal Server Error (unexpected SQL/system failure)

---

## 2) What are “API objects” on IBM i?
In this design, “API objects” are the IBM i artifacts that implement and expose the API:

1. **RPG program object** (compiled `*PGM`)  
   - Implements the endpoint behavior: validate → query DB2 → format JSON.

2. **(Optional) RPG service program** (`*SRVPGM`) and modules  
   - Not required for POC, but useful later to share code (JSON helpers, auth helpers, etc.).

3. **DB2 objects supporting the API**  
   - **View** (recommended): locks the API’s column set and simplifies SQL.
   - **Index** (recommended): ensures fast lookup on `MFUKEY`.

4. **IWS service definition**  
   - The mapping that tells IWS how to call the RPG program and how to build the HTTP response.

5. **HTTP/IWS server instance config**  
   - The web server instance and TLS configuration that serves the REST endpoint.

---

## 3) Do you need a library for API objects?
**Recommendation: Yes.** Create a dedicated library for API programs so your service objects are easy to manage, secure, and deploy.

### Create the library now
Create `C3API` on the **client** partition and set it as the target library for API program objects.

- Library: `C3API`
- Contents (POC):
  - `TXNLOOKUP` `*PGM`
  - (Optional later) JSON helper `*SRVPGM` / modules
- DB2 objects:
  - Keep data in `C3` (`C3FP9020`)
  - Create the API view in `C3` (`C3V9020_API`) for clarity and ownership

**Command (example):**
```cl
CRTLIB LIB(C3API) TEXT('C3 IWS API programs and service objects')
```

**Authority guidance (high level):**
- Grant only what is needed for compile/deploy/admin.
- Runtime access should be constrained by:
  - Network allow-list to IWS port
  - mTLS
  - Least-privileged job user (optional but recommended)


### Suggested library
- `C3API` (or another name you choose)

Store:
- `TXNLOOKUP` program (and future API programs)
- any helper service programs/modules

Keep data objects in `C3`:
- `C3FP9020` stays in `C3`
- views can be in `C3` (recommended for clarity), or in `C3API` if you prefer isolating objects

---

## 4) Authentication for IWS (what to use for the POC)
Your decision: **merchant authorization is enforced at the gateway** (users are assigned merchants; gateway only requests allowed `MFCUST`/`MFUKEY`).

Now we still need *service-to-service* authentication for **Gateway → IWS**.

### Authentication choice: Mutual TLS (mTLS)
- IBM i requires a valid **client certificate** for the IWS endpoint.
- The **gateway** holds the client certificate/private key and presents it on every request.
- IBM i trusts your internal CA (or the specific client cert) and **rejects** requests without a valid client cert.

**Why mTLS here:** it provides cryptographic proof the caller is your gateway, even if network rules are misconfigured.

### Network restriction (still required)
Even with mTLS, also enforce:
- **Firewall / ACL allow-list**: only the gateway IP(s) can reach the IWS port.
- Bind IWS to an internal interface if multiple IPs exist.

---

## 5) Step-by-step build plan (Cursor instructions)

### Step 5.1 — Extract the FULL SELECT list from `dsptxn.php`
Cursor must treat `dsptxn.php` as the source of truth and extract the full field list exactly.

**Field list (from dsptxn.php):**
```text
MFCUST,
  MFTYPE,
  MFTYP2,
  MFRTRN,
  MFDATE,
  MFTIME,
  MFUSER,
  MFCARD,
  MFEDAT,
  MFMRCH,
  MFADD1,
  MFZIPC,
  MFORDR,
  MFREFR,
  MFAMT1,
  MFSETR,
  MFMETH,
  MFAMT2,
  MFLTXF,
  MFDSTZ,
  MFAPPR,
  MFKEYP,
  MFRTXT,
  MFRAVS,
  MFRCVV,
  "MF$RAQ",
  "MF$FTS",
  MFREQN,
  MFNUMB,
  MFSETD,
  MFSETT,
  MFPRCD,
  MFPRCT,
  MFCHKT,
  "MF\$SLD",
  "MF\$SLG",
  "MF$LVD",
  "MF\$RVG",
  MFTRK1,
  MFXTRA,
  MFRVNA,
  MFACNL,
  MFDATA,
  MFUSDA,
  MFUSDB,
  MFUSDC,
  MFUSD1,
  MFUSD2,
  MFUSD3,
  MFUSD4,
  MFUSD5,
  MFUSD6,
  MFUSD7,
  MFUSD8,
  MFUSD9,
  MFVALU,
  MFADD2,
  MFSTID
```

> Notes:
> - This list is required to be complete (no trimming).
> - `MFCARD` is masked in 9020; return it as stored.

---

### Step 5.2 — Create DB2 support objects (view + index)
Create these SQL scripts under `/sql/`.

#### 01_create_view_api.sql
Create an API view that matches the PHP SELECT list exactly.

```sql
CREATE OR REPLACE VIEW C3.C3V9020_API AS
SELECT
  MFCUST,
  MFTYPE,
  MFTYP2,
  MFRTRN,
  MFDATE,
  MFTIME,
  MFUSER,
  MFCARD,
  MFEDAT,
  MFMRCH,
  MFADD1,
  MFZIPC,
  MFORDR,
  MFREFR,
  MFAMT1,
  MFSETR,
  MFMETH,
  MFAMT2,
  MFLTXF,
  MFDSTZ,
  MFAPPR,
  MFKEYP,
  MFRTXT,
  MFRAVS,
  MFRCVV,
  "MF$RAQ",
  "MF$FTS",
  MFREQN,
  MFNUMB,
  MFSETD,
  MFSETT,
  MFPRCD,
  MFPRCT,
  MFCHKT,
  "MF\$SLD",
  "MF\$SLG",
  "MF$LVD",
  "MF\$RVG",
  MFTRK1,
  MFXTRA,
  MFRVNA,
  MFACNL,
  MFDATA,
  MFUSDA,
  MFUSDB,
  MFUSDC,
  MFUSD1,
  MFUSD2,
  MFUSD3,
  MFUSD4,
  MFUSD5,
  MFUSD6,
  MFUSD7,
  MFUSD8,
  MFUSD9,
  MFVALU,
  MFADD2,
  MFSTID
FROM C3.C3FP9020;
```

#### 02_create_index_mfukey.sql
Create an index to guarantee fast lookup by `MFUKEY`.

```sql
CREATE INDEX C3.C3X9020_MFUKEY
ON C3.C3FP9020 (MFUKEY);
```

> If an equivalent index already exists, document it and do not duplicate.

---

### Step 5.3 — Implement RPG program: `TXNLOOKUP` (Embedded SQL + manual JSON)
Create `/rpg/TXNLOOKUP.rpgle` and `/rpg/JSON_ESCAPE.rpgleinc`.

#### Program purpose
- Input: `p_mfukey` (15-char MFUKEY string)
- Query: `SELECT <all fields> FROM C3.C3V9020_API WHERE MFUKEY = :p_mfukey`
- Output: JSON string containing all fields under `record`

#### Parameter interface (IWS-friendly)
Use a simple signature (avoid complex DS for the first POC):

**Inputs**
- `p_mfukey` : `char(15)` (trim and validate)

**Outputs**
- `p_httpStatus` : `int(10)` (200/400/404/500)
- `p_json` : `varchar(32000)` or `clob(1M)` depending on your IWS configuration
- `p_errmsg` : `varchar(256)` optional (for logs / debugging)
- `p_requestId` : `varchar(64)` optional

> If you choose `varchar(32000)` for POC, ensure the JSON won’t exceed it.  
> If there’s risk (58 fields including long text), prefer `CLOB`.

#### Validation rules
- If `p_mfukey` is blank → `400`
- If length != 15 → `400` (unless you want to accept shorter and pad; default is strict)

#### SQL rules
- Use **embedded SQL** with host variables (no string concatenation).
- Handle:
  - SQLCODE `100` → `404`
  - any other SQL error → `500`

#### JSON rules (Option A: manual build) ✅
- Implement JSON escaping for string fields in `JSON_ESCAPE.rpgleinc`:
  - backslash, quotes, newline, carriage return, tab
- For POC: it is acceptable to return **all values as JSON strings** (safe and simple).
  - Later iteration can emit numeric JSON for numeric fields if desired.

##### Success response (200)
```json
{
  "status": "ok",
  "mfukey": "<value>",
  "record": {
    "MFCUST": "...",
    "MFTYPE": "...",
    ...
  }
}
```

##### Not found (404)
```json
{
  "status": "not_found",
  "mfukey": "<value>"
}
```

##### Bad request (400)
```json
{
  "status": "error",
  "error": "invalid_request",
  "message": "<reason>"
}
```

##### System error (500)
```json
{
  "status": "error",
  "error": "system_error",
  "requestId": "<requestId>"
}
```

---

### Step 5.4 — IWS REST publishing instructions
Create `/DEPLOY_IWS.md` with:

1. **Create/verify IWS server instance**
   - Use HTTPS where possible
   - Name suggestion: `C3API_IWS`

2. **Publish `TXNLOOKUP` as REST**
   - `GET /api/txns/{mfukey}`
   - Map path parameter `mfukey` → `p_mfukey`
   - Response body: `p_json`
   - Response status: use `p_httpStatus` (or if IWS cannot map it cleanly, include status in JSON as a fallback and always return 200)

3. **Authentication**
   - POC: Basic Auth using service profile (example `C3IWSAPI`)
   - Document how to set up the profile and required object authority:
     - Execute the program
     - Read the view/table
     - Nothing else

4. **Only accept calls from the gateway**
   - Firewall/ACL allow-list gateway IP(s) to the IWS port
   - Bind instance to internal interface if available
   - (Later) configure mTLS

---

### Step 5.5 — Tests
Create `/tests/curl_examples.md` with:

#### Successful lookup
```bash
curl -k --cert <gateway-client.crt> --key <gateway-client.key> \
  "https://<client-ibmi-host>/api/txns/<mfukey>"
```

#### Not found
```bash
curl -k --cert <gateway-client.crt> --key <gateway-client.key> \
  "https://<client-ibmi-host>/api/txns/00000BADKEY0000"
```

#### Bad request (missing mfukey)
```bash
curl -k --cert <gateway-client.crt> --key <gateway-client.key> \
  "https://<client-ibmi-host>/api/txns/"
```

Also create `/tests/sample_responses.json` with one example of each response type.

---

## 6) POC acceptance criteria
POC is complete when:
1. Endpoint returns a record for a known `MFUKEY`
2. Response includes **all 58 fields** from `dsptxn.php`
3. 400/404/500 behavior is deterministic and documented
4. SQL is parameterized with host variables
5. JSON strings are escaped correctly (no broken JSON from text fields)

---

## 7) Next step after this POC
After point-lookup works, build a second endpoint for gateway “search/list” by:
- `MFCUST` and date range (`MFDATE >= fromDate`)
- with strict caps + keyset pagination

That will be the main gateway lookup workhorse.


---

## Field Names Containing `$` (Important Clarification)

In the PHP source, fields like:

- `MF$RAQ`
- `MF$FTS`
- `MF$LVD`

appeared as:

- `MF\$RAQ`
- `MF\$FTS`

The backslash (`\`) was only required because of **PHP string escaping**.

### On IBM i (RPG + Embedded SQL)

You do **NOT** use a backslash.

You reference the column exactly as it exists:

```sql
SELECT MF$RAQ, MF$FTS, MF$LVD
FROM C3.C3V9020_API
WHERE MFUKEY = :p_mfukey
```

If you ever encounter parser issues (rare), you may use **delimited identifiers**:

```sql
SELECT "MF$RAQ", "MF$FTS", "MF$LVD"
FROM C3.C3V9020_API
WHERE MFUKEY = :p_mfukey
```

But in standard embedded SQL on IBM i, `$` is valid in column names and does not require escaping.

### Important
- Do **not** include backslashes in RPG SQL.
- Use the field names exactly as defined in the physical file.
- The escaping was PHP-specific and does not apply to RPG.

---
