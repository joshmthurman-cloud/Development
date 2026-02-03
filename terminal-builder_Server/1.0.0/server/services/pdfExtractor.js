import pdf from 'pdf-parse';
import fs from 'fs/promises';

export class PdfExtractor {
  /**
   * Extract text content from a PDF file
   * @param {string|Buffer} filePathOrBuffer - Path to PDF file or Buffer containing PDF data
   * @returns {Promise<string>} Extracted text content
   */
  static async extractText(filePathOrBuffer) {
    try {
      let dataBuffer;
      
      if (Buffer.isBuffer(filePathOrBuffer)) {
        dataBuffer = filePathOrBuffer;
      } else {
        dataBuffer = await fs.readFile(filePathOrBuffer);
      }

      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
  }

  /**
   * Extract text and metadata from a PDF file
   * @param {string|Buffer} filePathOrBuffer - Path to PDF file or Buffer containing PDF data
   * @returns {Promise<Object>} Object containing text, metadata, and page count
   */
  static async extractFull(filePathOrBuffer) {
    try {
      let dataBuffer;
      
      if (Buffer.isBuffer(filePathOrBuffer)) {
        dataBuffer = filePathOrBuffer;
      } else {
        dataBuffer = await fs.readFile(filePathOrBuffer);
      }

      const data = await pdf(dataBuffer);
      return {
        text: data.text,
        metadata: data.info,
        numPages: data.numpages,
        version: data.version
      };
    } catch (error) {
      console.error('PDF extraction error:', error);
      throw new Error(`Failed to extract PDF: ${error.message}`);
    }
  }

  /**
   * Identify VAR sheet format based on text content
   * Detection is based ONLY on document header content, NOT filename
   * @param {string} text - Extracted PDF text
   * @returns {string} Format identifier ('TSYS', 'Propelr', 'Heartland', 'UR', 'Unknown')
   */
  static identifyFormat(text) {
    if (!text || typeof text !== 'string') {
      return 'Unknown';
    }

    const upperText = text.toUpperCase();
    
    // CRITICAL: Check Propelr FIRST before TSYS to avoid false positives
    // Propelr unique identifier: "VAR Form / Express Keysheets"
    if (upperText.includes('VAR FORM / EXPRESS KEYSHEETS')) {
      return 'Propelr';
    }
    
    // Heartland unique identifier: "Parameter Sheet - VNET-IP/SSL"
    // Note: The text may be corrupted/encoded, so we check for the unique "Parameter Sheet - VNET-IP/SSL" pattern
    // This is a strong enough indicator even without "Heartland" text (which may be corrupted)
    // Also check for "CURBSTONE CARD" which appears in Heartland VARs
    if (upperText.includes('PARAMETER SHEET - VNET-IP/SSL') || 
        (upperText.includes('PARAMETER SHEET') && upperText.includes('VNET-IP/SSL'))) {
      // Additional check: Look for Heartland-specific patterns even if "Heartland" text is corrupted
      // Check for "CURBSTONE CARD" which is common in Heartland VARs
      // Or check for other Heartland-specific fields like "Merchant Name" (not "DBA Name" like TSYS)
      if (upperText.includes('CURBSTONE CARD') || 
          (upperText.includes('MERCHANT NAME') && !upperText.includes('TSYS MERCHANT PROFILE'))) {
        return 'Heartland';
      }
      // If we have the Parameter Sheet pattern but can't confirm, still try Heartland
      // (better than defaulting to TSYS which will definitely fail)
      return 'Heartland';
    }
    
    // UR VAR unique identifier: "Proprietary Software Merchant Information Form" or "TSYS/ VITAL"
    // Check for these patterns anywhere in the text (not just at the beginning)
    // Also check for key UR VAR fields that are unique to this format
    if (upperText.includes('PROPRIETARY SOFTWARE MERCHANT INFORMATION FORM') ||
        (upperText.includes('TSYS') && (upperText.includes('VITAL') || upperText.includes('/ VITAL')) && upperText.includes('MERCHANT INFORMATION FORM')) ||
        (upperText.includes('TSYS') && upperText.includes('VITAL') && upperText.includes('PROPRIETARY SOFTWARE')) ||
        // Fallback: Check for unique UR VAR field patterns (these are very specific to UR VAR)
        (upperText.includes('MERCHANT NUMBER (12 DIGITS)') && upperText.includes('VISANET TERMINAL ID (8 DIGITS)') && upperText.includes('SHARING GROUPS')) ||
        // Additional fallback: Check for UR-specific field combinations that don't appear in other formats
        (upperText.includes('MERCHANT NUMBER (12 DIGITS)') && upperText.includes('STORE # (4 DIGITS)') && upperText.includes('TERMINAL # (4 DIGITS)') && upperText.includes('SHARING GROUPS')) ||
        // Strong fallback: Check for UR-specific fields that appear together (Sharing Groups, ABA, Settlement, Re-imbursement Attribute)
        (upperText.includes('SHARING GROUPS') && upperText.includes('ABA:') && upperText.includes('SETTLEMENT:') && upperText.includes('RE-IMBURSEMENT ATTRIBUTE'))) {
      return 'UR';
    }
    
    // TSYS unique identifier: "TSYS MERCHANT PROFILE SET-UP"
    // Check TSYS LAST to avoid false positives with Propelr and UR
    if (upperText.includes('TSYS MERCHANT PROFILE SET-UP') || 
        upperText.includes('TSYS MERCHANT PROFILE SET UP')) {
      return 'TSYS';
    }
    
    // If no unique identifiers found, return Unknown
    return 'Unknown';
  }
}


