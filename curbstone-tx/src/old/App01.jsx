import React, { useEffect, useMemo, useRef, useState } from "react";

const LS_KEYS = {
  user: "ctb_user",
  counter: "ctb_refid_counter",
  logs: "ctb_logs",
  settings: "ctb_settings",
};

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function loadJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

const TRANS_TYPES = ["Auth", "Capture", "Sale", "Reversal", "Return", "Settle"];
const PAYMENT_TYPES = ["Credit", "Debit"];
const YES_NO = ["No", "Yes"];

export default function App() {
  const [user, setUser] = useState(() => loadJSON(LS_KEYS.user, null));
  const [firstName, setFirstName] = useState("");
  const [settings, setSettings] = useState(() =>
    loadJSON(LS_KEYS.settings, {
      baseUrl: "https://spinpos.net:443/spin/cgi.html?TerminalTransaction=",
      useRegisterIdSpelling: "RegisterId",
      defaultPrintReceipt: "No",
      defaultSigCapture: "No",
      defaultAuthKey: "",
      defaultRegisterId: "",
      taxMode: "rate", // 'rate' | 'amount'
      taxRatePct: 10,
      taxAmountOverride: "", // when taxMode === 'amount'
      localTaxFlag: "TaxProvided",
      executeBehavior: "iframe" // 'iframe' | 'newtab' | 'both'
    })
  );
  const [counter, setCounter] = useState(() => {
    const v = Number(localStorage.getItem(LS_KEYS.counter));
    return Number.isFinite(v) && v >= 0 ? v : 1;
  });
  const [logs, setLogs] = useState(() => loadJSON(LS_KEYS.logs, []));

  const [transType, setTransType] = useState("Auth");
  const [paymentType, setPaymentType] = useState("Credit");
  const [authKey, setAuthKey] = useState("");
  const [registerId, setRegisterId] = useState("");
  const [amount, setAmount] = useState("");
  const [invNum, setInvNum] = useState("");
  const [custRef, setCustRef] = useState("");
  const [destZipCode, setDestZipCode] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [address, setAddress] = useState("");
  const [zip, setZip] = useState("");
  const [printReceipt, setPrintReceipt] = useState("");
  const [sigCapture, setSigCapture] = useState("");
  const [reversalType, setReversalType] = useState("Full");
  const [token, setToken] = useState("");
  const [expiry, setExpiry] = useState("");
  const [refIdInput, setRefIdInput] = useState(""); // manual MFUKEY for Capture/Reversal/Return

  // initialize form defaults from settings on first render
  useEffect(() => {
    setPrintReceipt(settings.defaultPrintReceipt || "No");
    setSigCapture(settings.defaultSigCapture || "No");
    if (settings.defaultAuthKey) setAuthKey(settings.defaultAuthKey);
    if (settings.defaultRegisterId) setRegisterId(settings.defaultRegisterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [iframeUrl, setIframeUrl] = useState("");
  const iframeRef = useRef(null);
  const clerkId = user?.firstName || "";
  const refIdAuto = counter; // auto-incrementing fallback
  const refIdEffective = (["Capture", "Reversal", "Return"].includes(transType) && refIdInput.trim() !== "") ? refIdInput : refIdAuto;

  // --- Formatting helpers ---
  const formatAmount = (val) => {
    if (val === null || val === undefined || String(val).trim() === "") return "0.00";
    const s = String(val).trim();
    if (!s.includes('.')) return s + '.00';
    const [w, f = ""] = s.split('.');
    if (f.length === 0) return `${w}.00`;
    if (f.length === 1) return `${w}.${f}0`;
    // If more than 2 decimals, do NOT round—send as-is; gateway may reject/round.
    return s;
  };

  const taxAmount = useMemo(() => {
    if (settings.taxMode === "amount" && String(settings.taxAmountOverride || "").trim() !== "") {
      const fixed = Number(settings.taxAmountOverride);
      return Number.isFinite(fixed) ? fixed.toFixed(2) : "0.00";
    }
    const amt = Number(amount || 0);
    if (!Number.isFinite(amt)) return "0.00";
    const rate = Number(settings.taxRatePct) / 100;
    return amt > 0 ? (amt * rate).toFixed(2) : "0.00";
  }, [amount, settings.taxMode, settings.taxRatePct, settings.taxAmountOverride]);

  const cardData = useMemo(() => {
    const a = (address || "").trim();
    const z = (zip || "").trim();
    if (!a && !z) return "";
    return `${a}${a && z ? "," : ""}${z}`;
  }, [address, zip]);

  useEffect(() => saveJSON(LS_KEYS.settings, settings), [settings]);
  useEffect(() => saveJSON(LS_KEYS.logs, logs), [logs]);
  useEffect(() => localStorage.setItem(LS_KEYS.counter, String(counter)), [counter]);

  const handleLogin = () => {
    const fn = firstName.trim();
    if (!fn) return alert("Please enter your first name.");
    const next = { firstName: fn };
    setUser(next);
    saveJSON(LS_KEYS.user, next);
  };
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(LS_KEYS.user);
  };

  const buildXml = () => {
    const keyReg = settings.useRegisterIdSpelling;
    const parts = [];
    const pushTag = (name, value) => {
      if (value === undefined || value === null) return;
      if (String(value).trim() === "") return;
      parts.push(`<${name}>${escapeXml(String(value))}</${name}>`);
    };

    const formattedAmount = formatAmount(amount);

    pushTag("PaymentType", paymentType);
    pushTag("TransType", transType);
    pushTag("Amount", formattedAmount);
    pushTag("AuthKey", authKey);
    pushTag(keyReg, registerId);
    pushTag("RefId", refIdEffective);
    pushTag("InvNum", invNum);
    pushTag("ClerkId", clerkId);
    pushTag("PrintReceipt", printReceipt);
    pushTag("SigCapture", sigCapture);
    if (cardData) pushTag("CardData", cardData);
    pushTag("TaxAmount", taxAmount); // <TaxAmount>
    pushTag("CustRef", custRef);
    pushTag("DestZipCode", destZipCode);
    pushTag("LocalTaxFlag", settings.localTaxFlag);
    pushTag("Token", token);
    pushTag("Expiry", expiry);
    pushTag("AuthCode", authCode);
    if (transType === "Reversal") pushTag("ReversalType", reversalType);

    return `<request>${parts.join("")}</request>`;
  };

  const shouldShowField = (field) => {
    if (transType === "Settle") {
      return ["TransType", "AuthKey", settings.useRegisterIdSpelling].includes(field);
    }
    if (transType === "Auth" && ["AuthCode", "Token", "Expiry"].includes(field)) return false;
    if (transType === "Capture" && ["PrintReceipt", "SigCapture", "Token", "Expiry"].includes(field)) return false;
    if (transType === "Sale" && ["AuthCode", "Token", "Expiry"].includes(field)) return false;
    return true;
  };

  const buildUrl = () => settings.baseUrl + encodeURIComponent(buildXml());
  const validate = () => true;

  const execute = () => {
    if (!user) return alert("Please log in first.");
    const url = buildUrl();
    const logEntry = {
      id: `${Date.now()}_${refIdEffective}`,
      timestamp: new Date().toISOString(),
      user: clerkId,
      transType,
      amount: formatAmount(amount),
      refId: refIdEffective,
      requestXml: buildXml(),
      requestUrl: url,
      responseCaptured: null,
    };
    setLogs((prev) => [logEntry, ...prev]);
    setCounter((c) => c + 1);

    // Execute behavior handling (work around sandbox/CSP)
    if (settings.executeBehavior === 'newtab') {
      window.open(url, '_blank', 'noopener');
    } else if (settings.executeBehavior === 'both') {
      setIframeUrl(url);
      window.open(url, '_blank', 'noopener');
    } else {
      setIframeUrl(url);
    }
  };

  const [captureText, setCaptureText] = useState("");
  const attachResponseToMostRecent = () => {
    const latestId = logs[0]?.id;
    if (!latestId) return alert("No logs available to attach.");
    if (!captureText.trim()) return alert("Paste the response text first.");
    setLogs((prev) => prev.map((l, i) => (i === 0 ? { ...l, responseCaptured: captureText.trim() } : l)));
    setCaptureText("");
  };

  const exportLogs = () => {
    const rows = [[
      "timestamp","user","transType","amount","refId","requestUrl","requestXml","responseCaptured"
    ], ...logs.map(l => [l.timestamp, l.user, l.transType, l.amount, String(l.refId), l.requestUrl, l.requestXml, l.responseCaptured || ""])];
    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaction_logs_${new Date().toISOString().slice(0, 19)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Curbstone Transaction Builder</h1>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm">Signed in as <strong>{user.firstName}</strong></span>
                <button className="px-3 py-1 rounded-xl bg-slate-200 hover:bg-slate-300" onClick={handleLogout}>Sign out</button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <input className="px-3 py-2 rounded-xl border w-40" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                <button className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:opacity-90" onClick={handleLogin}>Create account / Sign in</button>
              </div>
            )}
          </div>
        </header>

        {/* Properties / Defaults */}
        <details className="bg-white rounded-2xl shadow p-4">
          <summary className="cursor-pointer font-medium">Properties & Defaults</summary>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm">Default AuthKey</span>
              <input className="px-3 py-2 rounded-xl border" value={settings.defaultAuthKey} onChange={(e) => setSettings({ ...settings, defaultAuthKey: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm">Default {settings.useRegisterIdSpelling}</span>
              <input className="px-3 py-2 rounded-xl border" value={settings.defaultRegisterId} onChange={(e) => setSettings({ ...settings, defaultRegisterId: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm">PrintReceipt (default)</span>
              <select className="px-3 py-2 rounded-xl border" value={settings.defaultPrintReceipt} onChange={(e) => { setSettings({ ...settings, defaultPrintReceipt: e.target.value }); setPrintReceipt(e.target.value);} }>
                {YES_NO.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm">SigCapture (default)</span>
              <select className="px-3 py-2 rounded-xl border" value={settings.defaultSigCapture} onChange={(e) => { setSettings({ ...settings, defaultSigCapture: e.target.value }); setSigCapture(e.target.value);} }>
                {YES_NO.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-sm">Tax mode</span>
              <div className="flex gap-3 items-center">
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="taxmode" checked={settings.taxMode === 'rate'} onChange={() => setSettings({ ...settings, taxMode: 'rate' })} /> Rate (%)</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" name="taxmode" checked={settings.taxMode === 'amount'} onChange={() => setSettings({ ...settings, taxMode: 'amount' })} /> Amount</label>
              </div>
            </div>
            {settings.taxMode === 'rate' ? (
              <label className="flex flex-col gap-1">
                <span className="text-sm">Tax rate (%)</span>
                <input type="number" className="px-3 py-2 rounded-xl border" value={settings.taxRatePct} onChange={(e) => setSettings({ ...settings, taxRatePct: Number(e.target.value || 0) })} />
              </label>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="text-sm">Tax amount (&lt;TaxAmount&gt;)</span>
                <input type="number" className="px-3 py-2 rounded-xl border" value={settings.taxAmountOverride} onChange={(e) => setSettings({ ...settings, taxAmountOverride: e.target.value })} />
              </label>
            )}
            <label className="flex flex-col gap-1">
              <span className="text-sm">Execute behavior</span>
              <select className="px-3 py-2 rounded-xl border" value={settings.executeBehavior} onChange={(e) => setSettings({ ...settings, executeBehavior: e.target.value })}>
                <option value="iframe">Load in iframe</option>
                <option value="newtab">Open new tab</option>
                <option value="both">Both (reliable)</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                type="button"
                className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300"
                onClick={() => {
                  if (settings.defaultAuthKey) setAuthKey(settings.defaultAuthKey);
                  if (settings.defaultRegisterId) setRegisterId(settings.defaultRegisterId);
                  setPrintReceipt(settings.defaultPrintReceipt);
                  setSigCapture(settings.defaultSigCapture);
                }}
              >Apply defaults to form</button>
            </div>
          </div>
        </details>

        {/* Builder */}
        <section className="bg-white rounded-2xl shadow p-4 space-y-4">
          <h2 className="text-lg font-medium">Build Transaction</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <LabeledSelect label="TransType" value={transType} onChange={setTransType} options={TRANS_TYPES} />
            {shouldShowField("PaymentType") && <LabeledSelect label="PaymentType" value={paymentType} onChange={setPaymentType} options={PAYMENT_TYPES} />}
            {shouldShowField("AuthKey") && <LabeledInput label="AuthKey" value={authKey} onChange={setAuthKey} />}

            {shouldShowField(settings.useRegisterIdSpelling) && <LabeledInput label={settings.useRegisterIdSpelling} value={registerId} onChange={setRegisterId} />}
            {shouldShowField("Amount") && <LabeledInput label="Amount" value={amount} onChange={setAmount} type="number" placeholder="e.g., 1.00" />}
            {shouldShowField("InvNum") && <LabeledInput label="Invoice Number (InvNum)" value={invNum} onChange={setInvNum} />}

            {shouldShowField("RefId") && (
              (["Capture", "Reversal", "Return"].includes(transType)) ? (
                <LabeledInput label="MFUKEY (RefId)" value={refIdInput} onChange={setRefIdInput} />
              ) : (
                <LabeledReadOnly label="MFUKEY (RefId)" value={String(refIdEffective)} />
              )
            )}
            {shouldShowField("ClerkId") && <LabeledReadOnly label="USER (ClerkId)" value={clerkId || "(login required)"} />}
            {shouldShowField("PrintReceipt") && <LabeledSelect label="PrintReceipt" value={printReceipt} onChange={setPrintReceipt} options={YES_NO} />}
            {shouldShowField("SigCapture") && <LabeledSelect label="SigCapture" value={sigCapture} onChange={setSigCapture} options={YES_NO} />}

            {shouldShowField("CustRef") && <LabeledInput label="Customer Number (CustRef)" value={custRef} onChange={setCustRef} />}
            {shouldShowField("DestZipCode") && <LabeledInput label="Destination Zip (DestZipCode)" value={destZipCode} onChange={setDestZipCode} />}

            {shouldShowField("AuthCode") && <LabeledInput label="AuthCode" value={authCode} onChange={setAuthCode} />}
            {shouldShowField("Token") && <LabeledInput label="Token" value={token} onChange={setToken} />}
            {shouldShowField("Expiry") && <LabeledInput label="Expiry" value={expiry} onChange={setExpiry} placeholder="MMYY" />}

            {shouldShowField("Address") && <LabeledInput label="Address (for CardData)" value={address} onChange={setAddress} />}
            {shouldShowField("Zip") && <LabeledInput label="Zip (for CardData)" value={zip} onChange={setZip} />}

            <LabeledReadOnly label="TaxAmount (auto)" value={taxAmount} />
            <LabeledReadOnly label="LocalTaxFlag (hidden)" value={settings.localTaxFlag} />
            <LabeledReadOnly label="CardData (hidden)" value={cardData} />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-xs font-mono overflow-auto border">
            <div className="text-slate-500 mb-1">XML preview</div>
            <pre className="whitespace-pre-wrap">{buildXml()}</pre>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={execute} className="px-4 py-2 rounded-2xl bg-emerald-600 text-white hover:opacity-95">
              Execute ➜ Load below
            </button>
            <a
              className="px-4 py-2 rounded-2xl bg-slate-900 text-white hover:opacity-95"
              href={buildUrl()}
              target="_blank"
              rel="noreferrer"
            >
              Open in new tab
            </a>
          </div>
        </section>

        {/* iFrame Result */}
        <section className="bg-white rounded-2xl shadow p-4 space-y-3">
          <h2 className="text-lg font-medium">Gateway Response (iframe)</h2>
          {iframeUrl ? (
            <iframe ref={iframeRef} title="gateway" src={iframeUrl} className="w-full h-[420px] rounded-xl border" />
          ) : (
            <div className="text-sm text-slate-500">Run a transaction to load the response here.</div>
          )}

          <details className="bg-slate-50 rounded-xl p-3 border">
            <summary className="cursor-pointer text-sm font-medium">Response Capture (workaround)</summary>
            <p className="text-sm mt-2">
              Browsers block reading cross-origin iframe content. If you need the exact response logged, paste it
              here after copying from the iframe / new tab.
            </p>
            <textarea
              className="mt-2 w-full h-28 rounded-xl border p-2 text-sm font-mono"
              placeholder="Paste raw response or key fields here"
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
            />
            <div className="mt-2">
              <button onClick={attachResponseToMostRecent} className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300">
                Attach to most recent log
              </button>
            </div>
          </details>
        </section>

        {/* Logs */}
        <section className="bg-white rounded-2xl shadow p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Logs</h2>
            <button onClick={exportLogs} className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300">
              Export CSV
            </button>
          </div>
          {logs.length === 0 ? (
            <div className="text-sm text-slate-500">No logs yet.</div>
          ) : (
            <div className="overflow-auto border rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Time</Th>
                    <Th>User</Th>
                    <Th>Type</Th>
                    <Th>Amount</Th>
                    <Th>RefId</Th>
                    <Th>Request URL</Th>
                    <Th>Response (captured)</Th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-t align-top">
                      <Td>{new Date(l.timestamp).toLocaleString()}</Td>
                      <Td>{l.user}</Td>
                      <Td>{l.transType}</Td>
                      <Td>{l.amount}</Td>
                      <Td>{String(l.refId)}</Td>
                      <Td>
                        <a className="text-blue-600 underline break-all" href={l.requestUrl} target="_blank" rel="noreferrer">
                          {l.requestUrl}
                        </a>
                        <details className="mt-1">
                          <summary className="text-slate-500">XML</summary>
                          <pre className="text-xs font-mono whitespace-pre-wrap">{l.requestXml}</pre>
                        </details>
                      </Td>
                      <Td>
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {l.responseCaptured || "(not captured)"}
                        </pre>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick How-to */}
        <section className="bg-white rounded-2xl shadow p-4 space-y-2">
          <h2 className="text-lg font-medium">How to use</h2>
          <ol className="list-decimal pl-6 space-y-1 text-sm">
            <li>Enter your first name to sign in. This becomes <code>ClerkId</code>.</li>
            <li>Fill in the required fields. Hidden/auto fields (e.g., <code>TaxAmount</code>, <code>LocalTaxFlag</code>, <code>CardData</code>) are computed.</li>
            <li>Click <strong>Execute</strong> to load the URL into the iframe and log the request.</li>
            <li>If the iframe is blocked, change <em>Execute behavior</em> in <strong>Properties</strong> to <em>Both (reliable)</em> or <em>Open new tab</em>.</li>
            <li>Use <strong>Export CSV</strong> to download your logs.</li>
          </ol>
        </section>
      </div>
    </div>
  );
}

// ---- UI helpers ----
function LabeledInput({ label, value, onChange, type = "text", placeholder }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm">{label}</span>
      <input
        className="px-3 py-2 rounded-xl border"
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function LabeledReadOnly({ label, value }) {
  return (
    <label className="flex flex-col gap-1 opacity-80">
      <span className="text-sm">{label}</span>
      <input className="px-3 py-2 rounded-xl border bg-slate-100" readOnly value={value} />
    </label>
  );
}
function LabeledSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm">{label}</span>
      <select className="px-3 py-2 rounded-xl border" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
function Th({ children }) {
  return <th className="text-left font-medium p-2">{children}</th>;
}
function Td({ children }) {
  return <td className="p-2">{children}</td>;
}

// ---- XML & CSV helpers ----
function escapeXml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
function csvEscape(s) {
  const str = String(s ?? "");
  if (/[",\n]/.test(str)) {
    return '"' + str.replaceAll('"', '""') + '"';
  }
  return str;
}
