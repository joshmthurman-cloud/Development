import React, { useEffect, useMemo, useRef, useState } from 'react';

// ---- Persistence keys ----
const LS_KEYS = {
  user: 'ctb_user',
  counter: 'ctb_refid_counter',
  logs: 'ctb_logs',
  settings: 'ctb_settings',
};

// ---- Helpers: localStorage JSON ----
function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function loadJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

// ---- Constants ----
const TRANS_TYPES = ['Auth','Capture','Sale','ReferentialSale','Reversal','Return','Settle'];
const PAYMENT_TYPES = ['Credit','Debit'];
const YES_NO = ['No','Yes'];

// Build YYMMDDHHMMSS timestamp (local time)
function makeRefId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const MM = String(d.getMinutes()).padStart(2, '0');
  const SS = String(d.getSeconds()).padStart(2, '0');
  return `${yy}${mm}${dd}${HH}${MM}${SS}`;
}

export default function App() {
  // Auth / Login
  const [user, setUser] = useState(() => loadJSON(LS_KEYS.user, null));
  const [firstName, setFirstName] = useState('');

  // Settings (properties & defaults)
  const [settings, setSettings] = useState(() =>
    loadJSON(LS_KEYS.settings, {
      baseUrl: 'https://spinpos.net:443/spin/cgi.html?TerminalTransaction=',
      useRegisterIdSpelling: 'RegisterId', // or 'RegitsterId'
      defaultPrintReceipt: 'No',
      defaultSigCapture: 'No',
      defaultAuthKey: '',
      defaultRegisterId: '',
      taxMode: 'rate', // 'rate' | 'amount'
      taxRatePct: 10,
      taxAmountOverride: '',
      localTaxFlag: 'TaxProvided',
      executeBehavior: 'iframe', // 'iframe' | 'newtab' | 'both'
    })
  );

  // Counter kept for backwards compat (not used for RefId now)
  const [counter, setCounter] = useState(() => {
    const v = Number(localStorage.getItem(LS_KEYS.counter));
    return Number.isFinite(v) && v >= 0 ? v : 1;
  });

  // Logs
  const [logs, setLogs] = useState(() => loadJSON(LS_KEYS.logs, []));

  // Form state
  const [transType, setTransType] = useState('Auth');
  const [paymentType, setPaymentType] = useState('Credit');
  const [authKey, setAuthKey] = useState('');
  const [registerId, setRegisterId] = useState('');
  const [amount, setAmount] = useState('');
  const [invNum, setInvNum] = useState('');
  const [custRef, setCustRef] = useState('');
  const [destZipCode, setDestZipCode] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [address, setAddress] = useState('');
  const [zip, setZip] = useState('');
  // Hidden controls live in Properties & Defaults
  const [token, setToken] = useState('');
  const [expiry, setExpiry] = useState('');
  const [reversalType, setReversalType] = useState('Full');
  const [refIdInput, setRefIdInput] = useState(''); // manual MFUKEY for Capture + Reversal

  // Apply defaults once
  useEffect(() => {
    if (settings.defaultAuthKey) setAuthKey(settings.defaultAuthKey);
    if (settings.defaultRegisterId) setRegisterId(settings.defaultRegisterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Iframe / execution
  const [iframeUrl, setIframeUrl] = useState('');
  const iframeRef = useRef(null);

  // Derived
  const clerkId = user?.firstName || '';

  // Amount normalization (ensure .00)
  const normalizedAmount = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '';
    return n.toFixed(2);
  }, [amount]);

  // Tax amount calculation
  const taxAmount = useMemo(() => {
    if (settings.taxMode === 'amount' && String(settings.taxAmountOverride || '').trim() !== '') {
      const fixed = Number(settings.taxAmountOverride);
      return Number.isFinite(fixed) ? fixed.toFixed(2) : '0.00';
    }
    const amt = Number(amount || 0);
    if (!Number.isFinite(amt)) return '0.00';
    const rate = Number(settings.taxRatePct) / 100;
    return amt > 0 ? (amt * rate).toFixed(2) : '0.00';
  }, [amount, settings.taxMode, settings.taxRatePct, settings.taxAmountOverride]);

  // CardData
  const cardData = useMemo(() => {
    const a = (address || '').trim();
    const z = (zip || '').trim();
    if (!a && !z) return '';
    return `${a}${a && z ? ',' : ''}${z}`;
  }, [address, zip]);

  // Persist
  useEffect(() => saveJSON(LS_KEYS.settings, settings), [settings]);
  useEffect(() => saveJSON(LS_KEYS.logs, logs), [logs]);
  useEffect(() => localStorage.setItem(LS_KEYS.counter, String(counter)), [counter]);

  // Login handlers
  const handleLogin = () => {
    const fn = firstName.trim();
    if (!fn) return alert('Please enter your first name.');
    const next = { firstName: fn };
    setUser(next);
    saveJSON(LS_KEYS.user, next);
  };
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem(LS_KEYS.user);
  };

  // Required fields per trans type
  const requiredByType = useMemo(() => {
    switch (transType) {
      case 'Auth':
        return ['PaymentType','TransType','Amount','AuthKey', settings.useRegisterIdSpelling, 'RefId'];
      case 'Sale':
        return ['PaymentType','TransType','Amount','AuthKey', settings.useRegisterIdSpelling, 'RefId'];
      case 'ReferentialSale':
        // same as Sale; Token/Expiry are available but not required
        return ['PaymentType','TransType','Amount','AuthKey', settings.useRegisterIdSpelling, 'RefId'];
      case 'Capture':
        // CustRef + AuthCode required; RefId is previous MFUKEY (manual)
        return ['PaymentType','TransType','Amount','AuthKey', settings.useRegisterIdSpelling, 'RefId','AuthCode','CustRef'];
      case 'Return':
        // New RefId; AuthCode required; InvNum NOT required
        return ['PaymentType','TransType','Amount','AuthKey', settings.useRegisterIdSpelling, 'RefId','AuthCode'];
      case 'Reversal':
        // Amount IS required; InvNum NOT required; RefId manual
        return ['PaymentType','TransType','Amount','AuthKey', settings.useRegisterIdSpelling, 'RefId'];
      case 'Settle':
        return ['TransType','AuthKey', settings.useRegisterIdSpelling];
      default:
        return ['PaymentType','TransType','Amount','AuthKey', settings.useRegisterIdSpelling, 'RefId'];
    }
  }, [transType, settings.useRegisterIdSpelling]);

  // Field visibility
  const shouldShowField = (field) => {
    if (transType === 'Settle') {
      return ['TransType','AuthKey', settings.useRegisterIdSpelling].includes(field);
    }
    // Hide Token/Expiry for Auth, Sale, Capture, Reversal (explicit), show for Return + ReferentialSale
    if (['Auth','Sale','Capture','Reversal'].includes(transType) && (field === 'Token' || field === 'Expiry')) return false;
    // Hide AuthCode except when Capture or Return (where required)
    if (!['Capture','Return'].includes(transType) && field === 'AuthCode') return false;
    // Hide PrintReceipt/SigCapture from main form (they live in Properties)
    if (field === 'PrintReceipt' || field === 'SigCapture') return false;
    return true;
  };

  // XML builder with explicit RefId
  const buildXml = (refIdForXml) => {
    const keyReg = settings.useRegisterIdSpelling;
    const parts = [];
    const pushTag = (name, value) => {
      if (value === undefined || value === null) return;
      const s = String(value).trim();
      if (s === '') return;
      parts.push(`<${name}>${escapeXml(s)}</${name}>`);
    };

    // Core
    pushTag('TransType', transType);
    if (transType !== 'Settle') pushTag('PaymentType', paymentType);
    if (transType !== 'Settle') pushTag('Amount', normalizedAmount || amount);
    pushTag('AuthKey', authKey);
    pushTag(keyReg, registerId);

    // RefId rules
    if (transType === 'Settle') {
      // no RefId
    } else {
      pushTag('RefId', refIdForXml);
    }

    // Optional/common
    if (invNum && transType !== 'Reversal') pushTag('InvNum', invNum); // Reversal: not needed
    if (clerkId) pushTag('ClerkId', clerkId);

    // PrintReceipt/SigCapture rules (No for Capture/Return/Reversal)
    const pr = (transType === 'Capture' || transType === 'Return' || transType === 'Reversal') ? 'No' : settings.defaultPrintReceipt;
    const sc = (transType === 'Capture' || transType === 'Return' || transType === 'Reversal') ? 'No' : settings.defaultSigCapture;
    pushTag('PrintReceipt', pr);
    pushTag('SigCapture', sc);

    // Hidden/derived
    if (cardData) pushTag('CardData', cardData);
    if (transType !== 'Settle') {
      pushTag('TaxAmount', taxAmount);
      pushTag('LocalTaxFlag', settings.localTaxFlag);
    }

    // Specifics
    if (['Capture','Return'].includes(transType)) pushTag('AuthCode', authCode); // required for these

    // Token/Expiry: only for ReferentialSale + Return (optional)
    if (transType === 'ReferentialSale' || transType === 'Return') {
      pushTag('Token', token);
      pushTag('Expiry', expiry);
    }

    pushTag('CustRef', custRef);
    pushTag('DestZipCode', destZipCode);

    if (transType === 'Reversal') pushTag('ReversalType', reversalType);

    return `<request>${parts.join('')}</request>`;
  };

  const buildUrl = (refIdForXml) => settings.baseUrl + encodeURIComponent(buildXml(refIdForXml));

  // Validation uses a simulated/actual RefId depending on type
  const validate = () => {
    const simulatedRef = ['Capture','Reversal'].includes(transType) ? (refIdInput.trim() || '') : makeRefId();
    const xmlMap = xmlToMap(buildXml(simulatedRef));
    const missing = [];
    for (const k of requiredByType) {
      if (!xmlMap.has(k) || String(xmlMap.get(k)).trim() === '') missing.push(k);
    }
    if (missing.length) {
      alert('Missing required fields: ' + missing.join(', '));
      return false;
    }
    return true;
  };

  // Execute
  const execute = () => {
    if (!user) return alert('Please log in first.');
    if (!validate()) return;

    // Final RefId determination
    const finalRefId = ['Capture','Reversal'].includes(transType)
      ? refIdInput.trim()
      : makeRefId(); // all other types auto-generate timestamp RefId

    const url = buildUrl(finalRefId);

    const logEntry = {
      id: `${Date.now()}_${finalRefId}`,
      timestamp: new Date().toISOString(),
      user: clerkId,
      transType,
      amount: normalizedAmount || amount,
      refId: finalRefId,
      requestXml: buildXml(finalRefId),
      requestUrl: url,
      responseCaptured: null,
      status: 'requested',
    };
    setLogs((prev) => [logEntry, ...prev]);

    // keep historical counter ticking if you want (not used for RefId anymore)
    setCounter((c) => c + 1);

    if (settings.executeBehavior === 'newtab') {
      window.open(url, '_blank', 'noopener');
    } else if (settings.executeBehavior === 'both') {
      setIframeUrl(url);
      window.open(url, '_blank', 'noopener');
    } else {
      setIframeUrl(url);
    }
  };

  // Manual response capture
  const [captureText, setCaptureText] = useState('');
  const attachResponseToMostRecent = () => {
    const latestId = logs[0]?.id;
    if (!latestId) return alert('No logs available to attach.');
    if (!captureText.trim()) return alert('Paste the response text first.');
    setLogs((prev) => prev.map((l, i) => (i === 0 ? { ...l, responseCaptured: captureText.trim(), status: 'attached' } : l)));
    setCaptureText('');
  };

  // Try to detect iframe load (cannot read cross-origin; just mark)
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        const txt = doc?.body?.innerText || '';
        if (txt && txt.includes('<response')) {
          setLogs((prev) => prev.map((l, i) => (i === 0 ? { ...l, responseCaptured: txt, status: 'captured' } : l)));
        } else {
          setLogs((prev) => prev.map((l, i) => (i === 0 ? { ...l, responseCaptured: 'Loaded (cross-origin). Paste & Attach to store the response.', status: 'loaded' } : l)));
        }
      } catch {
        setLogs((prev) => prev.map((l, i) => (i === 0 ? { ...l, responseCaptured: 'Loaded (cross-origin). Paste & Attach to store the response.', status: 'loaded' } : l)));
      }
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [iframeUrl]);

  // CSV export
  const exportLogs = () => {
    const rows = [
      ['timestamp','user','transType','amount','refId','requestUrl','requestXml','responseCaptured','status'],
      ...logs.map((l) => [
        l.timestamp, l.user, l.transType, l.amount, String(l.refId), l.requestUrl, l.requestXml, l.responseCaptured || '', l.status || ''
      ])
    ];
    const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date();
    const y = String(date.getFullYear());
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    a.download = `transaction_logs_${y}${m}${d}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const clearLogs = () => {
    if (!confirm('Clear all logs? This cannot be undone.')) return;
    setLogs([]);
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
              <span className="text-sm">Gateway Base URL</span>
              <input className="px-3 py-2 rounded-xl border" value={settings.baseUrl} onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm">RegisterId key spelling (URL tag)</span>
              <select className="px-3 py-2 rounded-xl border" value={settings.useRegisterIdSpelling} onChange={(e) => setSettings({ ...settings, useRegisterIdSpelling: e.target.value })}>
                <option value="RegisterId">RegisterId</option>
                <option value="RegitsterId">RegitsterId (gateway typo)</option>
              </select>
            </label>
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
              <select className="px-3 py-2 rounded-xl border" value={settings.defaultPrintReceipt} onChange={(e) => setSettings({ ...settings, defaultPrintReceipt: e.target.value })}>
                {YES_NO.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm">SigCapture (default)</span>
              <select className="px-3 py-2 rounded-xl border" value={settings.defaultSigCapture} onChange={(e) => setSettings({ ...settings, defaultSigCapture: e.target.value })}>
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
            <div className="flex items-end">
              <button
                type="button"
                className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300"
                onClick={() => {
                  if (settings.defaultAuthKey) setAuthKey(settings.defaultAuthKey);
                  if (settings.defaultRegisterId) setRegisterId(settings.defaultRegisterId);
                }}
              >Apply defaults to form</button>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-sm">Execute behavior</span>
              <select className="px-3 py-2 rounded-xl border" value={settings.executeBehavior} onChange={(e) => setSettings({ ...settings, executeBehavior: e.target.value })}>
                <option value="iframe">Load in iframe</option>
                <option value="newtab">Open new tab</option>
                <option value="both">Both (reliable)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm">LocalTaxFlag (hidden)</span>
              <input className="px-3 py-2 rounded-xl border" value={settings.localTaxFlag} onChange={(e) => setSettings({ ...settings, localTaxFlag: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-slate-500">ClerkId is derived from login and only used in logs/XML</span>
              <input className="px-3 py-2 rounded-xl border bg-slate-100" readOnly value={user?.firstName || '(login required)'} />
            </label>
          </div>
        </details>

        {/* Builder */}
        <section className="bg-white rounded-2xl shadow p-4 space-y-4">
          <h2 className="text-lg font-medium">Build Transaction</h2>

          {/* Order grid 3xN per your spec */}
          <div className="grid md:grid-cols-3 gap-4">
            <LabeledSelect label={<LabelWithReq label="TransType" required={true} />} value={transType} onChange={setTransType} options={TRANS_TYPES} />
            {shouldShowField('PaymentType') && <LabeledSelect label={<LabelWithReq label="PaymentType" required={requiredByType.includes('PaymentType')} />} value={paymentType} onChange={setPaymentType} options={PAYMENT_TYPES} />}
            {shouldShowField('InvNum') && <LabeledInput label={<LabelWithReq label="Invoice Number (InvNum)" required={requiredByType.includes('InvNum')} />} value={invNum} onChange={setInvNum} />}

            {shouldShowField('Amount') && <LabeledInput label={<LabelWithReq label="Amount" required={requiredByType.includes('Amount')} />} value={amount} onChange={setAmount} type="number" placeholder="e.g., 1 or 1.00" />}
            {shouldShowField('Address') && <LabeledInput label="Address (for CardData)" value={address} onChange={setAddress} />}
            {shouldShowField('Zip') && <LabeledInput label="Zip (for CardData)" value={zip} onChange={setZip} />}

            {shouldShowField('CustRef') && <LabeledInput label={<LabelWithReq label="Customer Number (CustRef)" required={requiredByType.includes('CustRef')} />} value={custRef} onChange={setCustRef} />}
            {shouldShowField('DestZipCode') && <LabeledInput label="Destination Zip (DestZipCode)" value={destZipCode} onChange={setDestZipCode} />}
            {/* RefId display: manual for Capture/Reversal, auto (timestamp) for others */}
            {transType === 'Capture' || transType === 'Reversal' ? (
              <LabeledInput label={<LabelWithReq label="MFUKEY (RefId)" required={true} />} value={refIdInput} onChange={setRefIdInput} />
            ) : (
              <LabeledReadOnly label="MFUKEY (RefId)" value="auto (timestamp at Execute)" />
            )}

            {shouldShowField('AuthKey') && <LabeledInput label={<LabelWithReq label="AuthKey" required={requiredByType.includes('AuthKey')} />} value={authKey} onChange={setAuthKey} />}
            {shouldShowField(settings.useRegisterIdSpelling) && <LabeledInput label={<LabelWithReq label={settings.useRegisterIdSpelling} required={requiredByType.includes(settings.useRegisterIdSpelling)} />} value={registerId} onChange={setRegisterId} />}
            {shouldShowField('AuthCode') && <LabeledInput label={<LabelWithReq label="AuthCode" required={requiredByType.includes('AuthCode')} />} value={authCode} onChange={setAuthCode} />}

            {/* Token/Expiry visible for Return + ReferentialSale */}
            {shouldShowField('Token') && (transType === 'ReferentialSale' || transType === 'Return') && <LabeledInput label="Token" value={token} onChange={setToken} />}
            {shouldShowField('Expiry') && (transType === 'ReferentialSale' || transType === 'Return') && <LabeledInput label="Expiry" value={expiry} onChange={setExpiry} placeholder="MMYY" />}

            {/* Read-only derived items */}
            <LabeledReadOnly label="TaxAmount (computed)" value={taxAmount} />
            <LabeledReadOnly label="LocalTaxFlag (from Properties)" value={settings.localTaxFlag} />
            <LabeledReadOnly label="CardData (derived)" value={cardData} />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-xs font-mono overflow-auto border">
            <div className="text-slate-500 mb-1">XML preview</div>
            <pre className="whitespace-pre-wrap">{buildXml(['Capture','Reversal'].includes(transType) ? (refIdInput.trim() || '(missing)') : 'YYMMDDhhmmss at Execute')}</pre>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <button
              disabled={!canExecute(requiredByType, { paymentType, transType, amount, normalizedAmount, authKey, registerId, refIdInput, transTypeNow: transType, custRef, authCode, invNum })}
              onClick={execute}
              className="px-4 py-2 rounded-2xl text-white hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#059669' }}
            >
              Execute ? Load below
            </button>
            <a className="px-4 py-2 rounded-2xl bg-slate-900 text-white hover:opacity-95" href={buildUrl(['Capture','Reversal'].includes(transType) ? (refIdInput.trim() || '') : makeRefId())} target="_blank" rel="noreferrer">Open in new tab</a>
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
              Browsers block reading cross-origin iframe content. If you need the exact response logged, paste it here
              after copying from the iframe/new tab.
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
            <div className="flex gap-2">
              <button onClick={exportLogs} className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300">Export CSV</button>
              <button onClick={clearLogs} className="px-3 py-2 rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200">Clear logs</button>
            </div>
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
                    <Th>Status / Response</Th>
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
                        <div className="text-xs text-slate-600 mb-1">{l.status || ''}</div>
                        <pre className="text-xs font-mono whitespace-pre-wrap">{l.responseCaptured || '(not captured)'}</pre>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---- UI helpers ----
function LabelWithReq({ label, required }) {
  return (
    <span className="inline-flex items-center">
      <span>{label}</span>
      {required ? <span className="req-badge">required</span> : null}
    </span>
  );
}

function LabeledInput({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm">{label}</span>
      <input className="px-3 py-2 rounded-xl border" type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
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
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
function Th({ children }) { return <th className="text-left font-medium p-2">{children}</th>; }
function Td({ children }) { return <td className="p-2">{children}</td>; }

// ---- XML & CSV helpers ----
function escapeXml(str) {
  return str
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&apos;');
}
function xmlToMap(xmlString) {
  const map = new Map();
  const tagRegex = /<([A-Za-z0-9]+)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = tagRegex.exec(xmlString))) {
    const [, tag, val] = m;
    map.set(tag, val);
  }
  return map;
}
function csvEscape(s) {
  const str = String(s ?? '');
  if (/[",\r\n]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
function canExecute(required, state) {
  // Presence of required values; RefId auto for non-manual types
  const get = (k) => {
    if (k === 'PaymentType') return state.paymentType;
    if (k === 'TransType') return state.transType;
    if (k === 'Amount') return state.normalizedAmount || '';
    if (k === 'AuthKey') return state.authKey;
    if (k === 'RefId') {
      if (['Capture','Reversal'].includes(state.transTypeNow)) return state.refIdInput || '';
      return 'auto'; // generated on execute
    }
    if (k === 'CustRef') return state.custRef;
    if (k === 'AuthCode') return state.authCode;
    if (k === 'RegisterId' || k === 'RegitsterId') return state.registerId;
    if (k === 'InvNum') return state.invNum;
    return 'x';
  };
  return required.every((k) => String(get(k) || '').trim() !== '');
}
