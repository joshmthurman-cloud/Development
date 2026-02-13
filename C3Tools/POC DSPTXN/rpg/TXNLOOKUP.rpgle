**FREE
//----------------------------------------------------------------------
// TXNLOOKUP - C3 IWS POC: Lookup one transaction by MFUKEY, return JSON
// GET /api/txns/{mfukey}  ->  p_mfukey (15), p_httpStatus, p_json
// Compile as SQLRPGLE (embedded SQL). Bind JSON_ESCAPE from copybook.
//----------------------------------------------------------------------
Ctl-Opt DFTACTGRP(*NO) BNDDIR('QC2LE') ACTGRP(*NEW);
Ctl-Opt Option(*NoDebugIO:*SrcStmt);

// JsonEscape prototype (body in JSON_ESCAPE.rpgleinc)
Dcl-Pr JsonEscape ExtProc;
  inStr  Char(1000) Const;
  inLen  Int(10) Const;
  outStr Char(2000);
  outLen Int(10);
End-Pr;

// Program parameters (IWS maps GET /api/txns/{mfukey})
Dcl-Pi TXNLOOKUP ExtPgm;
  p_mfukey    Char(15) Const;
  p_httpStatus Int(10);
  p_json      VarChar(32000);
  p_errmsg    VarChar(256) Options(*NoPass);
  p_requestId VarChar(64) Options(*NoPass);
End-Pi;

Dcl-S workKey   Char(15);
Dcl-S msg       VarChar(256);
Dcl-S reqId     VarChar(64);
Dcl-S escaped   Char(2000);
Dcl-S escLen    Int(10);
Dcl-S len       Int(10);
Dcl-S first     Ind Inz(*On);

// Host structure for SELECT (59 columns; $ columns as MF_xxx)
Dcl-Ds row Qualified;
  MFUKEY   Char(15);
  MFCUST   Char(256);
  MFTYPE   Char(256);
  MFTYP2   Char(256);
  MFRTRN   Char(256);
  MFDATE   Char(256);
  MFTIME   Char(256);
  MFUSER   Char(256);
  MFCARD   Char(256);
  MFEDAT   Char(256);
  MFMRCH   Char(256);
  MFADD1   Char(256);
  MFZIPC   Char(256);
  MFORDR   Char(256);
  MFREFR   Char(256);
  MFAMT1   Char(256);
  MFSETR   Char(256);
  MFMETH   Char(256);
  MFAMT2   Char(256);
  MFLTXF   Char(256);
  MFDSTZ   Char(256);
  MFAPPR   Char(256);
  MFKEYP   Char(256);
  MFRTXT   Char(256);
  MFRAVS   Char(256);
  MFRCVV   Char(256);
  MF_RAQ   Char(256);   // "MF$RAQ"
  MF_FTS   Char(256);   // "MF$FTS"
  MFREQN   Char(256);
  MFNUMB   Char(256);
  MFSETD   Char(256);
  MFSETT   Char(256);
  MFPRCD   Char(256);
  MFPRCT   Char(256);
  MFCHKT   Char(256);
  MF_SLD   Char(256);   // "MF$SLD"
  MF_SLG   Char(256);   // "MF$SLG"
  MF_LVD   Char(256);   // "MF$LVD"
  MF_RVG   Char(256);   // "MF$RVG"
  MFTRK1   Char(256);
  MFXTRA   Char(256);
  MFRVNA   Char(256);
  MFACNL   Char(256);
  MFDATA   Char(256);
  MFUSDA   Char(256);
  MFUSDB   Char(256);
  MFUSDC   Char(256);
  MFUSD1   Char(256);
  MFUSD2   Char(256);
  MFUSD3   Char(256);
  MFUSD4   Char(256);
  MFUSD5   Char(256);
  MFUSD6   Char(256);
  MFUSD7   Char(256);
  MFUSD8   Char(256);
  MFUSD9   Char(256);
  MFVALU   Char(256);
  MFADD2   Char(256);
  MFSTID   Char(256);
End-Ds;

// Optional params
If %Parms() >= 4;
  p_errmsg = '';
EndIf;
If %Parms() >= 5;
  p_requestId = '';
  reqId = p_requestId;
EndIf;

