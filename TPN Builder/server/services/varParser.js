import { PdfExtractor } from './pdfExtractor.js';

export class VarParser {
  /**
   * Parse VAR sheet and extract merchant/terminal data
   * @param {string} pdfText - Extracted text from PDF
   * @param {string} format - VAR sheet format ('TSYS', 'Heartland', 'Propelr', etc.)
   * @returns {Object} Parsed VAR data
   */
  static parse(pdfText, format = 'TSYS') {
    switch (format) {
      case 'TSYS':
        return this.parseTsys(pdfText);
      case 'Propelr':
        return this.parsePropelr(pdfText);
      case 'Heartland':
        return this.parseHeartland(pdfText);
      case 'UR':
        return this.parseUR(pdfText);
      default:
        return this.parseGeneric(pdfText);
    }
  }

  /**
   * Parse TSYS VAR sheet format
   * @param {string} text - PDF text content
   * @returns {Object} Parsed VAR data
   */
  static parseTsys(text) {
    const data = {
      format: 'TSYS',
      merchant: {},
      terminal: {
        sicCode: '' // Always initialize sicCode so it shows in UI even if empty
      },
      cardTypes: {},
      debit: {}
    };

    // List of all known field labels to help determine where values end
    const knownFieldLabels = [
      'Merchant ID', 'DBA Name', 'Address', 'Merchant City', 'Merchant State',
      'Merchant Zipcode', 'Legal Phone', 'DBA Phone', 'American Express',
      'Discover', 'Gift Card Vendor', 'Gift Card ID', 'Check Service', 'Check MID',
      'Check Reader', 'EBT FCS', 'Debit Network', 'Debit Ntwrk Summary',
      'EMV Contact', 'Debit Pin Pad', 'EMV Contactless', 'EMV Reader Model',
      'Heartland Store ID', 'SmartLink', 'WEX ID', 'Voyager ID',
      'Terminal Number', 'PNS Merchant ID', 'Terminal ID', 'Vital Merchant ID',
      'Hypercom Chk Digit', 'Location', 'Terminal Type', 'Printer Type',
      'Terminal Model', 'Printer Model', 'Terminal Ind', 'Paper Type',
      'Application', 'Industry', 'Close Method', 'Auto Close Time',
      'Auth Primary Phone', 'Settle Primary Phone', 'Auth Second Phone',
      'Settle Second Phone', 'SIC Code', 'PBX Access Code', 'Agency Number',
      'Store Number', 'Acquirer ID', 'Chain Number', 'Country Code',
      'Time Zone Ind', 'Auth TID', 'Settlement TID', 'Client ID', 'Division',
      'Term Lifecycle Code', 'Download ID', 'IP Address', 'Gateway Address',
      'DNS1', 'DNS2', 'Comments', 'Primary Dwnld Ph#', 'Secondary Dwnld Ph#',
      'Download Serial #'
    ];

    // Helper function to extract field value - uses known field labels to determine boundaries
    const extractField = (label, text) => {
      // Escape special regex characters in label
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Try multiple patterns for the label
      const labelPatterns = [
        new RegExp(`\\|\\s*${escapedLabel}\\s*:\\s*\\|`, 'i'),  // Table format: | Label: |
        new RegExp(`\\|\\s*${escapedLabel}\\s*:\\s*`, 'i'),     // Table format: | Label: value
        new RegExp(`${escapedLabel}\\s*:\\s*\\|`, 'i'),        // Label: | value
        new RegExp(`${escapedLabel}\\s*:\\s*`, 'i')             // Standard: Label: value
      ];
      
      let labelMatch = null;
      let patternIndex = -1;
      
      for (let i = 0; i < labelPatterns.length; i++) {
        labelMatch = text.match(labelPatterns[i]);
        if (labelMatch) {
          patternIndex = i;
          break;
        }
      }
      
      if (!labelMatch) return '';
      
      // Get the position after the label and colon
      const startPos = labelMatch.index + labelMatch[0].length;
      let remainingText = text.substring(startPos);
      
      // Trim leading whitespace and pipes
      remainingText = remainingText.replace(/^\s*\|\s*/, '').trim();
      
      // Find where the value ends by looking for:
      // 1. Table pipe separator (|) - common in PDF tables
      // 2. Next known field label
      // 3. Newline (but only if it's followed by a field label or is a table row break)
      // 4. End of string
      
      let endPos = remainingText.length;
      
      // First, check for table pipe separator (most reliable for table format)
      const pipeMatch = remainingText.match(/\|/);
      if (pipeMatch) {
        // Value is between pipes, extract until next pipe
        endPos = pipeMatch.index;
      } else {
        // Not in table format, look for next field label or newline
        // Build regex to find any known field label
        let minNextFieldPos = remainingText.length;
        
        for (const nextLabel of knownFieldLabels) {
          if (nextLabel.toLowerCase() === label.toLowerCase()) continue; // Skip current label
          
          const escapedNextLabel = nextLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const nextLabelPatterns = [
            new RegExp(`\\|\\s*${escapedNextLabel}\\s*:`, 'i'),
            new RegExp(`\\s+${escapedNextLabel}\\s*:`, 'i'),
            new RegExp(`${escapedNextLabel}\\s*:`, 'i')
          ];
          
          for (const pattern of nextLabelPatterns) {
            const match = remainingText.match(pattern);
            if (match && match.index < minNextFieldPos) {
              minNextFieldPos = match.index;
            }
          }
        }
        
        // Also check for newline followed by field label or table row
        const newlineMatch = remainingText.match(/[\r\n]+/);
        if (newlineMatch) {
          const afterNewline = remainingText.substring(newlineMatch.index + newlineMatch[0].length);
          // Check if newline is followed by a field label or table structure
          const isTableRow = /^\s*\|/.test(afterNewline);
          const hasFieldAfter = knownFieldLabels.some(fl => {
            const escaped = fl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return new RegExp(`${escaped}\\s*:`, 'i').test(afterNewline);
          });
          
          if (isTableRow || hasFieldAfter) {
            if (newlineMatch.index < minNextFieldPos) {
              minNextFieldPos = newlineMatch.index;
            }
          }
        }
        
        endPos = minNextFieldPos;
      }
      
      // Extract the value
      let value = remainingText.substring(0, endPos).trim();
      
      // Clean up: remove pipes, extra whitespace, trailing colons
      value = value.replace(/^\|+|\|+$/g, '').trim(); // Remove leading/trailing pipes
      value = value.replace(/\s+/g, ' '); // Normalize whitespace
      value = value.replace(/[:;]\s*$/, '').trim(); // Remove trailing colons/semicolons
      
      return value;
    };

    // Merchant Information
    data.merchant.merchantId = extractField('Merchant ID', text) || extractField('Merchant ID:', text);
    data.merchant.dbaName = extractField('DBA Name', text) || extractField('DBA Name:', text);
    data.merchant.address = extractField('Address', text) || extractField('Address:', text);
    data.merchant.city = extractField('Merchant City', text) || extractField('Merchant City:', text);
    data.merchant.state = extractField('Merchant State', text) || extractField('Merchant State:', text);
    data.merchant.zipcode = extractField('Merchant Zipcode', text) || extractField('Merchant Zipcode:', text);
    data.merchant.legalPhone = extractField('Legal Phone', text) || extractField('Legal Phone:', text);
    data.merchant.dbaPhone = extractField('DBA Phone', text) || extractField('DBA Phone:', text);

    // Terminal Information - extract in order to avoid capturing subsequent fields
    data.terminal.terminalNumber = extractField('Terminal Number', text);
    data.terminal.terminalId = extractField('Terminal ID', text);
    data.terminal.terminalType = extractField('Terminal Type', text);
    data.terminal.terminalModel = extractField('Terminal Model', text);
    data.terminal.application = extractField('Application', text);
    data.terminal.closeMethod = extractField('Close Method', text);
    data.terminal.authPrimaryPhone = extractField('Auth Primary Phone', text);
    data.terminal.authSecondPhone = extractField('Auth Second Phone', text);
    data.terminal.sicCode = extractField('SIC Code', text);
    data.terminal.agencyNumber = extractField('Agency Number', text);
    data.terminal.acquirerId = extractField('Acquirer ID', text);
    data.terminal.countryCode = extractField('Country Code', text);
    data.terminal.authTid = extractField('Auth TID', text);
    data.terminal.settlementTid = extractField('Settlement TID', text);
    data.terminal.vitalMerchantId = extractField('Vital Merchant ID', text);
    data.terminal.location = extractField('Location', text);
    data.terminal.printerType = extractField('Printer Type', text);
    data.terminal.industry = extractField('Industry', text);
    data.terminal.autoCloseTime = extractField('Auto Close Time', text);
    data.terminal.settlePrimaryPhone = extractField('Settle Primary Phone', text);
    data.terminal.settleSecondPhone = extractField('Settle Second Phone', text);
    data.terminal.storeNumber = extractField('Store Number', text);
    data.terminal.chainNumber = extractField('Chain Number', text);
    data.terminal.timeZoneInd = extractField('Time Zone Ind', text);
    data.terminal.division = extractField('Division', text);

    // Card Types
    data.cardTypes.americanExpress = extractField('American Express', text);
    data.cardTypes.discover = extractField('Discover', text) || extractField('Discover\\PayPal', text);
    data.cardTypes.debitNetwork = extractField('Debit Network', text);
    data.cardTypes.debitNtwrkSummary = extractField('Debit Ntwrk Summary', text);

    // Debit Information (if present)
    if (data.cardTypes.debitNtwrkSummary) {
      data.debit.debitNtwrkSummary = data.cardTypes.debitNtwrkSummary;
      // Standard debit fields (from mapping matrix)
      data.debit.merchantAba = '990025276'; // Standard value
      data.debit.settlementAgent = 'V074'; // Standard value
      data.debit.reimbursementAttribute = 'Z'; // Standard value
    }

    // Clean up empty values (but keep sicCode even if empty so it shows in UI)
    Object.keys(data.merchant).forEach(key => {
      if (!data.merchant[key]) delete data.merchant[key];
    });
    Object.keys(data.terminal).forEach(key => {
      // Always keep sicCode even if empty
      if (key === 'sicCode') return;
      if (!data.terminal[key]) delete data.terminal[key];
    });
    Object.keys(data.cardTypes).forEach(key => {
      if (!data.cardTypes[key]) delete data.cardTypes[key];
    });

    return data;
  }

