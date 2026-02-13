# C3 IWS POC — cURL examples for Transaction Lookup

Replace placeholders:

- `<client-ibmi-host>` — hostname or IP of the client IBM i (IWS)
- `<mfukey>` — valid 15-character transaction key for success case
- `<gateway-client.crt>` / `<gateway-client.key>` — client cert and key when mTLS is used

---

## Successful lookup (200)

```bash
curl -k --cert <gateway-client.crt> --key <gateway-client.key> \
  "https://<client-ibmi-host>/api/txns/<mfukey>"
```

With Basic Auth (POC):

```bash
curl -k -u C3IWSAPI:<password> \
  "https://<client-ibmi-host>/api/txns/<mfukey>"
```

---

## Not found (404)

```bash
curl -k --cert <gateway-client.crt> --key <gateway-client.key> \
  "https://<client-ibmi-host>/api/txns/00000BADKEY0000"
```

---

## Bad request — missing or invalid MFUKEY (400)

Missing path (trailing slash; server may return 400 or 404):

```bash
curl -k --cert <gateway-client.crt> --key <gateway-client.key> \
  "https://<client-ibmi-host>/api/txns/"
```

Wrong length (e.g. 10 characters):

```bash
curl -k --cert <gateway-client.crt> --key <gateway-client.key> \
  "https://<client-ibmi-host>/api/txns/1234567890"
```

---

## Inspect response status and body

```bash
curl -k -u C3IWSAPI:<password> -w "\nHTTP %{http_code}\n" \
  "https://<client-ibmi-host>/api/txns/<mfukey>"
```
