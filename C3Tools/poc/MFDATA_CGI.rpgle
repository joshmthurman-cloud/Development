**FREE
//**********************************************************************
// MFDATA_CGI - RPG CGI program for web server
// READS from physical file C3FP3020 and returns records as JSON (read-only)
// Record format C39020. Library list must include file lib.
// Bind: CRTPGM ... BNDSRVPGM(QHTTPSVR/QZHBCGI)
// URL: http://10.110.0.224:10010/cgi-bin/mfdata_cgi (or your ScriptAlias)
//**********************************************************************
ctl-opt main(MFDATA_CGI) datfmt(*iso) timfmt(*iso);

// API error code structure (template so prototype can use likeds)
dcl-ds apiErr qualified template;
  bytesProv   int(10) inz(16);
  bytesAvail  int(10) inz(0);
  msgId       char(7);
  reserved    char(1);
end-ds;

// QtmhWrStout - write to HTTP stdout (QHTTPSVR/QZHBCGI)
dcl-pr QtmhWrStout extproc('QtmhWrStout');
  data        pointer value;
  dataLen     int(10) value;
  errCode     likeds(apiErr);
end-pr;

dcl-ds apiErrData likeds(apiErr);

  // Work fields (fixed-length buf so %addr points to character data for QtmhWrStout)
dcl-s CRLF     char(2) inz(x'0d25');
dcl-s buf      char(64000);
dcl-s bufLen   int(10);
dcl-s firstRec ind inz(*on);

  // Physical file C3FP3020 - input only (read). Read into file buffer (no LIKEREC).
dcl-f c3fp3020 usage(*input);