  /**
   * Generic parser for unknown formats
   * @param {string} text - PDF text content
   * @returns {Object} Parsed VAR data
   */
  static parseGeneric(text) {
    return {
      format: 'Unknown',
      rawText: text,
      merchant: {},
      terminal: {},
      cardTypes: {},
      debit: {}
    };
  }

  /**
   * Parse VAR sheet from PDF file or buffer
   * @param {string|Buffer} filePathOrBuffer - PDF file path or buffer
   * @param {string} varType - VAR type ('TSYS', 'Heartland', etc.) - overrides auto-detection
   * @returns {Promise<Object>} Parsed VAR data
   */
  static async parseFromPdf(filePathOrBuffer, varType = null) {
    const text = await PdfExtractor.extractText(filePathOrBuffer);
    // Use provided varType, or auto-detect if not provided
    const format = varType || PdfExtractor.identifyFormat(text);
    return this.parse(text, format);
  }

  /**
   * Parse Propelr VAR sheet format (previously called Heartland)
   * @param {string} text - PDF text content
   * @returns {Object} Parsed VAR data
   */
  static parsePropelr(text) {
    const data = {
      format: 'Propelr',
      merchant: {},
      terminal: {
        sicCode: '' // Always initialize sicCode so it shows in UI even if empty
      },
      cardTypes: {},
      debit: {}
    };

    // List of known field labels to help determine where values end
    const knownFieldLabels = [
      'Merchant Name', 'V Number', 'Merchant Number', 'Terminal Status', 'Terminal#', 'BIN', 'Chain',
      'Store Number', 'Agent', 'Street Address', 'City', 'State', 'Postal Code', 'Phone Number',
      'Contact Name', 'Country', 'Currency Code', 'Time Zone Code', 'Time Zone Differential',
      'Location Number', 'VISA MCC', 'Industry', 'Card Type Accepted', 'EDC Primary', 'EDC Secondary',
      'Auth Primary', 'Auth Secondary', 'Security Code', 'Pin Pad Type', 'Encryption',
      'Merchant ABA Number', 'Reimbursement Attribute', 'Merchant Settlement Agent', 'Cashback',
      'EBT FCSID', 'Networks and Sharing Groups', 'Host Capture Participant Indicator', 'HC POS ID',
      'Host Capture Auto Close Times', 'Comments'
    ];

    // Helper function to extract field value - stops at next field label
    const extractField = (label, text) => {
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = [
        new RegExp(`${escapedLabel}\\s*:\\s*([^\\n]+)`, 'i'),
        new RegExp(`${escapedLabel}\\s+([^\\n]+)`, 'i')
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          let value = match[1].trim();
          
          // Find where the value ends by looking for the next field label
          let minNextFieldPos = value.length;
          
          for (const nextLabel of knownFieldLabels) {
            if (nextLabel.toLowerCase() === label.toLowerCase()) continue;
            
            const escapedNextLabel = nextLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // More flexible patterns to catch field labels that might be on the same line
            const nextLabelPatterns = [
              new RegExp(`\\s+${escapedNextLabel}\\s*:`, 'i'),      // Space before label with colon
              new RegExp(`\\s+${escapedNextLabel}\\s+`, 'i'),       // Space before and after label
              new RegExp(`${escapedNextLabel}\\s*:`, 'i'),          // Label with colon (no space requirement)
              new RegExp(`\\b${escapedNextLabel}\\s*:`, 'i')        // Word boundary before label with colon
            ];
            
            for (const nextPattern of nextLabelPatterns) {
              const nextMatch = value.match(nextPattern);
              if (nextMatch && nextMatch.index < minNextFieldPos) {
                minNextFieldPos = nextMatch.index;
              }
            }
          }
          
          // Extract only up to the next field
          if (minNextFieldPos < value.length) {
            value = value.substring(0, minNextFieldPos).trim();
          }
          
          return value;
        }
      }
      return '';
    };

    // Merchant Information
    data.merchant.merchantId = extractField('Merchant Number', text);
    data.merchant.dbaName = extractField('Merchant Name', text);
    
