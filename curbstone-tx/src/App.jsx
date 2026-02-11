import React, { useEffect, useMemo, useRef, useState } from "react";
import LoginPage from "./LoginPage";
import UserManagement from "./UserManagement";
import { authAPI, logsAPI } from "./api";

const LS_KEYS = {
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

// All allowed transaction types (will be filtered by user permissions)
const ALL_TRANS_TYPES = [
  "Auth",
  "Capture",
  "Sale",
  "ReferentialSale",
  "Reversal",
  "Return",
  "Settle",
  "Ticket",
  "Void",
];
const PAYMENT_TYPES = ["Credit", "Debit"];
const YES_NO = ["No", "Yes"];

// YYMMDDHHMMSS (local time) unique RefId
function makeRefIdTimestamp() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const MM = String(d.getMinutes()).padStart(2, "0");
  const SS = String(d.getSeconds()).padStart(2, "0");
  return `${yy}${mm}${dd}${HH}${MM}${SS}`;
}

export default function App() {
  // Auth / Login - API-based
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showUserManagement, setShowUserManagement] = useState(false);

  // Properties & defaults
  const [settings, setSettings] = useState(() =>
    loadJSON(LS_KEYS.settings, {
      baseUrl: "https://spinpos.net:443/spin/cgi.html?TerminalTransaction=",
      useRegisterIdSpelling: "RegisterId", // or "RegitsterId"
      defaultPrintReceipt: "No",
      defaultSigCapture: "No",
      defaultAuthKey: "",
      defaultRegisterId: "",
      taxMode: "rate", // 'rate' | 'amount'
      taxRatePct: 10,
      taxAmountOverride: "", // when taxMode === 'amount'
      localTaxFlag: "TaxProvided",
      executeBehavior: "iframe", // 'iframe' | 'newtab' | 'both'
      donePhrase: "Done", // same-origin only heuristic
      relayCaptureUrl: "", // optional server relay endpoint
      relayOnLoaded: true,
      relayOnExecute: true,
    })
  );

  // Historical counter (kept, but not used for RefId anymore)
  const [counter, setCounter] = useState(() => {
    const v = Number(localStorage.getItem(LS_KEYS.counter));
    return Number.isFinite(v) && v >= 0 ? v : 1;
  });

  const [logs, setLogs] = useState(() => loadJSON(LS_KEYS.logs, []));

  // Form state
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
  const [cardType, setCardType] = useState("");
  const [refIdInput, setRefIdInput] = useState(""); // manual MFUKEY for Capture/Reversal only

  // init defaults (once)
  useEffect(() => {
    setPrintReceipt(settings.defaultPrintReceipt || "No");
    setSigCapture(settings.defaultSigCapture || "No");
    if (settings.defaultAuthKey) setAuthKey(settings.defaultAuthKey);
    if (settings.defaultRegisterId) setRegisterId(settings.defaultRegisterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-update AuthKey and RegisterId when defaults change
  useEffect(() => {
    if (settings.defaultAuthKey) setAuthKey(settings.defaultAuthKey);
  }, [settings.defaultAuthKey]);
  useEffect(() => {
    if (settings.defaultRegisterId) setRegisterId(settings.defaultRegisterId);
  }, [settings.defaultRegisterId]);

  // Current log tracking
  const [currentLogId, setCurrentLogId] = useState(null);

  // UI ticker
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  // Check session on mount and handle inactivity timeout
  useEffect(() => {
    let activityInterval = null;
    
    const checkSession = async () => {
      try {
        const response = await authAPI.me();
        setUser(response.user);
        
        // Set up activity tracking to refresh session
        activityInterval = setInterval(async () => {
          try {
            await authAPI.me();
          } catch (err) {
            // Session expired - only log out if it's a real expiration
            if (err.message && !err.message.includes('Cannot connect') && !err.message.includes('Unauthorized')) {
              setUser(null);
              if (activityInterval) {
                clearInterval(activityInterval);
              }
            }
          }
        }, 60000); // Check every minute
      } catch (err) {
        // 401 Unauthorized is expected when not logged in - don't treat as error
        if (err.message && err.message.includes('Unauthorized')) {
          // User is not logged in - this is normal
          setUser(null);
        } else if (err.message && !err.message.includes('Cannot connect')) {
          // Other errors (not connection issues)
          setUser(null);
        }
        // Connection errors are ignored - server might not be running yet
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkSession();
    
    return () => {
      if (activityInterval) {
        clearInterval(activityInterval);
      }
    };
  }, []);

  // Filter transaction types based on user permissions
  const TRANS_TYPES = useMemo(() => {
    if (!user || !user.allowedTransactionTypes) {
      return ALL_TRANS_TYPES; // Show all if not logged in (will be blocked at execute)
    }
    return ALL_TRANS_TYPES.filter(type => user.allowedTransactionTypes.includes(type));
  }, [user]);

  // Ensure current transType is allowed
  useEffect(() => {
    if (user && user.allowedTransactionTypes && !user.allowedTransactionTypes.includes(transType)) {
      // Current type not allowed, switch to first allowed type
      const firstAllowed = TRANS_TYPES[0];
      if (firstAllowed) {
        setTransType(firstAllowed);
      }
    }
  }, [user, TRANS_TYPES, transType]);

  const clerkId = user?.username || "";

  // Amount normalization (always include .00)
  const formatAmount = (val) => {
    if (val === null || val === undefined || String(val).trim() === "") return "0.00";
    const s = String(val).trim();
    if (!s.includes(".")) return s + ".00";
    const [w, f = ""] = s.split(".");
    if (f.length === 0) return `${w}.00`;
    if (f.length === 1) return `${w}.${f}0`;
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

  // Persist
  useEffect(() => saveJSON(LS_KEYS.settings, settings), [settings]);
  useEffect(() => saveJSON(LS_KEYS.logs, logs), [logs]);
  useEffect(() => localStorage.setItem(LS_KEYS.counter, String(counter)), [counter]);

  // auth handlers
  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
  };
  
  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setUser(null);
    setShowUserManagement(false);
  };
  
  const handleUserUpdate = async () => {
    // Refresh user info after user management changes
    try {
      const response = await authAPI.me();
      setUser(response.user);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  };

  // Required fields per transaction type (FINAL)
  const requiredFor = useMemo(() => {
    const reg = settings.useRegisterIdSpelling; // "RegisterId" or "RegitsterId"
    return {
      Auth: ["PaymentType", "TransType", "Amount", "AuthKey", reg, "RefId"],
      Sale: ["PaymentType", "TransType", "Amount", "AuthKey", reg, "RefId"],
      ReferentialSale: [
        "PaymentType",
        "TransType",
        "Amount",
        "AuthKey",
        reg,
        "RefId",
        "Token",
        "ExpDate",
      ],
      Capture: [
        "PaymentType",
        "TransType",
        "Amount",
        "AuthKey",
        reg,
        "RefId",
        "AuthCode",
        "CustRef",
      ],
      Return: [
        "TransType",
        "Amount",
        "AuthKey",
        reg,
        "RefId",
        "PaymentType",
        "AuthCode",
      ],
      Reversal: ["TransType", "Amount", "AuthKey", reg, "RefId", "PaymentType"],
      Void: ["TransType", "Amount", "AuthKey", reg, "RefId", "PaymentType"],
      Settle: ["TransType", "AuthKey", reg],
      Ticket: [
        "TransType",
        "PaymentType",
        "Amount",
        "AuthKey",
        reg,
        "InvNum",
        "AuthCode",
        "Token",
        "ExpDate",
        "CardType",
        "TaxAmount",
        "DestZipCode",
      ],
    };
  }, [settings.useRegisterIdSpelling]);

  // Dynamic values for validation
  const valuesMap = useMemo(
    () => ({
      PaymentType: paymentType,
      TransType: transType,
      AmountRaw: amount,
      Amount: formatAmount(amount),
      AuthKey: authKey,
      [settings.useRegisterIdSpelling]: registerId,
      RefId: ["Capture", "Reversal", "Void"].includes(transType) ? refIdInput : "(auto timestamp)",
      InvNum: invNum,
      Token: token,
      Expiry: expiry,
      ExpDate: expiry, // Map expiry state to ExpDate for XML
      CardType: cardType,
      CustRef: custRef,
      AuthCode: authCode,
      TaxAmount: taxAmount,
      DestZipCode: destZipCode,
    }),
    [
      paymentType,
      transType,
      amount,
      authKey,
      registerId,
      refIdInput,
      invNum,
      token,
      expiry,
      cardType,
      custRef,
      authCode,
      taxAmount,
      destZipCode,
      settings.useRegisterIdSpelling,
    ]
  );

  // Missing required logic
  const missingRequired = useMemo(() => {
    const req = requiredFor[transType] || [];
      return req.filter((k) => {
      if (k === "Amount") return String(valuesMap.AmountRaw || "").trim() === ""; // use raw input
      if (k === settings.useRegisterIdSpelling) return String(registerId || "").trim() === "";
      if (k === "RefId") {
        const v = ["Capture", "Reversal", "Void"].includes(transType) ? refIdInput : "OK"; // auto for others
        return String(v || "").trim() === "";
      }
      // Map ExpDate to Expiry state variable for validation
      if (k === "ExpDate") {
        return !expiry || String(expiry).trim() === "";
      }
      // TaxAmount is computed, check if it exists and is valid
      if (k === "TaxAmount") {
        const val = taxAmount;
        return !val || String(val).trim() === "";
      }
      return !valuesMap[k] || String(valuesMap[k]).trim() === "";
    });
  }, [requiredFor, transType, valuesMap, registerId, refIdInput, expiry, taxAmount, settings.useRegisterIdSpelling]);

  const isMissing = (field) => missingRequired.includes(field);

  // Allowed tags per type (controls XML preview/output)
  const allowedTags = useMemo(() => {
    const keyReg = settings.useRegisterIdSpelling;
    switch (transType) {
      case "Settle":
        return new Set(["TransType", "AuthKey", keyReg]);
      case "Auth":
      case "Sale":
        return new Set([
          "PaymentType",
          "TransType",
          "Amount",
          "AuthKey",
          keyReg,
          "RefId",
          "InvNum",
          "ClerkId",
          "PrintReceipt",
          "SigCapture",
          "CardData",
          "TaxAmount",
          "LocalTaxFlag",
          "CustRef",
          "DestZipCode",
        ]);
      case "ReferentialSale":
        return new Set([
          "PaymentType",
          "TransType",
          "Amount",
          "AuthKey",
          keyReg,
          "RefId",
          "InvNum",
          "ClerkId",
          "PrintReceipt",
          "SigCapture",
          "CardData",
          "TaxAmount",
          "LocalTaxFlag",
          "CustRef",
          "DestZipCode",
          "Token",
          "ExpDate",
        ]);
      case "Capture":
        return new Set([
          "PaymentType",
          "TransType",
          "Amount",
          "AuthKey",
          keyReg,
          "RefId",
          "InvNum",
          "ClerkId",
          "CustRef",
          "DestZipCode",
          "TaxAmount",
          "LocalTaxFlag",
          "PrintReceipt",
          "SigCapture",
          "AuthCode",
        ]);
      case "Return":
        return new Set([
          "TransType",
          "Amount",
          "AuthKey",
          keyReg,
          "RefId",
          "PaymentType",
          "InvNum", // optional
          "ClerkId",
          "AuthCode",
          "PrintReceipt", // forced No
          "SigCapture", // forced No
          "CardType",
          "MastercardReturnOffline",
          "Token",
          "ExpDate",
        ]);
      case "Reversal":
        return new Set([
          "TransType",
          "Amount",
          "AuthKey",
          keyReg,
          "RefId",
          "PaymentType",
          "ReversalType",
          "ClerkId",
          "PrintReceipt", // forced No
          "SigCapture", // forced No
        ]);
      case "Void":
        return new Set([
          "TransType",
          "Amount",
          "AuthKey",
          keyReg,
          "RefId",
          "PaymentType",
          "ClerkId",
          "PrintReceipt", // forced No
          "SigCapture", // forced No
        ]);
      case "Ticket":
        return new Set([
          "TransType",
          "PaymentType",
          "Amount",
          "AuthKey",
          keyReg,
          "RefId",
          "InvNum",
          "AuthCode",
          "Token",
          "ExpDate",
          "CardType",
          "TaxAmount",
          "LocalTaxFlag",
          "PrintReceipt",
          "SigCapture",
          "CustRef",
          "DestZipCode",
        ]);
      default:
        return new Set();
    }
  }, [transType, settings.useRegisterIdSpelling]);

  // Build XML for a given RefId
  const buildXml = (refIdForXml) => {
    const keyReg = settings.useRegisterIdSpelling;
    const parts = [];
    const pushTag = (name, value) => {
      if (!allowedTags.has(name)) return;
      if (value === undefined || value === null) return;
      if (String(value).trim() === "") return;
      parts.push(`<${name}>${escapeXml(String(value))}</${name}>`);
    };

    const formattedAmount = formatAmount(amount);
    const finalRefId = ["Capture", "Reversal", "Void"].includes(transType)
      ? refIdInput.trim()
      : refIdForXml || makeRefIdTimestamp();

    pushTag("PaymentType", paymentType);
    pushTag("TransType", transType === "ReferentialSale" ? "Sale" : transType);
    pushTag("Amount", formattedAmount);
    pushTag("AuthKey", authKey);
    pushTag(keyReg, registerId);
    if (transType !== "Settle") pushTag("RefId", finalRefId);
    pushTag("InvNum", invNum);
    pushTag("ClerkId", clerkId);

    // Properties-only fields (still included where allowed)
    const forceNo = ["Capture", "Return", "Reversal", "Void"].includes(transType) ? "No" : printReceipt;
    const forceNoSig = ["Capture", "Return", "Reversal", "Void"].includes(transType) ? "No" : sigCapture;
    pushTag("PrintReceipt", forceNo);
    pushTag("SigCapture", forceNoSig);
    if (cardData) pushTag("CardData", cardData);
    if (transType !== "Settle") {
      pushTag("TaxAmount", taxAmount);
      pushTag("LocalTaxFlag", settings.localTaxFlag);
    }

    // Optional/conditional
    pushTag("CustRef", custRef);
    pushTag("DestZipCode", destZipCode);
    if (transType === "ReferentialSale") {
      pushTag("Token", token);
      pushTag("ExpDate", expiry);
    }
    if (transType === "Ticket") {
      pushTag("Token", token);
      pushTag("ExpDate", expiry);
      pushTag("CardType", cardType);
      pushTag("AuthCode", authCode);
    }
    if (["Capture", "Return"].includes(transType)) pushTag("AuthCode", authCode);
    if (transType === "Reversal") pushTag("ReversalType", reversalType);
    if (transType === "Return") {
      pushTag("CardType", cardType);
      pushTag("MastercardReturnOffline", "On");
      pushTag("Token", token);
      pushTag("ExpDate", expiry);
    }

    return `<request>${parts.join("")}</request>`;
  };

  const buildUrl = (refIdForXml) => settings.baseUrl + encodeURIComponent(buildXml(refIdForXml));

  // Show/hide fields in Build section (not XML)
  const shouldShowField = (field) => {
    if (transType === "Settle") {
      return ["TransType", "AuthKey", settings.useRegisterIdSpelling].includes(field);
    }
    if (transType === "Auth" && ["AuthCode", "Token", "Expiry"].includes(field)) return false;
    if ((transType === "Capture" || transType === "Reversal" || transType === "Void") && ["Token", "Expiry"].includes(field)) return false;
    if (transType === "Sale" && ["AuthCode", "Token", "Expiry"].includes(field)) return false;
    // Return allows Token and Expiry
    // CardType shows for Ticket and Return
    if (field === "CardType" && transType !== "Ticket" && transType !== "Return") return false;
    // Hide from Build: controlled in Properties
    if (["PrintReceipt", "SigCapture", "CardData", "TaxAmount", "LocalTaxFlag", "ClerkId"].includes(field)) return false;
    return true;
  };

  // Clear selected fields when switching TransType (only if visible for the new type)
  const prevTransTypeRef = useRef(transType);
  useEffect(() => {
    if (prevTransTypeRef.current !== transType) {
      const clearIfVisible = (field, clear) => {
        try {
          if (shouldShowField(field)) clear();
        } catch {}
      };
      clearIfVisible("Amount", () => setAmount(""));
      clearIfVisible("Address", () => setAddress(""));
      clearIfVisible("Zip", () => setZip(""));
      clearIfVisible("CustRef", () => setCustRef(""));
      clearIfVisible("DestZipCode", () => setDestZipCode(""));
      clearIfVisible("AuthCode", () => setAuthCode(""));
      clearIfVisible("Token", () => setToken(""));
      clearIfVisible("Expiry", () => setExpiry(""));
      clearIfVisible("CardType", () => setCardType(""));
      prevTransTypeRef.current = transType;
    }
  }, [transType]);

  // Auto-save log entry via API
  const autoSaveLogEntry = async (logEntry) => {
    // Only save completed transactions (not "listening" status)
    if (logEntry.status === "listening") {
      return;
    }

    try {
      const result = await logsAPI.write(logEntry);
      if (result.success) {
        console.log("Successfully wrote log entry via API");
      } else {
        console.error("API log write failed:", result.error);
      }
    } catch (e) {
      console.error("API log write error:", e);
    }
  };

  // Can execute?
  const canExecute = !!user && missingRequired.length === 0;

  // Execute
  const execute = async () => {
    if (!user) return alert("Please log in first.");
    if (missingRequired.length) return;

    const finalRefId = ["Capture", "Reversal", "Void"].includes(transType)
      ? refIdInput.trim()
      : makeRefIdTimestamp();
    const url = buildUrl(finalRefId);
    const awaitUntilMs = Date.now() + 60_000;

    const logEntry = {
      id: `${Date.now()}_${finalRefId}`,
      timestamp: new Date().toISOString(),
      user: clerkId,
      transType,
      amount: formatAmount(amount),
      refId: finalRefId,
      requestXml: buildXml(finalRefId),
      requestUrl: url,
      responseCaptured: null,
      status: "listening",
      awaitUntilMs,
    };
    setLogs((prev) => [logEntry, ...prev]);
    setCurrentLogId(logEntry.id);
    setCounter((c) => c + 1); // historical only

    // Set up timeout
    const timeoutId = setTimeout(() => {
      const timeoutEntry = {
        ...logEntry,
        status: "timeout",
        responseCaptured: "Request timed out after 60 seconds",
        awaitUntilMs: undefined,
      };
      setLogs((prev) =>
        prev.map((l) => {
          if (l.id === logEntry.id && l.status === "listening") {
            return timeoutEntry;
          }
          return l;
        })
      );
      // Auto-save timeout entry
      autoSaveLogEntry(timeoutEntry);
    }, 60_000);

    // Submit the request using fetch
    try {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 60_000);

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        mode: "cors", // Try CORS first - if gateway supports it, we can read the response
      });

      clearTimeout(fetchTimeout);
      clearTimeout(timeoutId);

      let responseText = "";
      if (response.ok) {
        try {
          responseText = await response.text();
        } catch (e) {
          responseText = `Error reading response body: ${e.message}`;
        }
      } else {
        responseText = `HTTP ${response.status}: ${response.statusText}`;
      }

      // Update log with captured response
      const updatedEntry = {
        ...logEntry,
        status: "captured",
        responseCaptured: responseText || "Empty response received",
        awaitUntilMs: undefined,
      };
      setLogs((prev) =>
        prev.map((l) => {
          if (l.id === logEntry.id) {
            return updatedEntry;
          }
          return l;
        })
      );
      // Auto-save updated log entry
      autoSaveLogEntry(updatedEntry);
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Check if it's a timeout or other error
      let updatedEntry;
      if (error.name === "AbortError") {
        updatedEntry = {
          ...logEntry,
          status: "timeout",
          responseCaptured: "Request timed out after 60 seconds",
          awaitUntilMs: undefined,
        };
        setLogs((prev) =>
          prev.map((l) => {
            if (l.id === logEntry.id) {
              return updatedEntry;
            }
            return l;
          })
        );
      } else {
        // Other error (network, CORS, etc.)
        let errorMessage = error.message || "Failed to fetch response";
        if (error.message && error.message.includes("CORS")) {
          errorMessage = "CORS error: Gateway does not allow cross-origin requests. The request may have been submitted but the response cannot be read. Check the gateway manually or use the relay option.";
        } else if (error.message && error.message.includes("network")) {
          errorMessage = "Network error: Unable to connect to the gateway. Please check your connection.";
        }
        updatedEntry = {
          ...logEntry,
          status: "error",
          responseCaptured: `Error: ${errorMessage}`,
          awaitUntilMs: undefined,
        };
        setLogs((prev) =>
          prev.map((l) => {
            if (l.id === logEntry.id) {
              return updatedEntry;
            }
            return l;
          })
        );
      }
      // Auto-save updated log entry
      autoSaveLogEntry(updatedEntry);
    }
  };




  const clearLogs = () => {
    if (!confirm("Clear all logs?")) return;
    setLogs([]);
    try {
      localStorage.removeItem(LS_KEYS.logs);
    } catch {}
  };

  const missingSummary = missingRequired.length ? `Missing required: ${missingRequired.join(", ")}` : "";

  // Show login page if not authenticated
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show user management if requested
  if (showUserManagement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          <header className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-800">User Management</h1>
            <div className="flex items-center gap-3">
              <button
                className="px-3 py-1 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                onClick={() => setShowUserManagement(false)}
              >
                Back to App
              </button>
              <button className="px-3 py-1 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors" onClick={handleLogout}>
                Sign out
              </button>
            </div>
          </header>
          <UserManagement currentUser={user} onUserUpdate={handleUserUpdate} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 text-gray-900">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800">Curbstone Transaction Builder</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">
              Signed in as <strong className="text-gray-900">{user.username}</strong>
              {user.role === 'admin' && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">ADMIN</span>}
            </span>
            {user.role === 'admin' && (
              <button
                className="px-3 py-1 rounded-xl bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                onClick={() => setShowUserManagement(true)}
              >
                User Management
              </button>
            )}
            <button className="px-3 py-1 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        {/* Properties / Defaults */}
        <details className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-4 border border-gray-200" open>
          <summary className="cursor-pointer font-medium text-gray-800">Properties & Defaults</summary>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Default AuthKey</span>
              <input
                className="px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                value={settings.defaultAuthKey}
                onChange={(e) => setSettings({ ...settings, defaultAuthKey: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Default {settings.useRegisterIdSpelling}</span>
              <input
                className="px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                value={settings.defaultRegisterId}
                onChange={(e) => setSettings({ ...settings, defaultRegisterId: e.target.value })}
              />
            </label>

            {/* Only here: PrintReceipt, SigCapture; computed previews */}
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">PrintReceipt</span>
              <select className="px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors" value={printReceipt} onChange={(e) => setPrintReceipt(e.target.value)}>
                {YES_NO.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">SigCapture</span>
              <select className="px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors" value={sigCapture} onChange={(e) => setSigCapture(e.target.value)}>
                {YES_NO.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </label>

            {/* Tax controls */}
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Tax mode</span>
              <div className="flex gap-3 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="taxmode"
                    checked={settings.taxMode === "rate"}
                    onChange={() => setSettings({ ...settings, taxMode: "rate" })}
                  />{" "}
                  Rate (%)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="taxmode"
                    checked={settings.taxMode === "amount"}
                    onChange={() => setSettings({ ...settings, taxMode: "amount" })}
                  />{" "}
                  Amount
                </label>
              </div>
            </div>
            {settings.taxMode === "rate" ? (
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-700">Tax rate (%)</span>
                <input
                  type="number"
                  className="px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                  value={settings.taxRatePct}
                  onChange={(e) => setSettings({ ...settings, taxRatePct: Number(e.target.value || 0) })}
                />
              </label>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="text-sm text-gray-700">Tax amount (&lt;TaxAmount&gt;)</span>
                <input
                  type="number"
                  className="px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                  value={settings.taxAmountOverride}
                  onChange={(e) => setSettings({ ...settings, taxAmountOverride: e.target.value })}
                />
              </label>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">LocalTaxFlag</span>
              <input
                className="px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                value={settings.localTaxFlag}
                onChange={(e) => setSettings({ ...settings, localTaxFlag: e.target.value })}
              />
            </label>

            {/* Computed previews */}
            <LabeledReadOnly label="CardData (computed)" value={cardData || ""} />
            <LabeledReadOnly label="TaxAmount (computed)" value={taxAmount} />

            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Execute behavior</span>
              <select
                className="px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                value={settings.executeBehavior}
                onChange={(e) => setSettings({ ...settings, executeBehavior: e.target.value })}
              >
                <option value="iframe">Load in iframe</option>
                <option value="newtab">Open new tab</option>
                <option value="both">Both (reliable)</option>
              </select>
            </label>

            {/* Optional relay settings */}
            <label className="flex flex-col gap-1">
              <span className="text-sm text-gray-700">Response Relay URL</span>
              <input
                className="px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
                placeholder="https://your-worker.workers.dev"
                value={settings.relayCaptureUrl}
                onChange={(e) => setSettings({ ...settings, relayCaptureUrl: e.target.value })}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!settings.relayOnLoaded}
                onChange={(e) => setSettings({ ...settings, relayOnLoaded: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Auto-capture via relay when cross-origin page loads</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!settings.relayOnExecute}
                onChange={(e) => setSettings({ ...settings, relayOnExecute: e.target.checked })}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Kick off relay immediately at Execute</span>
            </label>
          </div>
        </details>

        {/* Build Transaction (reordered) */}
        <section className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-4 space-y-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-800">Build Transaction</h2>
            {missingRequired.length > 0 && (
              <div className="text-xs text-rose-600 font-medium" title={missingSummary}>
                {missingSummary}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Row 1 */}
            <LabeledSelect
              label="TransType"
              value={transType}
              onChange={setTransType}
              options={TRANS_TYPES}
              required={true}
              missing={isMissing("TransType")}
            />
            {shouldShowField("PaymentType") && (
              <LabeledSelect
                label="PaymentType"
                value={paymentType}
                onChange={setPaymentType}
                options={PAYMENT_TYPES}
                required={requiredFor[transType]?.includes("PaymentType")}
                missing={isMissing("PaymentType")}
              />
            )}
            {shouldShowField("InvNum") && (
              <LabeledInput
                label="Invoice Number (InvNum)"
                value={invNum}
                onChange={setInvNum}
                placeholder={
                  requiredFor[transType]?.includes("InvNum") && isMissing("InvNum") ? "Required" : undefined
                }
                missing={isMissing("InvNum")}
              />
            )}

            {/* Row 2 */}
            {shouldShowField("Amount") && (
              <LabeledInput
                label="Amount"
                value={amount}
                onChange={setAmount}
                type="number"
                placeholder={isMissing("Amount") ? "Required" : "e.g., 1.00"}
                required={requiredFor[transType]?.includes("Amount")}
                missing={isMissing("Amount")}
                disabled={false}
              />
            )}
            {shouldShowField("Address") && (
              <LabeledInput label="Address" value={address} onChange={setAddress} placeholder="Optional" />
            )}
            {shouldShowField("Zip") && (
              <LabeledInput label="Zip" value={zip} onChange={setZip} placeholder="Optional" />
            )}

            {/* Row 3 */}
            {shouldShowField("CustRef") && (
              <LabeledInput
                label="Customer Number (CustRef)"
                value={custRef}
                onChange={setCustRef}
                placeholder={
                  requiredFor[transType]?.includes("CustRef") && isMissing("CustRef") ? "Required" : "Optional"
                }
                required={requiredFor[transType]?.includes("CustRef")}
                missing={isMissing("CustRef")}
              />
            )}
            {shouldShowField("DestZipCode") && (
              <LabeledInput
                label="Destination Zip (DestZipCode)"
                value={destZipCode}
                onChange={setDestZipCode}
                placeholder="Optional"
              />
            )}
            {["Capture", "Reversal", "Void"].includes(transType) ? (
              <LabeledInput
                label="MFUKEY (RefId)"
                value={refIdInput}
                onChange={setRefIdInput}
                placeholder={isMissing("RefId") ? "Required" : "Previous RefId"}
                required={true}
                missing={isMissing("RefId")}
              />
            ) : (
              <LabeledReadOnly label="MFUKEY (RefId)" value="auto (timestamp at Execute)" />
            )}

            {/* Row 4 */}
            {shouldShowField("AuthKey") && (
              <LabeledInput
                label="AuthKey"
                value={authKey}
                onChange={setAuthKey}
                placeholder={isMissing("AuthKey") ? "Required" : undefined}
                required={requiredFor[transType]?.includes("AuthKey")}
                missing={isMissing("AuthKey")}
              />
            )}
            {shouldShowField(settings.useRegisterIdSpelling) && (
              <LabeledInput
                label={settings.useRegisterIdSpelling}
                value={registerId}
                onChange={setRegisterId}
                placeholder={isMissing(settings.useRegisterIdSpelling) ? "Required" : undefined}
                required={requiredFor[transType]?.includes(settings.useRegisterIdSpelling)}
                missing={isMissing(settings.useRegisterIdSpelling)}
              />
            )}

            {/* Optional/conditional */}
            {shouldShowField("AuthCode") && (
              <LabeledInput
                label="AuthCode"
                value={authCode}
                onChange={setAuthCode}
                placeholder={
                  requiredFor[transType]?.includes("AuthCode") && isMissing("AuthCode") ? "Required" : "Optional"
                }
                required={requiredFor[transType]?.includes("AuthCode")}
                missing={isMissing("AuthCode")}
              />
            )}
            {shouldShowField("Token") && (
              <LabeledInput
                label="Token"
                value={token}
                onChange={setToken}
                placeholder={requiredFor[transType]?.includes("Token") && isMissing("Token") ? "Required" : "Optional"}
                required={requiredFor[transType]?.includes("Token")}
                missing={isMissing("Token")}
              />
            )}
            {shouldShowField("Expiry") && (
              <LabeledInput
                label="ExpDate"
                value={expiry}
                onChange={setExpiry}
                placeholder={
                  requiredFor[transType]?.includes("ExpDate") && isMissing("ExpDate") ? "Required (MMYY)" : "MMYY"
                }
                required={requiredFor[transType]?.includes("ExpDate")}
                missing={isMissing("ExpDate")}
              />
            )}
            {shouldShowField("CardType") && (
              <LabeledInput
                label="CardType"
                value={cardType}
                onChange={setCardType}
                placeholder={
                  requiredFor[transType]?.includes("CardType") && isMissing("CardType") ? "Required" : "Optional"
                }
                required={requiredFor[transType]?.includes("CardType")}
                missing={isMissing("CardType")}
              />
            )}
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-3 text-xs font-mono overflow-auto border border-gray-200">
            <div className="text-gray-500 mb-1 font-medium">XML preview</div>
            <pre className="whitespace-pre-wrap text-gray-700">
              {buildXml(["Capture", "Reversal", "Void"].includes(transType) ? refIdInput : makeRefIdTimestamp())}
            </pre>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={execute}
              disabled={!canExecute}
              title={missingSummary}
              className={`px-4 py-2 rounded-2xl text-white font-medium transition-all ${
                canExecute ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg" : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Execute
            </button>
            <a
              className="px-4 py-2 rounded-2xl bg-gradient-to-r from-gray-700 to-gray-800 text-white hover:from-gray-800 hover:to-gray-900 shadow-md hover:shadow-lg transition-all font-medium"
              href={buildUrl(["Capture", "Reversal", "Void"].includes(transType) ? (refIdInput || makeRefIdTimestamp()) : makeRefIdTimestamp())}
              target="_blank"
              rel="noreferrer"
            >
              Open in new tab
            </a>
          </div>
        </section>

        {/* Logs */}
        <section className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-4 space-y-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-800">Transaction Logs</h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-emerald-600 font-medium">Auto-save: Active (Server)</span>
              <button onClick={clearLogs} className="px-3 py-2 rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors font-medium">
                Clear logs
              </button>
            </div>
          </div>
          <div className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
            <strong>Auto-save active:</strong> All transactions are automatically saved to the server LOGS folder.
          </div>
          {logs.length === 0 ? (
            <div className="text-sm text-gray-500">No logs yet.</div>
          ) : (
            <div className="overflow-auto border border-gray-200 rounded-xl shadow-inner">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <Th>Time</Th>
                    <Th>User</Th>
                    <Th>Type</Th>
                    <Th>Amount</Th>
                    <Th>RefId</Th>
                    <Th>Request (XML)</Th>
                    <Th>Response (captured / status)</Th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => {
                    const remaining =
                      l.awaitUntilMs && l.status === "listening"
                        ? Math.max(0, Math.ceil((l.awaitUntilMs - nowTs) / 1000))
                        : 0;
                    return (
                      <tr key={l.id} className="border-t align-top">
                        <Td>{new Date(l.timestamp).toLocaleString()}</Td>
                        <Td>{l.user}</Td>
                        <Td>{l.transType}</Td>
                        <Td>{l.amount}</Td>
                        <Td>{String(l.refId)}</Td>
                        <Td>
                          <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-50 p-2 rounded border border-gray-200 text-gray-700">{l.requestXml}</pre>
                          <details className="mt-1">
                            <summary className="text-xs text-gray-500 cursor-pointer">Full URL</summary>
                            <a className="text-xs text-blue-600 hover:text-blue-700 underline break-all" href={l.requestUrl} target="_blank" rel="noreferrer">
                              {l.requestUrl}
                            </a>
                          </details>
                        </Td>
                        <Td>
                          {l.status === "listening" && remaining > 0 && (
                            <div className="text-xs text-amber-600 font-medium">Listening� {remaining}s</div>
                          )}
                          {l.status === "timeout" && !l.responseCaptured && (
                            <div className="text-xs text-gray-500">Timed out.</div>
                          )}
                          {l.status === "loaded" && !l.responseCaptured && (
                            <div className="text-xs text-gray-500">Loaded (cross-origin).</div>
                          )}
                          <pre className="text-xs font-mono whitespace-pre-wrap mt-1 text-gray-700">
                            {l.responseCaptured || (l.status === "listening" ? "(awaiting response�)" : "(not captured)")}
                          </pre>
                        </Td>
                      </tr>
                    );
                  })}
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
function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  missing = false,
  disabled = false,
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm flex items-center gap-2 text-gray-700">
        {label}
        {required && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${missing ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-600"}`}>
            Required
          </span>
        )}
      </span>
      <input
        className={`px-3 py-2 rounded-xl border transition-colors ${missing ? "border-rose-400 ring-2 ring-rose-100 bg-rose-50" : "border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"}`}
        type={type}
        placeholder={placeholder}
        value={value}
        aria-required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function LabeledReadOnly({ label, value }) {
  return (
    <label className="flex flex-col gap-1 opacity-80">
      <span className="text-sm text-gray-700">{label}</span>
      <input className="px-3 py-2 rounded-xl border bg-gray-100 text-gray-600" readOnly value={value} />
    </label>
  );
}
function LabeledSelect({ label, value, onChange, options, required = false, missing = false }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm flex items-center gap-2 text-gray-700">
        {label}
        {required && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${missing ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-600"}`}>
            Required
          </span>
        )}
      </span>
      <select
        className={`px-3 py-2 rounded-xl border transition-colors ${missing ? "border-rose-400 ring-2 ring-rose-100 bg-rose-50" : "border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
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
  if (/[",\r\n]/.test(str)) {
    return '"' + str.replaceAll('"', '""') + '"';
  }
  return str;
}