//**********************************************************************
// Main - read C3FP3020 and write HTTP response with JSON table data
//**********************************************************************
dcl-proc MFDATA_CGI;

  // 1. HTTP headers
  buf = 'HTTP/1.0 200 OK' + CRLF +
        'Content-Type: application/json; charset=UTF-8' + CRLF +
        'Cache-Control: no-cache' + CRLF + CRLF;
  bufLen = %len(%trimr(buf));
  QtmhWrStout(%addr(buf) : bufLen : apiErrData);

  // 2. JSON opening
  buf = '{"rows": [';
  bufLen = %len(%trimr(buf));
  QtmhWrStout(%addr(buf) : bufLen : apiErrData);

  // 3. Read physical file and output each record as JSON (read-only, no adds)
  read(e) c3fp3020;
  dow not %eof(c3fp3020);
    if not firstRec;
      buf = ',';
      bufLen = 1;
      QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    endif;
    firstRec = *off;

    // JSON row in chunks (avoids statement-length / delimiter issues)
    buf = CRLF + '  {"MFUKEY":"' + %trim(MFUKEY) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFDATE":"' + %trim(MFDATE) + '","MFTIME":"' + %trim(MFTIME) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFPRCD":"' + %trim(MFPRCD) + '","MFPRCT":"' + %trim(MFPRCT) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFSETD":"' + %trim(MFSETD) + '","MFSHPD":"' + %trim(MFSHPD) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFSETT":"' + %trim(MFSETT) + '","MFSTUS":"' + %trim(MFSTUS) + '","MFCUST":"' + %trim(MFCUST) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFMRCH":"' + %trim(MFMRCH) + '","MFACNL":"' + %trim(MFACNL) + '","MFSCNL":"' + %trim(MFSCNL) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFTYPE":"' + %trim(MFTYPE) + '","MFTYP2":"' + %trim(MFTYP2) + '","MFRTRN":"' + %trim(MFRTRN) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MF$RAQ":"' + %trim(MF$RAQ) + '","MF$RAG":"' + %trim(MF$RAG) + '","MF$RAD":"' + %trim(MF$RAD) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MF$FTS":"' + %trim(MF$FTS) + '","MF$SLQ":"' + %trim(MF$SLQ) + '","MF$SLG":"' + %trim(MF$SLG) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MF$SLD":"' + %trim(MF$SLD) + '","MF$FCQ":"' + %trim(MF$FCQ) + '","MF$FCG":"' + %trim(MF$FCG) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MF$FCD":"' + %trim(MF$FCD) + '","MF$RSD":"' + %trim(MF$RSD) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MF$TRP":"' + %trim(MF$TRP) + '","MF$TRR":"' + %trim(MF$TRR) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MF$RVQ":"' + %trim(MF$RVQ) + '","MF$RVG":"' + %trim(MF$RVG) + '","MF$RVD":"' + %trim(MF$RVD) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MF$LVD":"' + %trim(MF$LVD) + '","MF$RED":"' + %trim(MF$RED) + '","MF$RER":"' + %trim(MF$RER) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MF$IED":"' + %trim(MF$IED) + '","MF$IER":"' + %trim(MF$IER) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFRLIB":"' + %trim(MFRLIB) + '","MFRQUE":"' + %trim(MFRQUE) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFRLOC":"' + %trim(MFRLOC) + '","MFATAL":"' + %trim(MFATAL) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFVALU":' + %char(MFVALU) + ',"MFRVND":"' + %trim(MFRVND) + '","MFRVNA":"' + %trim(MFRVNA) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFRDAT":"' + %trim(MFRDAT) + '","MFRTIM":"' + %trim(MFRTIM) + '","MFUSER":"' + %trim(MFUSER) + '","MFSUSR":"' + %trim(MFSUSR) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFPROG":"' + %trim(MFPROG) + '","MFCURP":"' + %trim(MFCURP) + '","MFKEYP":"' + %trim(MFKEYP) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFKEYN":"' + %trim(MFKEYN) + '","MFIERR":"' + %trim(MFIERR) + '","MFXTRA":"' + %trim(MFXTRA) + '","MFPRIO":"' + %trim(MFPRIO) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFBATC":' + %char(MFBATC) + ',"MFSEQN":' + %char(MFSEQN) + ',"MFMETH":"' + %trim(MFMETH) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFREFR":"' + %trim(MFREFR) + '","MFORDR":"' + %trim(MFORDR) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFAMT1":' + %char(MFAMT1) + ',"MFAMT2":' + %char(MFAMT2) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFSETR":' + %char(MFSETR) + ',"MFSETA":' + %char(MFSETA) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFCARD":"' + %trim(MFCARD) + '","MFTRK1":"' + %trim(MFTRK1) + '","MFMICR":"' + %trim(MFMICR) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFEDAT":"' + %trim(MFEDAT) + '","MFCVV2":"' + %trim(MFCVV2) + '","MFPINC":"' + %trim(MFPINC) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFADD1":"' + %trim(MFADD1) + '","MFADD2":"' + %trim(MFADD2) + '","MFZIPC":"' + %trim(MFZIPC) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFCITY":"' + %trim(MFCITY) + '","MFSTAT":"' + %trim(MFSTAT) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFNAME":"' + %trim(MFNAME) + '","MFCURR":"' + %trim(MFCURR) + '","MFTERM":"' + %trim(MFTERM) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFSTID":"' + %trim(MFSTID) + '","MFREQN":"' + %trim(MFREQN) + '","MFNUMB":"' + %trim(MFNUMB) + '","MFRETR":"' + %trim(MFRETR) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFLTXF":"' + %trim(MFLTXF) + '","MFDSTZ":"' + %trim(MFDSTZ) + '","MFTRAN":"' + %trim(MFTRAN) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFCHKA":"' + %trim(MFCHKA) + '","MFCHEK":"' + %trim(MFCHEK) + '","MFCHKT":"' + %trim(MFCHKT) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFBDAT":"' + %trim(MFBDAT) + '","MFIDEN":"' + %trim(MFIDEN) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFUSD1":"' + %trim(MFUSD1) + '","MFUSD2":"' + %trim(MFUSD2) + '","MFUSD3":"' + %trim(MFUSD3) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFUSD4":"' + %trim(MFUSD4) + '","MFUSD5":"' + %trim(MFUSD5) + '","MFUSD6":"' + %trim(MFUSD6) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFUSD7":"' + %trim(MFUSD7) + '","MFUSD8":"' + %trim(MFUSD8) + '","MFUSD9":"' + %trim(MFUSD9) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFUSDA":' + %char(MFUSDA) + ',"MFUSDB":' + %char(MFUSDB) + ',"MFUSDC":' + %char(MFUSDC) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFRREF":"' + %trim(MFRREF) + '","MFAPPR":"' + %trim(MFAPPR) + '","MFRTXT":"' + %trim(MFRTXT) + '","MFSTXT":"' + %trim(MFSTXT) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFRAVS":"' + %trim(MFRAVS) + '","MFRCVV":"' + %trim(MFRCVV) + '","MFQACI":"' + %trim(MFQACI) + '","MFRACI":"' + %trim(MFRACI) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFSTRN":"' + %trim(MFSTRN) + '","MFATHC":"' + %trim(MFATHC) + '","MFTRNS":"' + %trim(MFTRNS) + '","MFRTVR":"' + %trim(MFRTVR) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFMKDI":"' + %trim(MFMKDI) + '","MFTRID":"' + %trim(MFTRID) + '","MFVALC":"' + %trim(MFVALC) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFACQB":"' + %trim(MFACQB) + '","MFHMID":"' + %trim(MFHMID) + '","MFSTAN":"' + %trim(MFSTAN) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFNWID":"' + %trim(MFNWID) + '","MFSTLD":"' + %trim(MFSTLD) + '"';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    buf = ',"MFGRP3":"' + %trim(MFGRP3) + '","MFDATA":"' + %trim(MFDATA) + '"}';
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);

    read(e) c3fp3020;
  enddo;

  // 4. JSON closing
  buf = CRLF + ']}';
  bufLen = %len(%trimr(buf));
  QtmhWrStout(%addr(buf) : bufLen : apiErrData);

  *inlr = *on;
  return;

end-proc;