p_httpStatus = 500;
p_json = '';
workKey = %Trim(p_mfukey);

// --- Validation: blank -> 400
If workKey = '';
  p_httpStatus = 400;
  p_json = '{"status":"error","error":"invalid_request","message":"MFUKEY is required"}';
  Return;
EndIf;

// --- Validation: length must be 15 -> 400
If %Len(workKey) <> 15;
  p_httpStatus = 400;
  p_json = '{"status":"error","error":"invalid_request","message":"MFUKEY must be exactly 15 characters"}';
  Return;
EndIf;

// --- SQL: single row by MFUKEY (parameterized)
Exec SQL
  SELECT MFUKEY, MFCUST, MFTYPE, MFTYP2, MFRTRN, MFDATE, MFTIME, MFUSER, MFCARD, MFEDAT,
         MFMRCH, MFADD1, MFZIPC, MFORDR, MFREFR, MFAMT1, MFSETR, MFMETH, MFAMT2, MFLTXF,
         MFDSTZ, MFAPPR, MFKEYP, MFRTXT, MFRAVS, MFRCVV,
         "MF$RAQ", "MF$FTS", MFREQN, MFNUMB, MFSETD, MFSETT, MFPRCD, MFPRCT, MFCHKT,
         "MF$SLD", "MF$SLG", "MF$LVD", "MF$RVG",
         MFTRK1, MFXTRA, MFRVNA, MFACNL, MFDATA, MFUSDA, MFUSDB, MFUSDC,
         MFUSD1, MFUSD2, MFUSD3, MFUSD4, MFUSD5, MFUSD6, MFUSD7, MFUSD8, MFUSD9,
         MFVALU, MFADD2, MFSTID
  INTO :row.MFUKEY, :row.MFCUST, :row.MFTYPE, :row.MFTYP2, :row.MFRTRN, :row.MFDATE,
       :row.MFTIME, :row.MFUSER, :row.MFCARD, :row.MFEDAT, :row.MFMRCH, :row.MFADD1,
       :row.MFZIPC, :row.MFORDR, :row.MFREFR, :row.MFAMT1, :row.MFSETR, :row.MFMETH,
       :row.MFAMT2, :row.MFLTXF, :row.MFDSTZ, :row.MFAPPR, :row.MFKEYP, :row.MFRTXT,
       :row.MFRAVS, :row.MFRCVV, :row.MF_RAQ, :row.MF_FTS, :row.MFREQN, :row.MFNUMB,
       :row.MFSETD, :row.MFSETT, :row.MFPRCD, :row.MFPRCT, :row.MFCHKT,
       :row.MF_SLD, :row.MF_SLG, :row.MF_LVD, :row.MF_RVG,
       :row.MFTRK1, :row.MFXTRA, :row.MFRVNA, :row.MFACNL, :row.MFDATA,
       :row.MFUSDA, :row.MFUSDB, :row.MFUSDC, :row.MFUSD1, :row.MFUSD2, :row.MFUSD3,
       :row.MFUSD4, :row.MFUSD5, :row.MFUSD6, :row.MFUSD7, :row.MFUSD8, :row.MFUSD9,
       :row.MFVALU, :row.MFADD2, :row.MFSTID
  FROM C3.C3V9020_API
  WHERE MFUKEY = :workKey;

If SQLCODE = 100;
  p_httpStatus = 404;
  p_json = '{"status":"not_found","mfukey":"' + %Trim(workKey) + '"}';
  Return;
EndIf;
If SQLCODE <> 0;
  If %Parms() >= 4;
    msg = 'SQLCODE ' + %Char(SQLCODE);
    p_errmsg = msg;
  EndIf;
  p_httpStatus = 500;
  p_json = '{"status":"error","error":"system_error","requestId":"' + %Trim(reqId) + '"}';
  Return;
EndIf;

// --- Build 200 OK JSON (all fields as strings; escape each value)
p_json = '{"status":"ok","mfukey":"' + %Trim(row.MFUKEY) + '","record":{';
first = *On;

// Helper to append one field (name, value)
// We'll inline the append logic for each field to avoid a 59-param procedure

