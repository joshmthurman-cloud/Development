/**
 * VAR TYPE DETECTION FIX
 * 
 * Replace your existing VAR type detection function with this code.
 * This ensures Propelr is detected correctly before TSYS.
 * 
 * Detection is based ONLY on document header content, NOT filename.
 */

function detectVarTypeFromText(pdfText) {
  if (!pdfText || typeof pdfText !== 'string') {
    console.log('[VAR Upload] No text content provided for detection');
    return null;
  }

  // Normalize text for case-insensitive matching
  const normalizedText = pdfText.toUpperCase();

  // IMPORTANT: Check Propelr BEFORE TSYS to avoid false positives
  // Propelr unique identifier: "VAR Form / Express Keysheets"
  if (normalizedText.includes('VAR FORM / EXPRESS KEYSHEETS') || 
      normalizedText.includes('VAR FORM / EXPRESS')) {
    console.log('[VAR Upload] Detected format: Propelr');
    return 'Propelr';
  }

  // Heartland unique identifier: "Heartland-Parameter Sheet - VNET-IP/SSL"
  if (normalizedText.includes('HEARTLAND-PARAMETER SHEET - VNET-IP/SSL') ||
      normalizedText.includes('HEARTLAND-PARAMETER SHEET')) {
    console.log('[VAR Upload] Detected format: Heartland');
    return 'Heartland';
  }

  // TSYS unique identifier: "TSYS MERCHANT PROFILE SET-UP"
  // Check TSYS LAST to avoid false positives with Propelr
  if (normalizedText.includes('TSYS MERCHANT PROFILE SET-UP') ||
      normalizedText.includes('TSYS MERCHANT PROFILE SET UP')) {
    console.log('[VAR Upload] Detected format: TSYS');
    return 'TSYS';
  }

  console.log('[VAR Upload] Could not detect VAR type from document content');
  return null;
}

// Example usage in your VAR upload handler:
// const detectedType = detectVarTypeFromText(pdfText);
// if (detectedType) {
//   console.log(`[VAR Upload] Auto-detected VAR type: ${detectedType} for file: ${fileName}`);
//   console.log(`[VAR Upload] Parsing with varType: ${detectedType}`);
//   // Continue with parsing...
// }

