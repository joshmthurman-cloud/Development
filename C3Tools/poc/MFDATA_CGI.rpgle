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

  // Physical file C3FP3020 - input only (read).
  // Library containing C3FP3020 must be in job's library list when CGI runs.
dcl-f c3fp3020 usage(*input);

  // Record layout - must match C3FP3020 format (MFUKEY, MFDATE, MFTIME, ...)
dcl-ds rec likerec(c3fp3020 : *input);

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
  read(e) c3fp3020 rec;
  dow not %eof(c3fp3020);
    if not firstRec;
      buf = ',';
      bufLen = 1;
      QtmhWrStout(%addr(buf) : bufLen : apiErrData);
    endif;
    firstRec = *off;

    // All 124 fields - CHAR as quoted strings, PACKED as numbers (LIKEREC names from file)
    buf = ('' + CRLF + '  {"MFUKEY":"' + %trim(rec.MFUKEY) +
          '","MFDATE":"' + %trim(rec.MFDATE) +
          '","MFTIME":"' + %trim(rec.MFTIME) +
          '","MFPRCD":"' + %trim(rec.MFPRCD) +
          '","MFPRCT":"' + %trim(rec.MFPRCT) +
          '","MFSETD":"' + %trim(rec.MFSETD) +
          '","MFSHPD":"' + %trim(rec.MFSHPD) +
          '","MFSETT":"' + %trim(rec.MFSETT) +
          '","MFSTUS":"' + %trim(rec.MFSTUS) +
          '","MFCUST":"' + %trim(rec.MFCUST) +
          '","MFMRCH":"' + %trim(rec.MFMRCH) +
          '","MFACNL":"' + %trim(rec.MFACNL) +
          '","MFSCNL":"' + %trim(rec.MFSCNL) +
          '","MFTYPE":"' + %trim(rec.MFTYPE) +
          '","MFTYP2":"' + %trim(rec.MFTYP2) +
          '","MFRTRN":"' + %trim(rec.MFRTRN) +
          '","MF$RAQ":"' + %trim(rec.MF$RAQ) +
          '","MF$RAG":"' + %trim(rec.MF$RAG) +
          '","MF$RAD":"' + %trim(rec.MF$RAD) +
          '","MF$FTS":"' + %trim(rec.MF$FTS) +
          '","MF$SLQ":"' + %trim(rec.MF$SLQ) +
          '","MF$SLG":"' + %trim(rec.MF$SLG) +
          '","MF$SLD":"' + %trim(rec.MF$SLD) +
          '","MF$FCQ":"' + %trim(rec.MF$FCQ) +
          '","MF$FCG":"' + %trim(rec.MF$FCG) +
          '","MF$FCD":"' + %trim(rec.MF$FCD) +
          '","MF$RSD":"' + %trim(rec.MF$RSD) +
          '","MF$TRP":"' + %trim(rec.MF$TRP) +
          '","MF$TRR":"' + %trim(rec.MF$TRR) +
          '","MF$RVQ":"' + %trim(rec.MF$RVQ) +
          '","MF$RVG":"' + %trim(rec.MF$RVG) +
          '","MF$RVD":"' + %trim(rec.MF$RVD) +
          '","MF$LVD":"' + %trim(rec.MF$LVD) +
          '","MF$RED":"' + %trim(rec.MF$RED) +
          '","MF$RER":"' + %trim(rec.MF$RER) +
          '","MF$IED":"' + %trim(rec.MF$IED) +
          '","MF$IER":"' + %trim(rec.MF$IER) +
          '","MFRLIB":"' + %trim(rec.MFRLIB) +
          '","MFRQUE":"' + %trim(rec.MFRQUE) +
          '","MFRLOC":"' + %trim(rec.MFRLOC) +
          '","MFATAL":"' + %trim(rec.MFATAL) +
          '","MFVALU":' + %char(rec.MFVALU) +
          ',"MFRVND":"' + %trim(rec.MFRVND) +
          '","MFRVNA":"' + %trim(rec.MFRVNA) +
          '","MFRDAT":"' + %trim(rec.MFRDAT) +
          '","MFRTIM":"' + %trim(rec.MFRTIM) +
          '","MFUSER":"' + %trim(rec.MFUSER) +
          '","MFSUSR":"' + %trim(rec.MFSUSR) +
          '","MFPROG":"' + %trim(rec.MFPROG) +
          '","MFCURP":"' + %trim(rec.MFCURP) +
          '","MFKEYP":"' + %trim(rec.MFKEYP) +
          '","MFKEYN":"' + %trim(rec.MFKEYN) +
          '","MFIERR":"' + %trim(rec.MFIERR) +
          '","MFXTRA":"' + %trim(rec.MFXTRA) +
          '","MFPRIO":"' + %trim(rec.MFPRIO) +
          '","MFBATC":' + %char(rec.MFBATC) +
          ',"MFSEQN":' + %char(rec.MFSEQN) +
          ',"MFMETH":"' + %trim(rec.MFMETH) +
          '","MFREFR":"' + %trim(rec.MFREFR) +
          '","MFORDR":"' + %trim(rec.MFORDR) +
          '","MFAMT1":' + %char(rec.MFAMT1) +
          ',"MFAMT2":' + %char(rec.MFAMT2) +
          ',"MFSETR":' + %char(rec.MFSETR) +
          ',"MFSETA":' + %char(rec.MFSETA) +
          ',"MFCARD":"' + %trim(rec.MFCARD) +
          '","MFTRK1":"' + %trim(rec.MFTRK1) +
          '","MFMICR":"' + %trim(rec.MFMICR) +
          '","MFEDAT":"' + %trim(rec.MFEDAT) +
          '","MFCVV2":"' + %trim(rec.MFCVV2) +
          '","MFPINC":"' + %trim(rec.MFPINC) +
          '","MFADD1":"' + %trim(rec.MFADD1) +
          '","MFADD2":"' + %trim(rec.MFADD2) +
          '","MFZIPC":"' + %trim(rec.MFZIPC) +
          '","MFCITY":"' + %trim(rec.MFCITY) +
          '","MFSTAT":"' + %trim(rec.MFSTAT) +
          '","MFNAME":"' + %trim(rec.MFNAME) +
          '","MFCURR":"' + %trim(rec.MFCURR) +
          '","MFTERM":"' + %trim(rec.MFTERM) +
          '","MFSTID":"' + %trim(rec.MFSTID) +
          '","MFREQN":"' + %trim(rec.MFREQN) +
          '","MFNUMB":"' + %trim(rec.MFNUMB) +
          '","MFRETR":"' + %trim(rec.MFRETR) +
          '","MFLTXF":"' + %trim(rec.MFLTXF) +
          '","MFDSTZ":"' + %trim(rec.MFDSTZ) +
          '","MFTRAN":"' + %trim(rec.MFTRAN) +
          '","MFCHKA":"' + %trim(rec.MFCHKA) +
          '","MFCHEK":"' + %trim(rec.MFCHEK) +
          '","MFCHKT":"' + %trim(rec.MFCHKT) +
          '","MFBDAT":"' + %trim(rec.MFBDAT) +
          '","MFIDEN":"' + %trim(rec.MFIDEN) +
          '","MFUSD1":"' + %trim(rec.MFUSD1) +
          '","MFUSD2":"' + %trim(rec.MFUSD2) +
          '","MFUSD3":"' + %trim(rec.MFUSD3) +
          '","MFUSD4":"' + %trim(rec.MFUSD4) +
          '","MFUSD5":"' + %trim(rec.MFUSD5) +
          '","MFUSD6":"' + %trim(rec.MFUSD6) +
          '","MFUSD7":"' + %trim(rec.MFUSD7) +
          '","MFUSD8":"' + %trim(rec.MFUSD8) +
          '","MFUSD9":"' + %trim(rec.MFUSD9) +
          '","MFUSDA":' + %char(rec.MFUSDA) +
          ',"MFUSDB":' + %char(rec.MFUSDB) +
          ',"MFUSDC":' + %char(rec.MFUSDC) +
          ',"MFRREF":"' + %trim(rec.MFRREF) +
          '","MFAPPR":"' + %trim(rec.MFAPPR) +
          '","MFRTXT":"' + %trim(rec.MFRTXT) +
          '","MFSTXT":"' + %trim(rec.MFSTXT) +
          '","MFRAVS":"' + %trim(rec.MFRAVS) +
          '","MFRCVV":"' + %trim(rec.MFRCVV) +
          '","MFQACI":"' + %trim(rec.MFQACI) +
          '","MFRACI":"' + %trim(rec.MFRACI) +
          '","MFSTRN":"' + %trim(rec.MFSTRN) +
          '","MFATHC":"' + %trim(rec.MFATHC) +
          '","MFTRNS":"' + %trim(rec.MFTRNS) +
          '","MFRTVR":"' + %trim(rec.MFRTVR) +
          '","MFMKDI":"' + %trim(rec.MFMKDI) +
          '","MFTRID":"' + %trim(rec.MFTRID) +
          '","MFVALC":"' + %trim(rec.MFVALC) +
          '","MFACQB":"' + %trim(rec.MFACQB) +
          '","MFHMID":"' + %trim(rec.MFHMID) +
          '","MFSTAN":"' + %trim(rec.MFSTAN) +
          '","MFNWID":"' + %trim(rec.MFNWID) +
          '","MFSTLD":"' + %trim(rec.MFSTLD) +
          '","MFGRP3":"' + %trim(rec.MFGRP3) +
          '","MFDATA":"' + %trim(rec.MFDATA) + '"}');
    bufLen = %len(%trimr(buf));
    QtmhWrStout(%addr(buf) : bufLen : apiErrData);

    read(e) c3fp3020 rec;
  enddo;

  // 4. JSON closing
  buf = CRLF + ']}';
  bufLen = %len(%trimr(buf));
  QtmhWrStout(%addr(buf) : bufLen : apiErrData);

  *inlr = *on;
  return;

end-proc;