    // Extract Street Address - try multiple patterns to handle variations
    data.merchant.address = extractField('Street Address', text);
    if (!data.merchant.address) {
      // Try alternative patterns to handle cases where "Merchant Information" prefix or same-line "City" causes issues
      const patterns = [
        /Street\s+Address\s*:\s*([^\n]+?)(?=\s+City\s*:|$)/i,  // Standard: stops at " City:"
        /Merchant\s+Information\s+Street\s+Address\s*:\s*([^\n]+?)(?=\s+City\s*:|$)/i,  // With "Merchant Information" prefix
        /Street\s+Address\s*:\s*([A-Z0-9\s]+?)(?=\s+City\s*:|$)/i  // More specific: alphanumeric and spaces only
      ];
      
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          data.merchant.address = match[1].trim();
          break;
        }
      }
    }
    
    data.merchant.city = extractField('City', text);
    data.merchant.state = extractField('State', text);
    data.merchant.zipcode = extractField('Postal Code', text);
    data.merchant.dbaPhone = extractField('Phone Number', text);
    data.merchant.contactName = extractField('Contact Name', text);

    // Terminal Information
    data.terminal.terminalId = extractField('V Number', text);
    data.terminal.terminalNumber = extractField('Terminal#', text);
    data.terminal.bin = extractField('BIN', text);
    data.terminal.chainNumber = extractField('Chain', text);
    data.terminal.storeNumber = extractField('Store Number', text);
    data.terminal.agentNumber = extractField('Agent', text);
    data.terminal.locationNumber = extractField('Location Number', text);

    // Time Zone - prefer Time Zone Differential, fallback to Time Zone Code
    const timeZoneDifferential = extractField('Time Zone Differential', text);
    const timeZoneCode = extractField('Time Zone Code', text);
    data.terminal.timeZoneInd = timeZoneDifferential || timeZoneCode;

    // Category Code (MCC) - try multiple variations
    data.terminal.sicCode = extractField('VISA MCC', text) || 
                            extractField('VISA MCC:', text) ||
                            extractField('MCC', text) ||
                            extractField('MCC:', text);
    
    // Debug logging for SIC code
    if (!data.terminal.sicCode) {
      console.log('[parsePropelr] Could not extract VISA MCC/SIC Code');
      console.log('[parsePropelr] Text contains "VISA MCC":', text.includes('VISA MCC'));
      console.log('[parsePropelr] Text contains "MCC":', text.includes('MCC'));
      // Try to find any 4-digit code that might be the MCC
      const mccMatch = text.match(/\b(\d{4})\b/);
      if (mccMatch) {
        console.log('[parsePropelr] Found potential MCC code:', mccMatch[1]);
      }
    } else {
      console.log('[parsePropelr] Extracted SIC Code:', data.terminal.sicCode);
    }

    // Debit Information - only extract if present (will be populated from UI if Processing Debit = Yes)
    // Don't extract from VAR sheet, these are standard values set by user selection
    // data.debit.merchantABA = extractField('Merchant ABA Number', text);
    // data.debit.reimbursementAttribute = extractField('Reimbursement Attribute', text);
    // data.debit.settlementAgent = extractField('Merchant Settlement Agent', text);

    // Card Types
    const cardTypesText = extractField('Card Type Accepted', text) || extractField('Card Type Accepted:', text);
    if (cardTypesText) {
      const cardTypes = cardTypesText.split(',').map(ct => ct.trim());
      data.cardTypes.visa = cardTypes.some(ct => /visa/i.test(ct));
      data.cardTypes.mastercard = cardTypes.some(ct => /master/i.test(ct));
      data.cardTypes.amex = cardTypes.some(ct => /american express/i.test(ct));
      data.cardTypes.discover = cardTypes.some(ct => /discover/i.test(ct));
      data.cardTypes.jcb = cardTypes.some(ct => /jcb/i.test(ct));
    }

    // Industry
    const industry = extractField('Industry', text) || extractField('Industry:', text);
    if (industry) {
      data.merchant.industry = industry;
    }

    return data;
  }

  /**
   * Parse Heartland VAR sheet format
   * @param {string} text - PDF text content
   * @returns {Object} Parsed VAR data
   */
  static parseHeartland(text) {
    const data = {
      format: 'Heartland',
      merchant: {},
      terminal: {
        sicCode: '' // Always initialize sicCode so it shows in UI even if empty
      },
      cardTypes: {},
      debit: {}
    };
    
    // EXTRACT MERCHANT NAME FIRST - before anything else can interfere
    console.log('[parseHeartland] ===== STARTING MERCHANT NAME EXTRACTION =====');
    // Try multiple patterns - word boundary might not work when value is directly before label
    // The PDF shows "Merchant Name: WEATHERTECH" but extracted text shows "WEATHERTECHMerchant Name"
    const merchantNameLabelMatch = text.match(/Merchant\s+Name/i);
    
    if (merchantNameLabelMatch) {
      const merchantNameLabelIndex = merchantNameLabelMatch.index;
      const beforeLabel = text.substring(0, merchantNameLabelIndex);
      
      console.log('[parseHeartland] Found "Merchant Name" at index:', merchantNameLabelIndex);
      console.log('[parseHeartland] Text before label (last 100 chars):', beforeLabel.substring(Math.max(0, beforeLabel.length - 100)));
      
      let extractedName = null;
      
      // Method 1: Extract from "CURBSTONE CARD" to "Merchant Name"
      // This works for both formats:
      // - "CURBSTONE CARD\nBRONCO EQUIPMENT RENTAL\n& SALE\nMerchant Name" (multi-line)
      // - "CURBSTONE CARD\nWEATHERTECHMerchant Name" (single line, no newline before label)
      const curbstoneMatch = beforeLabel.match(/CURBSTONE\s+CARD[\s\n]*/i);
      if (curbstoneMatch) {
        const startIndex = curbstoneMatch.index + curbstoneMatch[0].length;
        extractedName = beforeLabel.substring(startIndex).trim();
        console.log('[parseHeartland] Method 1 (after CURBSTONE CARD) - extracted:', JSON.stringify(extractedName));
      } else {
        // Method 2: If there's a newline, extract everything after the last newline
        const lastNewlineIndex = beforeLabel.lastIndexOf('\n');
        if (lastNewlineIndex >= 0) {
          extractedName = beforeLabel.substring(lastNewlineIndex + 1).trim();
          console.log('[parseHeartland] Method 2 (after newline) - extracted:', JSON.stringify(extractedName));
        } else {
          // Method 3: No newline - value is directly before label (e.g., "WEATHERTECHMerchant Name")
          // Try regex to match uppercase text directly before "Merchant Name"
          const directMatch = beforeLabel.match(/([A-Z][A-Z\s&]{2,})(?=Merchant\s+Name)$/);
          if (directMatch && directMatch[1]) {
            extractedName = directMatch[1].trim();
            console.log('[parseHeartland] Method 3 (regex direct match) - extracted:', JSON.stringify(extractedName));
          } else {
            // Last resort: take everything before "Merchant Name"
            extractedName = beforeLabel.trim();
            console.log('[parseHeartland] Method 4 (everything before label) - extracted:', JSON.stringify(extractedName));
          }
        }
      }
      
      // Clean and validate the extracted name
      if (extractedName) {
        // Remove any trailing "Merchant Name" if it got included
        extractedName = extractedName.replace(/Merchant\s+Name\s*$/i, '').trim();
        
        // Filter validation
        if (extractedName && 
            extractedName.length > 0 && 
            extractedName.length < 200 &&
            /^[A-Z]/.test(extractedName) &&
            !extractedName.match(/^CURBSTONE\s+CARD/i) &&
            !extractedName.match(/^Parameter\s+Sheet/i) &&
            !extractedName.match(/^Heartland\s+Payment/i) &&
            !extractedName.match(/^Jeffersonville/i) &&
            !extractedName.match(/^Customer\s+Service/i)) {
          data.merchant.dbaName = extractedName;
          console.log('[parseHeartland] ✓✓✓ SUCCESS - Set data.merchant.dbaName to:', data.merchant.dbaName);
        } else {
          console.log('[parseHeartland] ✗ EXTRACTION FILTERED OUT:', JSON.stringify(extractedName));
          console.log('[parseHeartland]   - length:', extractedName.length);
          console.log('[parseHeartland]   - starts with uppercase:', /^[A-Z]/.test(extractedName));
        }
      }
    } else {
      console.log('[parseHeartland] ✗ Could not find "Merchant Name" label in text');
    }
    console.log('[parseHeartland] ===== RESULT: data.merchant.dbaName =', data.merchant.dbaName, '=====');

    // Debug: log the extracted text to see the actual format
    console.log('[parseHeartland] Full extracted text (first 2000 chars):', text.substring(0, 2000));
    console.log('[parseHeartland] Text contains pipes:', text.includes('|'));
    console.log('[parseHeartland] Text contains "Merchant Name":', text.includes('Merchant Name'));
    console.log('[parseHeartland] Text contains "MID":', text.includes('MID'));

    // List of all known Heartland field labels to help determine where values end
    const knownFieldLabels = [
      'Merchant Name', 'Merchant Contact', 'DBA Address 1', 'DBA Address 2', 'DBA City', 'DBA State', 'DBA Zip', 'DBA Phone',
      'Time Zone', 'Daylight Savings', 'SIC', 'Industry', 'Country Code', 'Currency Code', 'Language',
      'Acquiring Bank Name/Bin', 'Agent Number', 'Chain Number', 'MID', 'Store Number', 'Merchant Location Number',
      'Terminal Number', 'Terminal TID', 'IP Address', 'Authorization Port Number', 'Settlement Port Number',
      'AMEX Merchant Number', 'Discover Merchant Number', 'Discover Voice Auth Number', 'JCB Merchant Number',
      'JCB Voice Auth Number', 'Diners Merchant Number', 'Visa/MC Voice Auth Number', 'Debit', 'Merchant Agent',
      'Sharing Group', 'Reimbursement Attribute', 'Primary Auth Number', 'Primary Settlement Number',
      'Secondary Auth Number', 'Secondary Settlement Number', 'Settlement Agent #(FIID)', 'Merchant ABA', 'HMS Domain'
    ];

    // NEW APPROACH: Build a map of all label-value pairs by splitting on labels
    // This is more reliable than trying to find previous labels
    const fieldMap = {};
    
    // Special case: Merchant Name value appears BEFORE the "Merchant Name" label
    // Pattern can be: "VALUEMerchant Name" (no separator) or "VALUE\nMerchant Name" (with newline)
    // Example: "WEATHERTECHMerchant Name" or "EQUIPMENT FINDERSMerchant Name"
    
    // NOTE: merchantNameLabelMatch was already found above, reuse it if extraction didn't work
    // Only do additional extraction if dbaName is still empty
    if (!data.merchant.dbaName && merchantNameLabelMatch) {
      const merchantNameLabelIndex = merchantNameLabelMatch.index;
      const beforeLabel = text.substring(0, merchantNameLabelIndex);
      
      // Extract everything after the last newline - this should be the merchant name value
      // Example: "CURBSTONE CARD\nWEATHERTECHMerchant Name" -> afterLastNewline = "WEATHERTECH"
      const lastNewlineIndex = beforeLabel.lastIndexOf('\n');
      const afterLastNewline = beforeLabel.substring(lastNewlineIndex + 1).trim();
      
      console.log('[parseHeartland] Direct extraction - beforeLabel length:', beforeLabel.length);
      console.log('[parseHeartland] Direct extraction - lastNewlineIndex:', lastNewlineIndex);
      console.log('[parseHeartland] Direct extraction - afterLastNewline:', JSON.stringify(afterLastNewline));
      
      if (afterLastNewline && 
          afterLastNewline.length > 0 && 
          afterLastNewline.length < 200 &&
          /^[A-Z]/.test(afterLastNewline) &&  // Starts with uppercase letter
          !afterLastNewline.match(/^CURBSTONE\s+CARD/i) &&
          !afterLastNewline.match(/^Parameter\s+Sheet/i) &&
          !afterLastNewline.match(/^Heartland\s+Payment/i) &&
          !afterLastNewline.match(/^Jeffersonville/i) &&
          !afterLastNewline.match(/^Customer\s+Service/i)) {
        fieldMap['Merchant Name'] = afterLastNewline;
        // DIRECTLY set the merchant name to ensure it's not lost
        data.merchant.dbaName = afterLastNewline;
        console.log('[parseHeartland] ✓ Extracted Merchant Name (direct - after last newline):', afterLastNewline);
        console.log('[parseHeartland] ✓ DIRECTLY set data.merchant.dbaName to:', data.merchant.dbaName);
      } else {
        console.log('[parseHeartland] ✗ Direct extraction filtered out:', afterLastNewline);
      }
    }
    
    // Fallback: Find the position of "Merchant Name" label and extract from beforeLabel
    // NOTE: merchantNameLabelMatch was already found above, reuse it
    if (!fieldMap['Merchant Name'] && !data.merchant.dbaName) {
      // Reuse merchantNameLabelMatch from above if it exists, otherwise find it again
      const merchantNameMatch = merchantNameLabelMatch || text.match(/\bMerchant\s+Name\b/i);
      
      if (merchantNameMatch) {
        const merchantNameLabelIndex = merchantNameMatch.index;
        
        // Extract text immediately before "Merchant Name" label
      // Look backwards from the label to find where the value starts
      // The value could be on the same line (no separator) or on previous lines
      
      // Method 1: Extract text directly before label (handles "VALUEMerchant Name" format)
      // Find the start of the value by looking backwards for:
      // - End of previous field (another label or newline)
      // - "CURBSTONE CARD" marker
      // - Start of line
      
      let valueStartIndex = 0;
      
      // Look for "CURBSTONE CARD" before the label
      const beforeLabel = text.substring(0, merchantNameLabelIndex);
      const curbstoneCardMatch = beforeLabel.match(/CURBSTONE\s+CARD[\s\n]*/i);
      
      if (curbstoneCardMatch) {
        // Start after "CURBSTONE CARD"
        valueStartIndex = curbstoneCardMatch.index + curbstoneCardMatch[0].length;
      } else {
        // Look for the previous label before "Merchant Name"
        // Find the last occurrence of any known label before "Merchant Name"
        let lastLabelEnd = 0;
        for (const label of knownFieldLabels) {
          if (label === 'Merchant Name') continue;
          const labelPattern = new RegExp(`\\b${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          const matches = [...beforeLabel.matchAll(labelPattern)];
          for (const match of matches) {
            const labelEnd = match.index + match[0].length;
            if (labelEnd > lastLabelEnd && labelEnd < merchantNameLabelIndex) {
              lastLabelEnd = labelEnd;
            }
          }
        }
        valueStartIndex = lastLabelEnd;
      }
      
      // Extract the merchant name value
      const merchantNameText = text.substring(valueStartIndex, merchantNameLabelIndex).trim();
      
      console.log('[parseHeartland] Method 1 - valueStartIndex:', valueStartIndex, 'merchantNameLabelIndex:', merchantNameLabelIndex);
      console.log('[parseHeartland] Method 1 - Extracted text:', JSON.stringify(merchantNameText));
      
      if (merchantNameText) {
        // Clean up: remove extra whitespace, handle line breaks, preserve & symbol
        let merchantName = merchantNameText
          .replace(/\n+/g, ' ')   // Replace newlines with spaces
          .replace(/\s+/g, ' ')   // Normalize multiple spaces to single space
          .replace(/\s*&\s*/g, ' & ')  // Normalize & with spaces
          .trim();
        
        // Filter out lines that are clearly not merchant names
        if (merchantName && 
            merchantName.length > 0 && 
            merchantName.length < 200 &&
            !merchantName.match(/^\d+$/) &&  // Not just numbers
            !merchantName.match(/^[\d\s\-\(\)]+$/) &&  // Not phone number format
            !merchantName.match(/^Parameter\s+Sheet/i) &&  // Not header text
            !merchantName.match(/^Heartland\s+Payment/i) &&  // Not header text
            !merchantName.match(/^Jeffersonville/i) &&  // Not header text
            !merchantName.match(/^CURBSTONE\s+CARD/i)) {  // Not header text
          fieldMap['Merchant Name'] = merchantName;
          data.merchant.dbaName = merchantName; // Direct assignment
          console.log('[parseHeartland] Extracted Merchant Name (before label):', merchantName);
        } else {
          console.log('[parseHeartland] Merchant name text found but filtered out:', merchantName);
        }
      }
      
      // Method 2: Extract text directly before "Merchant Name" - SIMPLIFIED APPROACH
      // For cases like "WEATHERTECHMerchant Name", extract everything after the last newline
      if (!fieldMap['Merchant Name']) {
        // Get text after the last newline in beforeLabel - this should be the merchant name value
        // Example: "CURBSTONE CARD\nWEATHERTECHMerchant Name" -> beforeLabel ends with "WEATHERTECH"
        const lastNewlineIndex = beforeLabel.lastIndexOf('\n');
        const afterLastNewline = beforeLabel.substring(lastNewlineIndex + 1).trim();
        
        console.log('[parseHeartland] Method 2 - beforeLabel length:', beforeLabel.length);
        console.log('[parseHeartland] Method 2 - lastNewlineIndex:', lastNewlineIndex);
        console.log('[parseHeartland] Method 2 - afterLastNewline:', JSON.stringify(afterLastNewline));
        
        if (afterLastNewline && 
            afterLastNewline.length > 0 && 
            afterLastNewline.length < 200 &&
            /^[A-Z]/.test(afterLastNewline) &&  // Starts with uppercase letter
            !afterLastNewline.match(/^CURBSTONE\s+CARD/i) &&
            !afterLastNewline.match(/^Parameter\s+Sheet/i) &&
            !afterLastNewline.match(/^Heartland\s+Payment/i) &&
            !afterLastNewline.match(/^Jeffersonville/i) &&
            !afterLastNewline.match(/^Customer\s+Service/i)) {
          fieldMap['Merchant Name'] = afterLastNewline;
          data.merchant.dbaName = afterLastNewline; // Direct assignment
          console.log('[parseHeartland] ✓ Extracted Merchant Name (after last newline):', afterLastNewline);
        } else {
          console.log('[parseHeartland] ✗ Method 2 filtered out:', afterLastNewline);
        }
      }
      
      // Method 3: Try regex match on full text for value directly before "Merchant Name"
      if (!fieldMap['Merchant Name']) {
        // Match uppercase text that ends immediately before "Merchant Name" (no separator)
        // Extract a window of text just before the label to avoid matching earlier text
        const windowStart = Math.max(0, merchantNameLabelIndex - 100);
        const textWindow = text.substring(windowStart, merchantNameLabelIndex);
        
        // Match uppercase text at the end of the window (directly before "Merchant Name")
        const windowMatch = textWindow.match(/([A-Z][A-Z\s&]{2,})(?=Merchant\s+Name\b)$/);
        if (windowMatch && windowMatch[1]) {
          let merchantName = windowMatch[1]
            .replace(/\s+/g, ' ')
            .trim();
          if (merchantName && 
              merchantName.length > 0 && 
              merchantName.length < 200 &&
              !merchantName.match(/^CURBSTONE\s+CARD/i) &&
              !merchantName.match(/^Parameter\s+Sheet/i) &&
              !merchantName.match(/^Heartland\s+Payment/i) &&
              !merchantName.match(/^Jeffersonville/i)) {
            fieldMap['Merchant Name'] = merchantName;
            data.merchant.dbaName = merchantName; // Direct assignment
            console.log('[parseHeartland] ✓ Extracted Merchant Name (regex window):', merchantName);
          }
        }
      }
      }
    }
    
    // Fallback: Try regex patterns if direct extraction didn't work
    if (!fieldMap['Merchant Name']) {
      const merchantNamePatterns = [
        /CURBSTONE\s+CARD\s*\n\s*([A-Z][^\n]+(?:\n\s*[&][^\n]+)?)\s*\n\s*Merchant\s+Name/i,
        /CURBSTONE\s+CARD\s*\n\s*([^\n]+(?:\n[^\n]+)*?)\s*\n\s*Merchant\s+Name/i,
        /([A-Z][A-Z\s&]{2,})(?=Merchant\s+Name\b)/i,  // Match uppercase text directly before "Merchant Name" (no separator)
        /(CONNECT\s+SERVICES\s+EQUIPMENT\s+REN)\s*Merchant\s+Name/i
      ];
      
      for (const pattern of merchantNamePatterns) {
        const merchantNameMatch = text.match(pattern);
        if (merchantNameMatch && merchantNameMatch[1]) {
          let merchantName = merchantNameMatch[1]
            .replace(/\n+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\s*&\s*/g, ' & ')
            .trim();
          
          // Additional filtering
          if (merchantName && 
              merchantName.length > 0 && 
              merchantName.length < 200 &&
              !merchantName.match(/^Parameter\s+Sheet/i) &&
              !merchantName.match(/^Heartland\s+Payment/i) &&
              !merchantName.match(/^CURBSTONE\s+CARD/i) &&
              !merchantName.match(/^Jeffersonville/i)) {
            fieldMap['Merchant Name'] = merchantName;
            data.merchant.dbaName = merchantName; // Direct assignment
            console.log('[parseHeartland] Extracted Merchant Name (regex fallback):', merchantName);
            break;
          }
        }
      }
    }
    
    // For all other fields, find labels and extract values directly before them
    // The format is: ValueLabel (no separator)
    // Process labels in order of appearance to get correct values
    const labelPositions = [];
    for (const fieldLabel of knownFieldLabels) {
      if (fieldLabel === 'Merchant Name') continue; // Already handled
      
      const escapedLabel = fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Try multiple patterns: word boundary, direct match, with space before
      const patterns = [
        new RegExp(`\\b${escapedLabel}\\b`, 'gi'),
        new RegExp(`${escapedLabel}`, 'gi'),
        new RegExp(`\\s+${escapedLabel}\\b`, 'gi')
      ];
      
      for (const pattern of patterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          labelPositions.push({
            label: fieldLabel,
            index: match.index,
            endIndex: match.index + match[0].length,
            matchText: match[0]
          });
          break; // Use first match for this pattern
        }
        if (matches.length > 0) break; // Found with this pattern, move to next label
      }
    }
    
    // Sort by position
    labelPositions.sort((a, b) => a.index - b.index);
    
    console.log('[parseHeartland] Found label positions:', labelPositions.slice(0, 10).map(p => ({
      label: p.label,
      index: p.index,
      snippet: text.substring(Math.max(0, p.index - 30), p.index + p.label.length + 10)
    })));
    
    // Extract value for each label (what's between previous label and current label)
    for (let i = 0; i < labelPositions.length; i++) {
      const current = labelPositions[i];
      const prev = i > 0 ? labelPositions[i - 1] : null;
      
      const valueStart = prev ? prev.endIndex : 0;
      const valueEnd = current.index;
      
      let value = text.substring(valueStart, valueEnd).trim();
      
      // Clean up: remove newlines, normalize whitespace
      value = value.replace(/\s+/g, ' ').replace(/\n/g, ' ').trim();
      
      // Only store if we haven't seen this label yet (take first occurrence)
      if (!fieldMap[current.label] && value) {
        fieldMap[current.label] = value;
      }
    }
    
    // Helper function to get value from map
    const extractField = (label) => {
      return fieldMap[label] || '';
    };

    // Merchant Information
    data.merchant.merchantId = extractField('MID');
    // Use fieldMap directly to ensure we get the extracted value
    // IMPORTANT: For Heartland, this is "Merchant Name" (not "DBA Name" like TSYS)
    // Preserve any value that was set during immediate extraction
    const previouslySetName = data.merchant.dbaName;
    const extractedMerchantName = fieldMap['Merchant Name'] || extractField('Merchant Name');
    
    // Use extracted value if available, otherwise preserve what was set earlier
    if (extractedMerchantName) {
      data.merchant.dbaName = extractedMerchantName;
      console.log('[parseHeartland] Set dbaName from fieldMap/extractField:', data.merchant.dbaName);
    } else if (previouslySetName) {
      // Preserve the value that was set during immediate extraction
      data.merchant.dbaName = previouslySetName;
      console.log('[parseHeartland] Preserved previously set dbaName:', data.merchant.dbaName);
    } else {
      console.log('[parseHeartland] WARNING: Merchant Name is still empty after all extraction attempts!');
      console.log('[parseHeartland]   - previouslySetName:', previouslySetName);
      console.log('[parseHeartland]   - fieldMap["Merchant Name"]:', fieldMap['Merchant Name']);
      console.log('[parseHeartland]   - extractField("Merchant Name"):', extractField('Merchant Name'));
    }
    console.log('[parseHeartland] Final assignment - fieldMap["Merchant Name"]:', fieldMap['Merchant Name']);
    console.log('[parseHeartland] Final assignment - extractField("Merchant Name"):', extractField('Merchant Name'));
    console.log('[parseHeartland] Final assignment - data.merchant.dbaName:', data.merchant.dbaName);
    data.merchant.address = extractField('DBA Address 1');
    data.merchant.city = extractField('DBA City');
    data.merchant.state = extractField('DBA State');
    data.merchant.zipcode = extractField('DBA Zip');
    data.merchant.dbaPhone = extractField('DBA Phone');
    
    // Terminal Information
    data.terminal.terminalId = extractField('Terminal TID');
    data.terminal.terminalNumber = extractField('Terminal Number');
    
    // Acquiring Bank Name/Bin - extract just the number at the end
    const acquiringBank = extractField('Acquiring Bank Name/Bin');
    if (acquiringBank) {
      // Extract number at the end (e.g., "Wells Fargo Bank / 440369" -> "440369")
      const binMatch = acquiringBank.match(/(\d+)\s*$/);
      if (binMatch) {
        data.terminal.bin = binMatch[1];
      } else {
        data.terminal.bin = acquiringBank;
      }
    }
    
    data.terminal.agentNumber = extractField('Agent Number');
    data.terminal.chainNumber = extractField('Chain Number');
    data.terminal.storeNumber = extractField('Store Number');
    data.terminal.timeZoneInd = extractField('Time Zone');
    data.terminal.sicCode = extractField('SIC');
    
    // Debug logging
    console.log('[parseHeartland] Field map sample:', {
      'Merchant Name': fieldMap['Merchant Name'],
      'Merchant Contact': fieldMap['Merchant Contact'],
      'DBA Address 1': fieldMap['DBA Address 1'],
      'DBA City': fieldMap['DBA City'],
      'MID': fieldMap['MID'],
      'SIC': fieldMap['SIC'],
      'Terminal Number': fieldMap['Terminal Number'],
      'Terminal TID': fieldMap['Terminal TID']
    });
    
    console.log('[parseHeartland] Extracted merchant data:', {
      merchantId: data.merchant.merchantId,
      dbaName: data.merchant.dbaName,
      address: data.merchant.address,
      city: data.merchant.city,
      state: data.merchant.state,
      zipcode: data.merchant.zipcode,
      dbaPhone: data.merchant.dbaPhone
    });
    
    console.log('[parseHeartland] Extracted terminal data:', {
      terminalId: data.terminal.terminalId,
      terminalNumber: data.terminal.terminalNumber,
      bin: data.terminal.bin,
      agentNumber: data.terminal.agentNumber,
      chainNumber: data.terminal.chainNumber,
      storeNumber: data.terminal.storeNumber,
      timeZoneInd: data.terminal.timeZoneInd,
      sicCode: data.terminal.sicCode
    });

    // FINAL CHECK: Ensure merchant name is set before returning
    console.log('[parseHeartland] FINAL CHECK - fieldMap["Merchant Name"]:', fieldMap['Merchant Name']);
    console.log('[parseHeartland] FINAL CHECK - data.merchant.dbaName BEFORE final assignment:', data.merchant.dbaName);
    
    // Force set from fieldMap if it exists and dbaName is empty
    if (!data.merchant.dbaName && fieldMap['Merchant Name']) {
      data.merchant.dbaName = fieldMap['Merchant Name'];
      console.log('[parseHeartland] FINAL CHECK - FORCED assignment of dbaName from fieldMap:', data.merchant.dbaName);
    }
    
    console.log('[parseHeartland] FINAL CHECK - data.merchant.dbaName AFTER final assignment:', data.merchant.dbaName);
    console.log('[parseHeartland] FINAL CHECK - Returning data.merchant:', JSON.stringify(data.merchant, null, 2));

    return data;
  }

  /**
   * Parse UR VAR sheet format
   * @param {string} text - PDF text content
   * @returns {Object} Parsed VAR data
   */
  static parseUR(text) {
    console.log('[parseUR] Starting UR VAR parsing');
    console.log('[parseUR] Text length:', text.length);
    console.log('[parseUR] First 1000 chars:', text.substring(0, 1000));
    console.log('[parseUR] Text contains pipes:', text.includes('|'));
    console.log('[parseUR] Text contains "Merchant Number":', text.includes('Merchant Number'));
    console.log('[parseUR] Text contains "Acquiring Bank":', text.includes('Acquiring Bank'));
    
    const data = {
      format: 'UR',
      merchant: {},
      terminal: {
        sicCode: '' // Always initialize sicCode so it shows in UI even if empty
      },
      cardTypes: {},
      debit: {},
      ur: {} // UR-specific fields
    };

    // List of all known UR VAR field labels
    const knownFieldLabels = [
      'Acquiring Bank ID/BIN (6 digits)', 'Agent Number (6 digits)', 'Chain Code (6 digits)',
      'Merchant Number (12 digits)', 'VisaNet Terminal ID (8 digits)', 'Location Code # (5 digits)',
      'Store # (4 digits)', 'Terminal # (4 digits)', 'Merchant Category/SIC Code (4 digits)',
      'Country Code (3 digits)', 'Time Zone Differential (3 digits)',
      'Merchant Name (various)', 'Merchant Physical Address', 'Merchant City (various)',
      'Merchant State (2 characters)', 'Merchant City/Location/Zip Code (5 digits)',
      'Merchant Security Code (5 characters)', 'Primary Authorization Phone # (1-24 digits)',
      'Secondary Authorization Phone # (1-24 digits)', 'Primary Settlement Phone # (1-24 digits)',
      'Secondary Settlement Phone # (1-24 digits)', 'American Express ID #',
      'Discover ID #', 'Diners ID #', 'JCB ID #', 'Authentication Code',
      'Sharing Groups', 'ABA', 'Settlement', 'Re-imbursement Attribute'
    ];

    // Helper function to extract field value from table format
    const extractField = (label, text) => {
      const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Try multiple patterns for the label - UR VAR uses table format: | Label | Value |
      // Also handle cases where pipes might not be present in extracted text
      const labelPatterns = [
        // Table format with pipes: | Label | Value |
        new RegExp(`\\|\\s*${escapedLabel}\\s*\\|\\s*([^|]+?)\\s*\\|`, 'i'),
        // Table format: | Label | Value (no closing pipe)
        new RegExp(`\\|\\s*${escapedLabel}\\s*\\|\\s*([^|\\r\\n]+)`, 'i'),
        // Table format: Label | Value |
        new RegExp(`${escapedLabel}\\s*\\|\\s*([^|]+?)\\s*\\|`, 'i'),
        // Table format: Label | Value (no closing pipe)
        new RegExp(`${escapedLabel}\\s*\\|\\s*([^|\\r\\n]+)`, 'i'),
        // UR VAR format: Label on one line, value on next line (most common for UR VAR)
        new RegExp(`${escapedLabel}\\s*[\\r\\n]+\\s*([^\\r\\n]+?)(?=\\s*[\\r\\n]|$)`, 'i'),
        // Standard format: Label: value
        new RegExp(`${escapedLabel}\\s*:\\s*([^\\r\\n]+)`, 'i'),
        // Label followed by value on same line (no colon or pipe) - but stop at newline or next field label
        new RegExp(`${escapedLabel}\\s+([A-Z0-9\\s,.-]+?)(?=\\s*[\\r\\n]|\\s+[A-Z][a-z])`, 'i')
      ];
      
      let labelMatch = null;
      let valueGroup = null;
      
      for (let i = 0; i < labelPatterns.length; i++) {
        labelMatch = text.match(labelPatterns[i]);
        if (labelMatch) {
          // If pattern has a capture group, use it (for table format with value)
          if (labelMatch.length > 1 && labelMatch[1]) {
            valueGroup = labelMatch[1];
            console.log(`[parseUR] extractField "${label}" matched pattern ${i}, captured: "${valueGroup}"`);
            break;
          }
        }
      }
      
      if (!labelMatch) {
        console.log(`[parseUR] extractField "${label}" - no match found`);
        // Try to find the label in the text to see what's around it
        const labelIndex = text.toLowerCase().indexOf(label.toLowerCase());
        if (labelIndex >= 0) {
          const context = text.substring(Math.max(0, labelIndex - 50), Math.min(text.length, labelIndex + label.length + 100));
          console.log(`[parseUR] extractField "${label}" - found label at index ${labelIndex}, context: "${context}"`);
        }
        return '';
      }
      
      let value = '';
      
      if (valueGroup) {
        // Value was captured directly from the table
        value = valueGroup.trim();
        // Clean up: remove any trailing field labels that might have been captured
        // Stop at newline or at the start of any known field label
        for (const nextLabel of knownFieldLabels) {
          if (nextLabel.toLowerCase() === label.toLowerCase()) continue;
          const escapedNextLabel = nextLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const nextLabelPattern = new RegExp(`(.+?)(?:\\s*[\\r\\n]|\\s+)${escapedNextLabel}`, 'i');
          const match = value.match(nextLabelPattern);
          if (match && match[1]) {
            value = match[1].trim();
            break;
          }
        }
        // Also stop at newline if present
        const newlineIndex = value.indexOf('\n');
        if (newlineIndex >= 0) {
          value = value.substring(0, newlineIndex).trim();
        }
        const crIndex = value.indexOf('\r');
        if (crIndex >= 0) {
          value = value.substring(0, crIndex).trim();
        }
      } else {
        // Get the position after the label
        const startPos = labelMatch.index + labelMatch[0].length;
        let remainingText = text.substring(startPos);
        
        // Trim leading whitespace and pipes
        remainingText = remainingText.replace(/^\s*\|\s*/, '').trim();
        
        // Find where the value ends by looking for:
        // 1. Table pipe separator (|) - most reliable for table format
        // 2. Newline followed by pipe (next table row)
        // 3. Next known field label
        let endPos = remainingText.length;
        
        // Check for table pipe separator first (most reliable)
        const pipeMatch = remainingText.match(/\|/);
        if (pipeMatch) {
          endPos = pipeMatch.index;
        } else {
          // Look for newline followed by pipe or field label
          const newlineMatch = remainingText.match(/[\r\n]+/);
          if (newlineMatch) {
            const afterNewline = remainingText.substring(newlineMatch.index + newlineMatch[0].length);
            // Check if next line starts with pipe (table row) or field label
            if (/^\s*\|/.test(afterNewline) || knownFieldLabels.some(fl => {
              const escaped = fl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              return new RegExp(`^\\s*${escaped}`, 'i').test(afterNewline);
            })) {
              endPos = newlineMatch.index;
            }
          }
          
          // Also check for next field label
          let minNextFieldPos = remainingText.length;
          for (const nextLabel of knownFieldLabels) {
            if (nextLabel.toLowerCase() === label.toLowerCase()) continue;
            
            const escapedNextLabel = nextLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const nextLabelPatterns = [
              new RegExp(`\\|\\s*${escapedNextLabel}`, 'i'),
              new RegExp(`\\s+${escapedNextLabel}\\s*:`, 'i'),
              new RegExp(`${escapedNextLabel}\\s*:`, 'i')
            ];
            
            for (const pattern of nextLabelPatterns) {
              const match = remainingText.match(pattern);
              if (match && match.index < minNextFieldPos) {
                minNextFieldPos = match.index;
              }
            }
          }
          
          if (minNextFieldPos < endPos) {
            endPos = minNextFieldPos;
          }
        }
        
        // Extract the value
        value = remainingText.substring(0, endPos).trim();
      }
      
      // Clean up: remove pipes, extra whitespace, trailing colons
      value = value.replace(/^\|+|\|+$/g, '').trim();
      value = value.replace(/\s+/g, ' ').trim();
      value = value.replace(/[:;]\s*$/, '').trim();
      
      return value;
    };

    // Merchant Information
    data.merchant.merchantId = extractField('Merchant Number (12 digits)', text);
    console.log('[parseUR] Merchant Number (12 digits):', data.merchant.merchantId);
    
    data.merchant.dbaName = extractField('Merchant Name (various)', text);
    console.log('[parseUR] Merchant Name (various):', data.merchant.dbaName);
    
    data.merchant.address = extractField('Merchant Physical Address', text);
    console.log('[parseUR] Merchant Physical Address:', data.merchant.address);
    
    data.merchant.city = extractField('Merchant City (various)', text);
    console.log('[parseUR] Merchant City (various):', data.merchant.city);
    
    data.merchant.state = extractField('Merchant State (2 characters)', text);
    console.log('[parseUR] Merchant State (2 characters):', data.merchant.state);
    
    data.merchant.zipcode = extractField('Merchant City/Location/Zip Code (5 digits)', text);
    console.log('[parseUR] Merchant City/Location/Zip Code (5 digits):', data.merchant.zipcode);
    
    // Terminal Information
    data.terminal.terminalId = extractField('VisaNet Terminal ID (8 digits)', text);
    console.log('[parseUR] VisaNet Terminal ID (8 digits):', data.terminal.terminalId);
    
    data.terminal.terminalNumber = extractField('Terminal # (4 digits)', text);
    console.log('[parseUR] Terminal # (4 digits):', data.terminal.terminalNumber);
    
    data.terminal.bin = extractField('Acquiring Bank ID/BIN (6 digits)', text);
    console.log('[parseUR] Acquiring Bank ID/BIN (6 digits):', data.terminal.bin);
    
    data.terminal.agentNumber = extractField('Agent Number (6 digits)', text);
    console.log('[parseUR] Agent Number (6 digits):', data.terminal.agentNumber);
    
    data.terminal.chainNumber = extractField('Chain Code (6 digits)', text);
    console.log('[parseUR] Chain Code (6 digits):', data.terminal.chainNumber);
    
    data.terminal.storeNumber = extractField('Store # (4 digits)', text);
    console.log('[parseUR] Store # (4 digits):', data.terminal.storeNumber);
    
    data.terminal.sicCode = extractField('Merchant Category/SIC Code (4 digits)', text);
    console.log('[parseUR] Merchant Category/SIC Code (4 digits):', data.terminal.sicCode);
    
    data.terminal.timeZoneInd = extractField('Time Zone Differential (3 digits)', text);
    console.log('[parseUR] Time Zone Differential (3 digits):', data.terminal.timeZoneInd);
    
    // UR-specific fields (these appear outside the table format)
    // Authentication Code - format: "Authentication Code: VNTV090807"
    const authCodeMatch = text.match(/Authentication\s+Code\s*:\s*([A-Z0-9]+)/i);
    if (authCodeMatch && authCodeMatch[1]) {
      data.ur.authenticationCode = authCodeMatch[1].trim();
    }
    console.log('[parseUR] Authentication Code:', data.ur.authenticationCode);
    
    // Sharing Groups - format: "Sharing Groups – UGLYSEQ78HVZ" or "Sharing Groups: UGLYSEQ78HVZ"
    const sharingGroupsMatch = text.match(/Sharing\s+Groups\s*[–\-:]\s*([A-Z0-9]+)/i);
    if (sharingGroupsMatch && sharingGroupsMatch[1]) {
      data.ur.sharingGroups = sharingGroupsMatch[1].trim();
    }
    console.log('[parseUR] Sharing Groups:', data.ur.sharingGroups);
    
    // ABA - format: "ABA: 000000001 (8 zeros ending in a 1)" - extract just the number
    const abaMatch = text.match(/ABA\s*:\s*([0-9]+)/i);
    if (abaMatch && abaMatch[1]) {
      data.ur.aba = abaMatch[1].trim();
    }
    console.log('[parseUR] ABA:', data.ur.aba);
    
    // Settlement - format: "Settlement: V000 (Letter V with 3 zeros)" - extract just the value
    const settlementMatch = text.match(/Settlement\s*:\s*([A-Z0-9]+)/i);
    if (settlementMatch && settlementMatch[1]) {
      data.ur.settlement = settlementMatch[1].trim();
    }
    console.log('[parseUR] Settlement:', data.ur.settlement);
    
    // Re-imbursement Attribute - format: "Re-imbursement Attribute – 0 (zero) or Z" - extract just the value
    const reimbMatch = text.match(/Re-?imbursement\s+Attribute\s*[–\-:]\s*([0-9Z]+)/i);
    if (reimbMatch && reimbMatch[1]) {
      data.ur.reimbursementAttribute = reimbMatch[1].trim();
    }
    console.log('[parseUR] Reimbursement Attribute:', data.ur.reimbursementAttribute);
    
    // Card Types
    const amexId = extractField('American Express ID #', text);
    if (amexId) {
      data.cardTypes.amex = { merchantNumber: amexId };
    }
    
    const discoverId = extractField('Discover ID #', text);
    if (discoverId) {
      data.cardTypes.discover = { merchantNumber: discoverId };
    }
    
    const dinersId = extractField('Diners ID #', text);
    if (dinersId) {
      data.cardTypes.diners = { merchantNumber: dinersId };
    }
    
    const jcbId = extractField('JCB ID #', text);
    if (jcbId) {
      data.cardTypes.jcb = { merchantNumber: jcbId };
    }

    console.log('[parseUR] Extracted merchant data:', {
      merchantId: data.merchant.merchantId,
      dbaName: data.merchant.dbaName,
      address: data.merchant.address,
      city: data.merchant.city,
      state: data.merchant.state,
      zipcode: data.merchant.zipcode
    });
    
    console.log('[parseUR] Extracted terminal data:', {
      terminalId: data.terminal.terminalId,
      terminalNumber: data.terminal.terminalNumber,
      bin: data.terminal.bin,
      agentNumber: data.terminal.agentNumber,
      chainNumber: data.terminal.chainNumber,
      storeNumber: data.terminal.storeNumber,
      sicCode: data.terminal.sicCode,
      timeZoneInd: data.terminal.timeZoneInd
    });
    
    console.log('[parseUR] Extracted UR-specific data:', {
      authenticationCode: data.ur.authenticationCode,
      sharingGroups: data.ur.sharingGroups,
      aba: data.ur.aba,
      settlement: data.ur.settlement,
      reimbursementAttribute: data.ur.reimbursementAttribute
    });

    return data;
  }
}

