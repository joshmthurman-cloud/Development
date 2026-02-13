#!/usr/bin/env python3
"""
Convert RPG (or any) source to fixed 112-byte records for IBM i source members.
Output is EBCDIC (cp037) so the member has correct CCSID 37 without relying on
CPYFRMSTMF conversion. One 112-byte record per line + EBCDIC newline (0x25).
Use: python to_fixed_src.py MFDATA_CGI.rpgle MFDATA_CGI_fixed.rpgle
Upload to IFS, then:
  CPYFRMSTMF FROMSTMF('/home/JOSH/MFDATA_CGI_fixed.rpgle') TOMBR('...') MBROPT(*REPLACE) STMFCCSID(37)
(Or omit STMFCCSID if the stream is already tagged 37.)
"""
import sys

RECLEN = 112
# EBCDIC (CCSID 37) newline
EBCDIC_LF = b"\x25"

def main():
    if len(sys.argv) < 2:
        infile = sys.stdin
        outfile = sys.stdout.buffer
    elif len(sys.argv) == 2:
        infile = open(sys.argv[1], "r", encoding="utf-8", errors="replace")
        outfile = sys.stdout.buffer
    else:
        infile = open(sys.argv[1], "r", encoding="utf-8", errors="replace")
        outfile = open(sys.argv[2], "wb")

    try:
        for line in infile:
            line = line.rstrip("\r\n")
            line = line[:RECLEN]
            padded = line.ljust(RECLEN)
            # Write 112 bytes in EBCDIC + EBCDIC newline (so member gets correct chars)
            outfile.write(padded.encode("cp037", errors="replace"))
            outfile.write(EBCDIC_LF)
    finally:
        if infile is not sys.stdin:
            infile.close()
        if outfile is not sys.stdout:
            outfile.close()

if __name__ == "__main__":
    main()