Monitor;
  // MFCUST
  AddField('MFCUST' : row.MFCUST);
  AddField('MFTYPE' : row.MFTYPE);
  AddField('MFTYP2' : row.MFTYP2);
  AddField('MFRTRN' : row.MFRTRN);
  AddField('MFDATE' : row.MFDATE);
  AddField('MFTIME' : row.MFTIME);
  AddField('MFUSER' : row.MFUSER);
  AddField('MFCARD' : row.MFCARD);
  AddField('MFEDAT' : row.MFEDAT);
  AddField('MFMRCH' : row.MFMRCH);
  AddField('MFADD1' : row.MFADD1);
  AddField('MFZIPC' : row.MFZIPC);
  AddField('MFORDR' : row.MFORDR);
  AddField('MFREFR' : row.MFREFR);
  AddField('MFAMT1' : row.MFAMT1);
  AddField('MFSETR' : row.MFSETR);
  AddField('MFMETH' : row.MFMETH);
  AddField('MFAMT2' : row.MFAMT2);
  AddField('MFLTXF' : row.MFLTXF);
  AddField('MFDSTZ' : row.MFDSTZ);
  AddField('MFAPPR' : row.MFAPPR);
  AddField('MFKEYP' : row.MFKEYP);
  AddField('MFRTXT' : row.MFRTXT);
  AddField('MFRAVS' : row.MFRAVS);
  AddField('MFRCVV' : row.MFRCVV);
  AddField('MF$RAQ' : row.MF_RAQ);
  AddField('MF$FTS' : row.MF_FTS);
  AddField('MFREQN' : row.MFREQN);
  AddField('MFNUMB' : row.MFNUMB);
  AddField('MFSETD' : row.MFSETD);
  AddField('MFSETT' : row.MFSETT);
  AddField('MFPRCD' : row.MFPRCD);
  AddField('MFPRCT' : row.MFPRCT);
  AddField('MFCHKT' : row.MFCHKT);
  AddField('MF$SLD' : row.MF_SLD);
  AddField('MF$SLG' : row.MF_SLG);
  AddField('MF$LVD' : row.MF_LVD);
  AddField('MF$RVG' : row.MF_RVG);
  AddField('MFTRK1' : row.MFTRK1);
  AddField('MFXTRA' : row.MFXTRA);
  AddField('MFRVNA' : row.MFRVNA);
  AddField('MFACNL' : row.MFACNL);
  AddField('MFDATA' : row.MFDATA);
  AddField('MFUSDA' : row.MFUSDA);
  AddField('MFUSDB' : row.MFUSDB);
  AddField('MFUSDC' : row.MFUSDC);
  AddField('MFUSD1' : row.MFUSD1);
  AddField('MFUSD2' : row.MFUSD2);
  AddField('MFUSD3' : row.MFUSD3);
  AddField('MFUSD4' : row.MFUSD4);
  AddField('MFUSD5' : row.MFUSD5);
  AddField('MFUSD6' : row.MFUSD6);
  AddField('MFUSD7' : row.MFUSD7);
  AddField('MFUSD8' : row.MFUSD8);
  AddField('MFUSD9' : row.MFUSD9);
  AddField('MFVALU' : row.MFVALU);
  AddField('MFADD2' : row.MFADD2);
  AddField('MFSTID' : row.MFSTID);
  p_json += '}}';
  p_httpStatus = 200;
On-Error;
  p_httpStatus = 500;
  p_json = '{"status":"error","error":"system_error","requestId":"' + %Trim(reqId) + '"}';
EndMon;
Return;

//----------------------------------------------------------------------
// Add one "name": "escaped_value" to p_json (with leading comma if not first)
//----------------------------------------------------------------------
Dcl-Proc AddField;
  Dcl-Pi *n;
    fname Char(32) Const;
    fval  Char(256) Const;
  End-Pi;
  Dcl-S v Char(256);
  len = %Len(%Trim(fval));
  If first;
    first = *Off;
  Else;
    p_json += ',';
  EndIf;
  p_json += '"' + %Trim(fname) + '":"';
  If len > 0;
    JsonEscape(fval : len : escaped : escLen);
    p_json += %Subst(escaped : 1 : escLen);
  EndIf;
  p_json += '"';
  Return;
End-Proc AddField;

/COPY JSON_ESCAPE
