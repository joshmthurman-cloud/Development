# MFDATA CGI – RPG Program for Web Server

**Copy-paste commands:** See **COMMANDS.txt** for all commands in order (PC, FileZilla, 400).

RPG CGI program that **reads** from the physical file **C3FP3020** on the 400 and returns its records as JSON. The program does **not** add or update records—it only reads. Your web server (e.g. TestServer at `http://10.110.0.224:10010`) calls this program to get the table data.

## Data source: physical file C3FP3020

The program reads from your existing file **C3FP3020**. You don’t create a new file—use the one already on the 400 (the same one you copied as `C3FP3020.FILE` on your PC).

**“Adding to path” on the 400:** Add the **library** that contains C3FP3020 to the **job’s library list** when the CGI runs (see step 5 in section 1 and “Authority” in section 3). The server then finds `C3FP3020` in that library; there is no Windows-style path.

## Data layout (expected in C3FP3020)

| Column  | Type        | Example   |
|---------|-------------|-----------|
| MFUKEY  | 15 char     | KEY10000000000 |
| MFDATE  | 8-digit     | 20260213  |
| MFTIME  | 6-digit     | 133900    |
| MFCUST  | 5 char      | C1000     |
| MFMRCH  | 5 char      | M1000     |
| MFTYPE  | 2 char      | T1        |
| MFTYP2  | 2 char      | 21        |
| MFRTRN  | 2 char      | R1        |

If your C3FP3020 has different column names or types, the RPG source must be updated to match.

## Files in This POC

- **C3FP3020.FILE** – Your copy of the 400 physical file (for reference only; the program runs on the 400 and reads the real C3FP3020 there).
- **MFDATA_DDS.txt** – DDS for a file with the same layout (only needed if you create a test file; not required when using existing C3FP3020).
- **MFDATA_CGI.rpgle** – RPGLE source (edit this). Not used directly on the 400—see **MFDATA_CGI_fixed.rpgle** for upload.
- **MFDATA_CGI_fixed.rpgle** – Same program in **fixed 112-byte records** for IBM i source members. **Upload this file** to the 400 (see “Upload to IBM i” below).
- **to_fixed_src.py** – Script to regenerate `MFDATA_CGI_fixed.rpgle` after you change `MFDATA_CGI.rpgle` (run: `python to_fixed_src.py MFDATA_CGI.rpgle MFDATA_CGI_fixed.rpgle`).

---

## 1. Use your existing C3FP3020 on the 400

The program reads from **C3FP3020**. No need to create a new file—use the one you already have.

1. **Locate C3FP3020**  
   - Note which **library** it lives in (e.g. **MYLIB**, **C3LIB**, or a production library).

2. **Ensure C3FP3020 is in the library list when the CGI runs**  
   - The HTTP server job (e.g. user **WEBSERVER**) must have the library that contains C3FP3020 in its library list so the program can find the file. Configure that in the server’s job description or in the environment that starts the server.

---

## 2. Upload to IBM i and build the RPG program

Source members on the 400 use **fixed 112-byte records**. Use the pre-built **MFDATA_CGI_fixed.rpgle** (in this folder)—do not upload **MFDATA_CGI.rpgle** or the compile will fail.

### A. Upload and copy into the source member

1. **FileZilla:** Go to **`/home/JOSH/`** (or your IFS folder). Upload **`MFDATA_CGI_fixed.rpgle`** from this POC folder. You can keep the name as is.
2. **On the 400**, run (adjust path if needed). The fixed file is generated in **EBCDIC (CCSID 37)** so the member matches the compiler; use **STMFCCSID(37)** so the system treats the stream as EBCDIC:
   ```txt
   CPYFRMSTMF FROMSTMF('/home/JOSH/MFDATA_CGI_fixed.rpgle') TOMBR('/QSYS.LIB/JOSH.LIB/QSRC.FILE/MFDATA_CGI.MBR') MBROPT(*REPLACE) STMFCCSID(37)
   ```
   That puts the source into member **MFDATA_CGI** in **JOSH/QSRC**.

### B. Compile (C3FP3020 must exist and be in library list)

1. **RPG source**  
   - After the step above, the member **JOSH/QSRC(MFDATA_CGI)** is ready. No need to upload **MFDATA_CGI.rpgle**.  

2. **Compile module**  
   - Put the library that contains **C3FP3020** (e.g. **JOSH**) in your compile job’s library list.  
   - `CRTRPGMOD MODULE(josh/MFDATA_CGI) SRCFILE(josh/QSRC) SRCMBR(MFDATA_CGI)`  

3. **Create program**  
   - `CRTPGM PGM(josh/MFDATA_CGI) MODULE(josh/MFDATA_CGI) BNDSRVPGM(QHTTPSVR/QZHBCGI)`  

---

## 3. HTTP server configuration (TestServer)

Configure the server so it runs this program as a CGI. The program only **reads** C3FP3020; it does not add or change records.

1. **Script alias**  
   - In your HTTP server config (e.g. IBM Web Administration for i), define a script directory (e.g. `/cgi-bin/`) that executes programs from `QSYS.LIB/MYLIB.LIB`.  
   - Ensure CGI is enabled (e.g. `SetHandler cgi-script`, `Options +ExecCGI`).  

2. **URL**  
   - Map a URL such as `/cgi-bin/mfdata_cgi` to program `MYLIB/MFDATA_CGI` (exact steps depend on your server).  

3. **Authority and library list**  
   - The server’s user (e.g. **WEBSERVER**) needs:  
     - **Execute** on `MYLIB/MFDATA_CGI`  
     - **Read** on **C3FP3020** (and the library that contains it must be in the job’s library list when the CGI runs).  

---

## 4. Test

- Open: `http://10.110.0.224:10010/cgi-bin/mfdata_cgi` (adjust host/port/path to match your setup).  
- You should get HTTP 200 and a JSON body like:  
  `{"rows": [ {"MFUKEY":"...","MFDATE":..., ...}, ... ]}`  
- If C3FP3020 is empty, you’ll get: `{"rows": []}`.

---

## Using a specific library for C3FP3020

If you can’t rely on the library list, you can hard-code the library in the RPG source:

- Add a constant, e.g. `dcl-c C3FP3020_LIB 'MYLIB';`
- Declare the file with a path:  
  `dcl-f c3fp3020 usage(*input) extfile(C3FP3020_LIB + '/C3FP3020');`  
  (syntax may vary by release).

Then recompile. The program still only **reads** from the physical file.
