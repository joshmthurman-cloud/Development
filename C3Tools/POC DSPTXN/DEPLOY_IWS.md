# C3 IWS POC — Deploy Transaction Lookup REST API

This document describes how to publish the TXNLOOKUP RPG program as a REST endpoint on IBM i Integrated Web Services (IWS).

---

## 1. Create or verify the IWS server instance

- Create an HTTP/HTTPS server instance for the API (e.g. **C3API_IWS**).
- Prefer **HTTPS**; configure port (e.g. 5040 or 8443) and TLS (certificate, cipher list).
- Ensure the instance is started and listening.

---

## 2. Publish TXNLOOKUP as REST

- **HTTP method:** `GET`
- **Path:** `/api/txns/{mfukey}`
- **Program:** `TXNLOOKUP` (in library `C3API` or your API library).

### Parameter mapping

| IWS / HTTP        | RPG parameter   | Type / length   | Notes                          |
|-------------------|-----------------|-----------------|--------------------------------|
| Path: `mfukey`    | `p_mfukey`      | char(15)        | Required; 15 characters        |
| (response body)   | `p_json`        | varchar(32000)  | JSON string                    |
| (response status) | `p_httpStatus`  | int(10)         | 200 / 400 / 404 / 500          |
| (optional)        | `p_errmsg`      | varchar(256)    | For logs / debugging           |
| (optional)        | `p_requestId`  | varchar(64)     | Request correlation            |

- Map the path parameter **mfukey** to **p_mfukey**.
- Set the HTTP response **status code** from **p_httpStatus** when IWS supports it.
- Set the response **body** from **p_json**.

If your IWS version cannot map the program’s status code to the HTTP status, document that the API always returns HTTP 200 and the real status is in the JSON (`status`, `error`, etc.) and have the gateway or client interpret it.

---

## 3. Authentication (POC)

- Use **Basic Authentication** with a dedicated service profile (e.g. **C3IWSAPI**).
- Document the profile and password storage (e.g. system or secure store).
- Grant the profile only what it needs:
  - **Execute** the TXNLOOKUP program (and any service program it uses).
  - **Read** access to `C3.C3V9020_API` (or the underlying table if the view is inlined).
  - No other objects or authorities than required for this endpoint.

---

## 4. Restrict access to the gateway

- Use a **firewall or ACL** so that only the gateway (and optional management hosts) can reach the IWS port.
- If the partition has multiple interfaces, bind the IWS instance to an internal interface.
- Plan for **mTLS** later: gateway presents a client certificate; IWS is configured to require and validate it.

---

## 5. Compile and deploy checklist

1. Create library **C3API** (e.g. `CRTLIB C3API`).
2. Run **sql/01_create_view_api.sql** and **sql/02_create_index_mfukey.sql** in library **C3** (creates view and index).
3. Compile **TXNLOOKUP** from **rpg/TXNLOOKUP.rpgle** (and **rpg/JSON_ESCAPE.rpgleinc** in the same source or as included copy). Use **SQLRPGLE** as the source type if your system uses it for embedded SQL.
4. Place the compiled **TXNLOOKUP** program in **C3API** (or your chosen API library).
5. In IWS, define the REST operation **GET /api/txns/{mfukey}** and map it to **TXNLOOKUP** with the parameter mapping above.
6. Restrict network access and document the service profile and optional mTLS for production.

---

## 6. Optional: CLOB for response body

If the JSON response may exceed 32 KB, change **p_json** to a CLOB (e.g. 1M) in the RPG program and in the IWS mapping, and ensure IWS is configured to stream or return the CLOB as the response body.
