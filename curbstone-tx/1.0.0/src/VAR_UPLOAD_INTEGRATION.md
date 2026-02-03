# VAR Upload Integration Guide

This guide shows how to integrate the improved VAR type detection into your Beta Upload VAR tab.

## Overview

The `varDetection.js` utility provides improved VAR type detection using unique text identifiers:
- **Heartland**: "Heartland-Parameter Sheet - VNET-IP/SSL"
- **Propelr**: "VAR Form / Express Keysheets" (checked before TSYS to avoid false positives)
- **TSYS**: "TSYS MERCHANT PROFILE SET-UP"

## Integration Steps

### 1. Import the detection utility

```javascript
import { detectVarType, autoDetectVarType } from './varDetection';
```

### 2. Use in your VAR upload handler

Replace your existing VAR type detection logic with:

```javascript
// Example: In your file upload handler
const handleVarFileUpload = async (file) => {
  try {
    // Extract text from PDF (using your existing PDF parsing method)
    const pdfText = await extractTextFromPDF(file);
    
    // Use the improved detection
    const detectedType = autoDetectVarType(pdfText, file.name);
    
    if (detectedType) {
      console.log(`[VAR Upload] Detected format: ${detectedType}`);
      console.log(`[VAR Upload] Auto-detected VAR type: ${detectedType} for file: ${file.name}`);
      console.log(`[VAR Upload] Parsing with varType: ${detectedType}`);
      
      // Continue with your existing parsing logic using detectedType
      const varData = parseVarData(pdfText, detectedType);
      // ... rest of your code
    } else {
      console.error('[VAR Upload] Could not detect VAR type');
      // Handle unknown type
    }
  } catch (error) {
    console.error('[VAR Upload] Error:', error);
  }
};
```

### 3. Key Improvements

The new detection:
- **Checks Propelr before TSYS** - This fixes the issue where Propelr VARs were being misidentified as TSYS
- **Uses unique identifiers** - Each VAR type has specific text that uniquely identifies it
- **Case-insensitive matching** - Works regardless of text case in the PDF
- **Fallback to filename** - If text detection fails, checks the filename

## Detection Order

The detection checks in this order (most specific first):
1. Heartland
2. Propelr (checked before TSYS to prevent false positives)
3. TSYS
4. Filename fallback

This order ensures Propelr VARs are correctly identified before TSYS detection runs.

## Example Output

When a Propelr VAR is uploaded, you should now see:
```
[VAR Upload] Detected format: Propelr (matched: "VAR Form / Express Keysheets")
[VAR Upload] Auto-detected VAR type: Propelr for file: Propelr VAR.pdf
[VAR Upload] Parsing with varType: Propelr
```

Instead of the previous incorrect:
```
[VAR Upload] Detected format: TSYS
[VAR Upload] Auto-detected VAR type: TSYS for file: Propelr VAR.pdf
```

