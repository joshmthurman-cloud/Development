/**
 * VAR Type Detection Utility
 * 
 * Detects VAR type based on unique text identifiers found in PDF content.
 * Uses specific text patterns that uniquely identify each VAR type.
 */

/**
 * Unique identifiers for each VAR type (in order of specificity)
 * Most specific patterns are checked first to avoid false positives
 * Detection is based ONLY on document header content, NOT filename
 */
const VAR_TYPE_IDENTIFIERS = {
  Heartland: [
    'Heartland-Parameter Sheet - VNET-IP/SSL'
  ],
  Propelr: [
    'VAR Form / Express Keysheets'
  ],
  TSYS: [
    'TSYS MERCHANT PROFILE SET-UP'
  ]
};

/**
 * Detects VAR type from PDF text content
 * Detection is based ONLY on document header content, NOT filename
 * @param {string} pdfText - The extracted text content from the PDF
 * @param {string} fileName - Optional filename (used only for logging, not detection)
 * @returns {string|null} - Detected VAR type ('Heartland', 'Propelr', 'TSYS') or null if unknown
 */
export function detectVarType(pdfText, fileName = '') {
  if (!pdfText || typeof pdfText !== 'string') {
    console.log('[VAR Upload] No text content provided for detection');
    return null;
  }

  // Normalize text for case-insensitive matching
  const normalizedText = pdfText.toUpperCase();

  // CRITICAL: Check Propelr FIRST before TSYS to avoid false positives
  // Propelr unique identifier: "VAR Form / Express Keysheets"
  if (normalizedText.includes('VAR FORM / EXPRESS KEYSHEETS')) {
    console.log('[VAR Upload] Detected format: Propelr');
    return 'Propelr';
  }

  // Heartland unique identifier: "Heartland-Parameter Sheet - VNET-IP/SSL"
  if (normalizedText.includes('HEARTLAND-PARAMETER SHEET - VNET-IP/SSL')) {
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

/**
 * Auto-detects VAR type and logs the result
 * @param {string} pdfText - The extracted text content from the PDF
 * @param {string} fileName - The filename of the uploaded file
 * @returns {string|null} - Detected VAR type or null
 */
export function autoDetectVarType(pdfText, fileName) {
  const detectedType = detectVarType(pdfText, fileName);
  
  if (detectedType) {
    console.log(`[VAR Upload] Auto-detected VAR type: ${detectedType} for file: ${fileName}`);
  } else {
    console.log(`[VAR Upload] Could not auto-detect VAR type for file: ${fileName}`);
  }
  
  return detectedType;
}

export default {
  detectVarType,
  autoDetectVarType,
  VAR_TYPE_IDENTIFIERS
};

