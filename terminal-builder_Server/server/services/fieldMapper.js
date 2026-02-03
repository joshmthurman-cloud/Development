/**
 * Field mapping service to convert VAR sheet fields to STEAM field names
 * Based on the TSYS to Steam field names mapping matrix
 */

export class FieldMapper {
  /**
   * Convert time zone number to time zone name
   * @param {string|number} timeZoneValue - Time zone number (705, 706, 707, 708)
   * @returns {string} Time zone name or original value if not found
   */
  static convertTimeZoneToName(timeZoneValue) {
    if (!timeZoneValue) return '';
    const timeZoneMap = {
      '705': 'Eastern',
      '706': 'Central',
      '707': 'Mountain',
      '708': 'Pacific'
    };
    const timeZoneStr = String(timeZoneValue).trim();
    return timeZoneMap[timeZoneStr] || timeZoneValue;
  }

  /**
   * Get timezone from ZIP code
   * Maps US ZIP codes to timezones (Eastern, Central, Mountain, Pacific)
   * @param {string} zipCode - ZIP code (5 digits)
   * @returns {string} Timezone name or empty string if not found
   */
  static getTimezoneFromZip(zipCode) {
    if (!zipCode) return '';
    
    // Extract first 5 digits if ZIP+4 format
    const zip = String(zipCode).trim().substring(0, 5);
    if (!/^\d{5}$/.test(zip)) return '';
    
    const zipNum = parseInt(zip, 10);
    
    // Eastern Time Zone (ET): 01000-02799, 03000-03499, 04000-04999, 05000-05999, 10000-14999
    if ((zipNum >= 1000 && zipNum <= 2799) || 
        (zipNum >= 3000 && zipNum <= 3499) || 
        (zipNum >= 4000 && zipNum <= 4999) || 
        (zipNum >= 5000 && zipNum <= 5999) || 
        (zipNum >= 10000 && zipNum <= 14999)) {
      return 'Eastern';
    }
    
    // Central Time Zone (CT): 35000-39999, 50000-52999, 60000-69999, 70000-79999, 88000-88999
    if ((zipNum >= 35000 && zipNum <= 39999) || 
        (zipNum >= 50000 && zipNum <= 52999) || 
        (zipNum >= 60000 && zipNum <= 69999) || 
        (zipNum >= 70000 && zipNum <= 79999) || 
        (zipNum >= 88000 && zipNum <= 88999)) {
      return 'Central';
    }
    
    // Mountain Time Zone (MT): 80000-83999, 85000-86999
    if ((zipNum >= 80000 && zipNum <= 83999) || 
        (zipNum >= 85000 && zipNum <= 86999)) {
      return 'Mountain';
    }
    
    // Pacific Time Zone (PT): 90000-96699, 97000-97999
    if ((zipNum >= 90000 && zipNum <= 96699) || 
        (zipNum >= 97000 && zipNum <= 97999)) {
      return 'Pacific';
    }
    
    // Additional mappings for common areas
    // Alaska: 99500-99999 (Alaska Time, but we'll map to Pacific for simplicity)
    if (zipNum >= 99500 && zipNum <= 99999) {
      return 'Pacific';
    }
    
    // Hawaii: 96700-96899 (Hawaii Time, but we'll map to Pacific for simplicity)
    if (zipNum >= 96700 && zipNum <= 96899) {
      return 'Pacific';
    }
    
    // Default: try to infer from first digit
    const firstDigit = Math.floor(zipNum / 10000);
    if (firstDigit === 0 || firstDigit === 1 || firstDigit === 2 || firstDigit === 3 || firstDigit === 4) {
      return 'Eastern';
    } else if (firstDigit === 5 || firstDigit === 6 || firstDigit === 7) {
      return 'Central';
    } else if (firstDigit === 8) {
      return 'Mountain';
    } else if (firstDigit === 9) {
      return 'Pacific';
    }
    
    return '';
  }

  /**
   * Map VAR data to STEAM field format
   * @param {Object} varData - Parsed VAR data from VarParser
   * @param {Object} standardFields - Standard fields (Contactless_Signature, etc.)
   * @param {string} varType - VAR type ('TSYS' or 'Heartland')
   * @returns {Object} Mapped STEAM fields
   */
  static mapToSteam(varData, standardFields = {}, varType = 'TSYS') {
    // Initialize all required fields to ensure they always appear in UI
    const steamFields = {
      Merchant_ID: '',
      Merchant_Name: '',
      Merchant_Address: '',
      Merchant_City: '',
      Merchant_State: '',
      Merchant_City_Code: '',
      Merchant_Phone_Number: '',
      Merchant_Time_Zone: '',
      KeyManagement_RKL_Device_GroupName: '',
      TSYS_Merchant_ID: '',
      TSYS_Acquirer_Bin: '',
      TSYS_Agent_Bank_Number: '',
      TSYS_Agent_Chain_Number: '',
      TSYS_Store_Number: '',
      TSYS_Terminal_Number: '',
      TSYS_Category_Code: '',
      TSYS_Terminal_ID: '',
      TSYS_Authentication_Code: '',
      TSYS_Debit_Sharing_Group: '',
      TSYS_Merchant_ABA: '',
      TSYS_Settlement_Agent: '',
      TSYS_Reimbursement_Attribute: ''
    };

    // Handle Propelr format differently (previously called Heartland)
    if (varType === 'Propelr') {
      const propelrFields = this.mapPropelrToSteam(varData, standardFields);
      // Merge propelr fields into initialized fields (preserve all values, including empty strings)
      Object.keys(propelrFields).forEach(key => {
        if (propelrFields[key] !== undefined) {
          steamFields[key] = propelrFields[key];
        }
      });
      // Set KeyManagement_RKL_Device_GroupName for Propelr
      steamFields.KeyManagement_RKL_Device_GroupName = 'WellsTFTSYS-1301';
      return steamFields;
    }

    // Handle Heartland format differently
    if (varType === 'Heartland') {
      const heartlandFields = this.mapHeartlandToSteam(varData, standardFields);
      // Merge heartland fields into initialized fields (preserve all values, including empty strings)
      Object.keys(heartlandFields).forEach(key => {
        if (heartlandFields[key] !== undefined) {
          steamFields[key] = heartlandFields[key];
        }
      });
      // Set KeyManagement_RKL_Device_GroupName for Heartland
      steamFields.KeyManagement_RKL_Device_GroupName = 'TSYSCurbstone-1301';
      return steamFields;
    }

    // Handle UR VAR format differently
    if (varType === 'UR') {
      const urFields = this.mapURToSteam(varData, standardFields);
      // Merge UR fields into initialized fields (preserve all values, including empty strings)
      Object.keys(urFields).forEach(key => {
        if (urFields[key] !== undefined) {
          steamFields[key] = urFields[key];
        }
      });
      // Set KeyManagement_RKL_Device_GroupName for UR VAR
      steamFields.KeyManagement_RKL_Device_GroupName = 'WellsTFTSYS-1301';
      return steamFields;
    }

    // TSYS format (existing logic)

    // Map merchant fields (using STEAM field names from mapping matrix)
    if (varData.merchant) {
      // Merchant_ID maps to Merchant ID (from VAR)
      if (varData.merchant.merchantId) {
        steamFields.Merchant_ID = varData.merchant.merchantId;
      }

      // Merchant_Name maps to DBA Name
      if (varData.merchant.dbaName) {
        steamFields.Merchant_Name = varData.merchant.dbaName;
      }

      // Merchant_Address maps to Address
      if (varData.merchant.address) {
        steamFields.Merchant_Address = varData.merchant.address;
      }

      // Merchant_City maps to Merchant City
      if (varData.merchant.city) {
        steamFields.Merchant_City = varData.merchant.city;
      }

      // Merchant_State maps to Merchant State
      if (varData.merchant.state) {
        steamFields.Merchant_State = varData.merchant.state;
      }

      // Merchant_City_Code maps to Merchant Zipcode
      if (varData.merchant.zipcode) {
        steamFields.Merchant_City_Code = varData.merchant.zipcode;
      }

      // Merchant_Phone_Number maps to DBA Phone
      if (varData.merchant.dbaPhone) {
        steamFields.Merchant_Phone_Number = varData.merchant.dbaPhone;
      }

      // TSYS_Merchant_ID maps to Vital Merchant ID (from VAR terminal section)
      // Note: vitalMerchantId is stored in terminal object, not merchant object
      if (varData.terminal?.vitalMerchantId) {
        steamFields.TSYS_Merchant_ID = varData.terminal.vitalMerchantId;
      } else if (varData.merchant.merchantId) {
        // Fallback to Merchant ID if Vital Merchant ID not available
        steamFields.TSYS_Merchant_ID = varData.merchant.merchantId;
      }
    }

    // Map terminal fields
    if (varData.terminal) {
      // TSYS_Acquirer_Bin maps to Acquirer ID
      if (varData.terminal.acquirerId) {
        steamFields.TSYS_Acquirer_Bin = varData.terminal.acquirerId;
      }

      // TSYS_Agent_Bank_Number maps to Agency Number
      if (varData.terminal.agencyNumber) {
        steamFields.TSYS_Agent_Bank_Number = varData.terminal.agencyNumber;
      }

      // TSYS_Agent_Chain_Number maps to Chain Number
      if (varData.terminal.chainNumber) {
        steamFields.TSYS_Agent_Chain_Number = varData.terminal.chainNumber;
      }

      // TSYS_Store_Number maps to Store Number
      if (varData.terminal.storeNumber) {
        steamFields.TSYS_Store_Number = varData.terminal.storeNumber;
      }

      // TSYS_Terminal_Number maps to Terminal Number
      if (varData.terminal.terminalNumber) {
        steamFields.TSYS_Terminal_Number = varData.terminal.terminalNumber;
      }

      // TSYS_Category_Code maps to SIC Code
      // Always set this field, even if empty, so it shows in UI
      steamFields.TSYS_Category_Code = varData.terminal?.sicCode || '';

      // TSYS_Terminal_ID maps to Terminal ID (replace leading V with 7)
      if (varData.terminal.terminalId) {
        let terminalId = varData.terminal.terminalId;
        // Replace leading V with 7
        if (terminalId.startsWith('V') || terminalId.startsWith('v')) {
          terminalId = '7' + terminalId.substring(1);
        }
        steamFields.TSYS_Terminal_ID = terminalId;
      }

      // Time Zone mapping (already handled above in merchant section, but can also come from terminal)
      // Prefer ZIP code-based timezone over numerical value
      if (!steamFields.Merchant_Time_Zone) {
        if (varData.merchant?.zipcode) {
          const zipTimezone = this.getTimezoneFromZip(varData.merchant.zipcode);
          if (zipTimezone) {
            steamFields.Merchant_Time_Zone = zipTimezone;
          } else if (varData.terminal.timeZoneInd) {
            // Fallback to numerical value if ZIP code mapping fails
            steamFields.Merchant_Time_Zone = this.convertTimeZoneToName(varData.terminal.timeZoneInd);
          }
        } else if (varData.terminal.timeZoneInd) {
          // Use numerical value if no ZIP code available
          steamFields.Merchant_Time_Zone = this.convertTimeZoneToName(varData.terminal.timeZoneInd);
        }
      }
    }

    // Map debit fields - only if Processing_Debit is "MHC" in standardFields
    // For "UR", the values are already populated from UR data, don't overwrite
    if (standardFields.Processing_Debit === 'MHC') {
      // TSYS_Debit_Sharing_Group - standard value
      steamFields.TSYS_Debit_Sharing_Group = 'G8E7LYWQNZV';

      // TSYS_Merchant_ABA - standard value
      steamFields.TSYS_Merchant_ABA = '990025276';

      // TSYS_Settlement_Agent - standard value
      steamFields.TSYS_Settlement_Agent = 'V074';

      // TSYS_Reimbursement_Attribute - standard value
      steamFields.TSYS_Reimbursement_Attribute = 'Z';
    }

    // Add standard fields
    if (standardFields.Contactless_Signature) {
      steamFields.Contactless_Signature = standardFields.Contactless_Signature;
    }

    // Set KeyManagement_RKL_Device_GroupName for TSYS
    steamFields.KeyManagement_RKL_Device_GroupName = 'WellsTFTSYS-1301';

    if (standardFields.Merchant_Time_Zone && !steamFields.Merchant_Time_Zone) {
      steamFields.Merchant_Time_Zone = standardFields.Merchant_Time_Zone;
    }

    // TSYS_Authentication_Code - must be provided by user (includes both TSYS and Heartland codes)
    // This field is not in VAR sheets and must be manually entered
    if (standardFields.TSYS_Authentication_Code) {
      steamFields.TSYS_Authentication_Code = standardFields.TSYS_Authentication_Code;
    }
    // No default - user must provide this value

    return steamFields;
  }

  /**
   * Map Heartland VAR data to STEAM field format
   * @param {Object} varData - Parsed Heartland VAR data
   * @param {Object} standardFields - Standard fields
   * @returns {Object} Mapped STEAM fields
   */
  static mapPropelrToSteam(varData, standardFields = {}) {
    // Initialize all required fields to ensure they always appear in UI
    const steamFields = {
      Merchant_ID: '',
      Merchant_Name: '',
      Merchant_Address: '',
      Merchant_City: '',
      Merchant_State: '',
      Merchant_City_Code: '',
      Merchant_Phone_Number: '',
      Merchant_Time_Zone: '',
      KeyManagement_RKL_Device_GroupName: '',
      TSYS_Merchant_ID: '',
      TSYS_Acquirer_Bin: '',
      TSYS_Agent_Bank_Number: '',
      TSYS_Agent_Chain_Number: '',
      TSYS_Store_Number: '',
      TSYS_Terminal_Number: '',
      TSYS_Category_Code: '',
      TSYS_Terminal_ID: ''
    };

    // Map merchant fields
    if (varData.merchant) {
      // Merchant Number maps to both Merchant_ID and TSYS_Merchant_ID
      if (varData.merchant.merchantId) {
        steamFields.Merchant_ID = varData.merchant.merchantId;
        steamFields.TSYS_Merchant_ID = varData.merchant.merchantId;
      }

      // Merchant Name (DBA Name)
      if (varData.merchant.dbaName) {
        steamFields.Merchant_Name = varData.merchant.dbaName;
      }

      // Address
      if (varData.merchant.address) {
        steamFields.Merchant_Address = varData.merchant.address;
      }

      // City
      if (varData.merchant.city) {
        steamFields.Merchant_City = varData.merchant.city;
      }

      // State
      if (varData.merchant.state) {
        steamFields.Merchant_State = varData.merchant.state;
      }

      // Postal Code maps to Merchant_City_Code
      if (varData.merchant.zipcode) {
        steamFields.Merchant_City_Code = varData.merchant.zipcode;
      }

      // Phone Number
      if (varData.merchant.dbaPhone) {
        steamFields.Merchant_Phone_Number = varData.merchant.dbaPhone;
      }
    }

    // Map terminal fields
    if (varData.terminal) {
      // BIN maps to TSYS_Acquirer_Bin
      if (varData.terminal.bin) {
        steamFields.TSYS_Acquirer_Bin = varData.terminal.bin;
      }

      // Agent maps to TSYS_Agent_Bank_Number
      if (varData.terminal.agentNumber) {
        steamFields.TSYS_Agent_Bank_Number = varData.terminal.agentNumber;
      }

      // Chain maps to TSYS_Agent_Chain_Number
      if (varData.terminal.chainNumber) {
        steamFields.TSYS_Agent_Chain_Number = varData.terminal.chainNumber;
      }

      // Store Number
      if (varData.terminal.storeNumber) {
        steamFields.TSYS_Store_Number = varData.terminal.storeNumber;
      }

      // Terminal# maps to TSYS_Terminal_Number
      if (varData.terminal.terminalNumber) {
        steamFields.TSYS_Terminal_Number = varData.terminal.terminalNumber;
      }

      // VISA MCC maps to TSYS_Category_Code
      // Always set this field, even if empty, so it shows in UI
      steamFields.TSYS_Category_Code = varData.terminal?.sicCode || '';

      // V Number maps to TSYS_Terminal_ID (replace leading V with 7)
      if (varData.terminal.terminalId) {
        let terminalId = varData.terminal.terminalId;
        // Replace leading V with 7
        if (terminalId.startsWith('V') || terminalId.startsWith('v')) {
          terminalId = '7' + terminalId.substring(1);
        }
        steamFields.TSYS_Terminal_ID = terminalId;
      }

      // Time Zone Differential maps to Merchant_Time_Zone
      // Prefer ZIP code-based timezone over numerical value
      if (varData.merchant?.zipcode) {
        const zipTimezone = this.getTimezoneFromZip(varData.merchant.zipcode);
        if (zipTimezone) {
          steamFields.Merchant_Time_Zone = zipTimezone;
        } else if (varData.terminal.timeZoneInd) {
          // Fallback to numerical value if ZIP code mapping fails
          steamFields.Merchant_Time_Zone = this.convertTimeZoneToName(varData.terminal.timeZoneInd);
        }
      } else if (varData.terminal.timeZoneInd) {
        // Use numerical value if no ZIP code available
        steamFields.Merchant_Time_Zone = this.convertTimeZoneToName(varData.terminal.timeZoneInd);
      }
    }

    // Map debit fields - only if Processing_Debit is "MHC" in standardFields
    // For "UR", the values are already populated from UR data, don't overwrite
    // These are NOT extracted from VAR sheet, only set from UI selection
    // Debit fields are handled in the main mapToSteam function based on standardFields.Processing_Debit

    // Add standard fields
    if (standardFields.Contactless_Signature) {
      steamFields.Contactless_Signature = standardFields.Contactless_Signature;
    }

    if (standardFields.Merchant_Time_Zone && !steamFields.Merchant_Time_Zone) {
      steamFields.Merchant_Time_Zone = standardFields.Merchant_Time_Zone;
    }

    // TSYS_Authentication_Code is user input only
    if (standardFields.TSYS_Authentication_Code) {
      steamFields.TSYS_Authentication_Code = standardFields.TSYS_Authentication_Code;
    }

    // Map debit fields - only if Processing_Debit is "MHC" in standardFields
    // For "UR", the values are already populated from UR data, don't overwrite
    if (standardFields.Processing_Debit === 'MHC') {
      // TSYS_Debit_Sharing_Group - standard value
      steamFields.TSYS_Debit_Sharing_Group = 'G8E7LYWQNZV';

      // TSYS_Merchant_ABA - standard value
      steamFields.TSYS_Merchant_ABA = '990025276';

      // TSYS_Settlement_Agent - standard value
      steamFields.TSYS_Settlement_Agent = 'V074';

      // TSYS_Reimbursement_Attribute - standard value
      steamFields.TSYS_Reimbursement_Attribute = 'Z';
    }

    return steamFields;
  }

  /**
   * Map Heartland VAR data to STEAM field format
   * @param {Object} varData - Parsed VAR data from VarParser
   * @param {Object} standardFields - Standard fields
   * @returns {Object} Mapped STEAM fields
   */
  static mapHeartlandToSteam(varData, standardFields = {}) {
    // Initialize all required fields to ensure they always appear in UI
    const steamFields = {
      Merchant_ID: '',
      Merchant_Name: '',
      Merchant_Address: '',
      Merchant_City: '',
      Merchant_State: '',
      Merchant_City_Code: '',
      Merchant_Phone_Number: '',
      Merchant_Time_Zone: '',
      KeyManagement_RKL_Device_GroupName: '',
      TSYS_Merchant_ID: '',
      TSYS_Acquirer_Bin: '',
      TSYS_Agent_Bank_Number: '',
      TSYS_Agent_Chain_Number: '',
      TSYS_Store_Number: '',
      TSYS_Terminal_Number: '',
      TSYS_Category_Code: '',
      TSYS_Terminal_ID: ''
    };

    // Map merchant fields
    if (varData.merchant) {
      // MID maps to both Merchant_ID and TSYS_Merchant_ID
      if (varData.merchant.merchantId) {
        steamFields.Merchant_ID = varData.merchant.merchantId;
        steamFields.TSYS_Merchant_ID = varData.merchant.merchantId;
      }

      // Merchant Name
      if (varData.merchant.dbaName) {
        steamFields.Merchant_Name = varData.merchant.dbaName;
      }

      // DBA Address 1 maps to Merchant_Address
      if (varData.merchant.address) {
        steamFields.Merchant_Address = varData.merchant.address;
      }

      // DBA City
      if (varData.merchant.city) {
        steamFields.Merchant_City = varData.merchant.city;
      }

      // DBA State
      if (varData.merchant.state) {
        steamFields.Merchant_State = varData.merchant.state;
      }

      // DBA Zip maps to Merchant_City_Code
      if (varData.merchant.zipcode) {
        steamFields.Merchant_City_Code = varData.merchant.zipcode;
      }

      // DBA Phone
      if (varData.merchant.dbaPhone) {
        steamFields.Merchant_Phone_Number = varData.merchant.dbaPhone;
      }
    }

    // Map terminal fields
    if (varData.terminal) {
      // Acquiring Bank Name/Bin (extracted number) maps to TSYS_Acquirer_Bin
      if (varData.terminal.bin) {
        steamFields.TSYS_Acquirer_Bin = varData.terminal.bin;
      }

      // Agent Number maps to TSYS_Agent_Bank_Number
      if (varData.terminal.agentNumber) {
        steamFields.TSYS_Agent_Bank_Number = varData.terminal.agentNumber;
      }

      // Chain Number maps to TSYS_Agent_Chain_Number
      if (varData.terminal.chainNumber) {
        steamFields.TSYS_Agent_Chain_Number = varData.terminal.chainNumber;
      }

      // Store Number
      if (varData.terminal.storeNumber) {
        steamFields.TSYS_Store_Number = varData.terminal.storeNumber;
      }

      // Terminal Number maps to TSYS_Terminal_Number
      if (varData.terminal.terminalNumber) {
        steamFields.TSYS_Terminal_Number = varData.terminal.terminalNumber;
      }

      // SIC maps to TSYS_Category_Code
      // Always set this field, even if empty, so it shows in UI
      steamFields.TSYS_Category_Code = varData.terminal?.sicCode || '';

      // Terminal TID maps to TSYS_Terminal_ID
      if (varData.terminal.terminalId) {
        steamFields.TSYS_Terminal_ID = varData.terminal.terminalId;
      }

      // Time Zone maps to Merchant_Time_Zone
      // Prefer ZIP code-based timezone over numerical value
      if (varData.merchant?.zipcode) {
        const zipTimezone = this.getTimezoneFromZip(varData.merchant.zipcode);
        if (zipTimezone) {
          steamFields.Merchant_Time_Zone = zipTimezone;
        } else if (varData.terminal.timeZoneInd) {
          // Fallback to numerical value if ZIP code mapping fails
          steamFields.Merchant_Time_Zone = this.convertTimeZoneToName(varData.terminal.timeZoneInd);
        }
      } else if (varData.terminal.timeZoneInd) {
        // Use numerical value if no ZIP code available
        steamFields.Merchant_Time_Zone = this.convertTimeZoneToName(varData.terminal.timeZoneInd);
      }
    }

    // Add standard fields
    if (standardFields.Contactless_Signature) {
      steamFields.Contactless_Signature = standardFields.Contactless_Signature;
    }

    if (standardFields.Merchant_Time_Zone && !steamFields.Merchant_Time_Zone) {
      steamFields.Merchant_Time_Zone = standardFields.Merchant_Time_Zone;
    }

    // TSYS_Authentication_Code is user input only
    if (standardFields.TSYS_Authentication_Code) {
      steamFields.TSYS_Authentication_Code = standardFields.TSYS_Authentication_Code;
    }

    // Map debit fields - only if Processing_Debit is "MHC" in standardFields
    // For "UR", the values are already populated from UR data, don't overwrite
    if (standardFields.Processing_Debit === 'MHC') {
      // TSYS_Debit_Sharing_Group - standard value
      steamFields.TSYS_Debit_Sharing_Group = 'G8E7LYWQNZV';

      // TSYS_Merchant_ABA - standard value
      steamFields.TSYS_Merchant_ABA = '990025276';

      // TSYS_Settlement_Agent - standard value
      steamFields.TSYS_Settlement_Agent = 'V074';

      // TSYS_Reimbursement_Attribute - standard value
      steamFields.TSYS_Reimbursement_Attribute = 'Z';
    }
    // For "UR", debit fields are already populated from UR data in mapURToSteam, don't overwrite

    return steamFields;
  }

  /**
   * Map UR VAR data to STEAM fields
   * @param {Object} varData - Parsed VAR data
   * @param {Object} standardFields - Standard fields from user input
   * @returns {Object} Mapped STEAM fields
   */
  static mapURToSteam(varData, standardFields = {}) {
    // Initialize all required fields
    const steamFields = {
      Merchant_ID: '',
      Merchant_Name: '',
      Merchant_Address: '',
      Merchant_City: '',
      Merchant_State: '',
      Merchant_City_Code: '',
      Merchant_Phone_Number: '',
      Merchant_Time_Zone: '',
      KeyManagement_RKL_Device_GroupName: 'WellsTFTSYS-1301',
      TSYS_Merchant_ID: '',
      TSYS_Acquirer_Bin: '',
      TSYS_Agent_Bank_Number: '',
      TSYS_Agent_Chain_Number: '',
      TSYS_Store_Number: '',
      TSYS_Terminal_Number: '',
      TSYS_Category_Code: '',
      TSYS_Terminal_ID: '',
      TSYS_Authentication_Code: '',
      TSYS_Debit_Sharing_Group: '',
      TSYS_Merchant_ABA: '',
      TSYS_Settlement_Agent: '',
      TSYS_Reimbursement_Attribute: ''
    };

    // Map merchant fields
    if (varData.merchant) {
      // Merchant Number (12 digits) maps to both Merchant_ID and TSYS_Merchant_ID
      if (varData.merchant.merchantId) {
        steamFields.Merchant_ID = varData.merchant.merchantId;
        steamFields.TSYS_Merchant_ID = varData.merchant.merchantId;
      }

      // Merchant Name (various)
      if (varData.merchant.dbaName) {
        steamFields.Merchant_Name = varData.merchant.dbaName;
      }

      // Merchant Physical Address
      if (varData.merchant.address) {
        steamFields.Merchant_Address = varData.merchant.address;
      }

      // Merchant City (various)
      if (varData.merchant.city) {
        steamFields.Merchant_City = varData.merchant.city;
      }

      // Merchant State (2 characters)
      if (varData.merchant.state) {
        steamFields.Merchant_State = varData.merchant.state;
      }

      // Merchant City/Location/Zip Code (5 digits)
      if (varData.merchant.zipcode) {
        steamFields.Merchant_City_Code = varData.merchant.zipcode;
      }

      // Phone Number - Hardcoded for UR VARs
      steamFields.Merchant_Phone_Number = '877-487-6285';
    }

    // Map terminal fields
    if (varData.terminal) {
      // Acquiring Bank ID/BIN (6 digits)
      if (varData.terminal.bin) {
        steamFields.TSYS_Acquirer_Bin = varData.terminal.bin;
      }

      // Agent Number (6 digits)
      if (varData.terminal.agentNumber) {
        steamFields.TSYS_Agent_Bank_Number = varData.terminal.agentNumber;
      }

      // Chain Code (6 digits)
      if (varData.terminal.chainNumber) {
        steamFields.TSYS_Agent_Chain_Number = varData.terminal.chainNumber;
      }

      // Store # (4 digits)
      if (varData.terminal.storeNumber) {
        steamFields.TSYS_Store_Number = varData.terminal.storeNumber;
      }

      // Terminal # (4 digits)
      if (varData.terminal.terminalNumber) {
        steamFields.TSYS_Terminal_Number = varData.terminal.terminalNumber;
      }

      // Merchant Category/SIC Code (4 digits)
      if (varData.terminal.sicCode) {
        steamFields.TSYS_Category_Code = varData.terminal.sicCode;
      }

      // VisaNet Terminal ID (8 digits)
      if (varData.terminal.terminalId) {
        steamFields.TSYS_Terminal_ID = varData.terminal.terminalId;
      }

      // Time Zone Differential (3 digits)
      if (varData.terminal.timeZoneInd) {
        steamFields.Merchant_Time_Zone = this.convertTimeZoneToName(varData.terminal.timeZoneInd);
      }
    }

    // Map UR-specific fields
    if (varData.ur) {
      // Authentication Code
      if (varData.ur.authenticationCode) {
        steamFields.TSYS_Authentication_Code = varData.ur.authenticationCode;
      }

      // Sharing Groups
      if (varData.ur.sharingGroups) {
        steamFields.TSYS_Debit_Sharing_Group = varData.ur.sharingGroups;
      }

      // ABA
      if (varData.ur.aba) {
        steamFields.TSYS_Merchant_ABA = varData.ur.aba;
      }

      // Settlement
      if (varData.ur.settlement) {
        steamFields.TSYS_Settlement_Agent = varData.ur.settlement;
      }

      // Re-imbursement Attribute
      if (varData.ur.reimbursementAttribute) {
        steamFields.TSYS_Reimbursement_Attribute = varData.ur.reimbursementAttribute;
      }
    }

    // Override with standard fields if provided
    // BUT: Preserve TSYS_Authentication_Code for UR if it was already set from UR data
    Object.keys(standardFields).forEach(key => {
      if (standardFields[key] !== undefined && standardFields[key] !== '') {
        // For UR VARs, don't overwrite TSYS_Authentication_Code if it was already set from UR data
        if (key === 'TSYS_Authentication_Code' && varData.ur?.authenticationCode && steamFields[key]) {
          // Keep the UR value, don't overwrite
          return;
        }
        steamFields[key] = standardFields[key];
      }
    });

    return steamFields;
  }

  /**
   * Validate mapped fields
   * @param {Object} steamFields - Mapped STEAM fields
   * @param {string} varType - VAR type ('TSYS', 'Heartland', 'UR', etc.)
   * @returns {Object} Validation result with isValid flag and errors array
   */
  static validate(steamFields, varType = 'TSYS') {
    const errors = [];
    const warnings = [];

    // TSYS-specific required fields - only validate for TSYS VARs
    if (varType === 'TSYS') {
      if (!steamFields.TSYS_Merchant_ID) {
        errors.push('TSYS_Merchant_ID is required');
      }

      if (!steamFields.TSYS_Terminal_ID) {
        errors.push('TSYS_Terminal_ID is required');
      }

      if (!steamFields.TSYS_Terminal_Number) {
        errors.push('TSYS_Terminal_Number is required');
      }
    }

    // Heartland-specific validation
    // For Heartland, TSYS fields are optional/mapped from Heartland fields
    // The core merchant/terminal fields should still be validated
    if (varType === 'Heartland') {
      // Heartland VARs map to TSYS fields, but they're not strictly required
      // We validate that core fields exist instead
      if (!steamFields.Merchant_ID && !steamFields.TSYS_Merchant_ID) {
        errors.push('Merchant_ID is required');
      }
      
      if (!steamFields.Merchant_Name || steamFields.Merchant_Name.trim() === '') {
        errors.push('Merchant_Name is required');
      }
      
      // Terminal ID validation for Heartland (can be TSYS_Terminal_ID or Terminal TID)
      if (!steamFields.TSYS_Terminal_ID) {
        errors.push('TSYS_Terminal_ID (Terminal TID) is required');
      }
    }

    // UR-specific validation (if needed in future)
    if (varType === 'UR') {
      if (!steamFields.Merchant_Name || steamFields.Merchant_Name.trim() === '') {
        errors.push('Merchant_Name is required');
      }
    }

    // Merchant Name warning (important but not blocking)
    // Note: For Heartland VARs, this maps to "Merchant Name" field (not "DBA Name" like TSYS)
    if (!steamFields.Merchant_Name || steamFields.Merchant_Name.trim() === '') {
      warnings.push('Merchant_Name is missing or empty - this field should be populated from the VAR sheet (Heartland: "Merchant Name", TSYS: "DBA Name")');
    }

    // Terminal ID format validation (only for TSYS)
    if (varType === 'TSYS' && steamFields.TSYS_Terminal_ID && steamFields.TSYS_Terminal_ID.startsWith('V')) {
      warnings.push('Terminal ID should have leading V replaced with 7');
    }

    // Debit fields validation (if debit network summary is present)
    if (steamFields.TSYS_Debit_Sharing_Group) {
      if (!steamFields.TSYS_Merchant_ABA) {
        warnings.push('TSYS_Merchant_ABA should be set when debit is enabled');
      }
      if (!steamFields.TSYS_Settlement_Agent) {
        warnings.push('TSYS_Settlement_Agent should be set when debit is enabled');
      }
      if (!steamFields.TSYS_Reimbursement_Attribute) {
        warnings.push('TSYS_Reimbursement_Attribute should be set when debit is enabled');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get field mapping information for display
   * @returns {Array} Array of field mapping objects
   */
  static getMappingInfo() {
    return [
      {
        steamField: 'TSYS_Merchant_ID',
        varField: 'Vital Merchant ID',
        description: 'Merchant identifier',
        required: true
      },
      {
        steamField: 'TSYS_Acquirer_Bin',
        varField: 'Acquirer ID',
        description: 'Acquirer BIN',
        required: false
      },
      {
        steamField: 'TSYS_Agent_Bank_Number',
        varField: 'Agency Number',
        description: 'Agent bank number',
        required: false
      },
      {
        steamField: 'TSYS_Agent_Chain_Number',
        varField: 'Chain Number',
        description: 'Agent chain number',
        required: false
      },
      {
        steamField: 'TSYS_Store_Number',
        varField: 'Store Number',
        description: 'Store number',
        required: false
      },
      {
        steamField: 'TSYS_Terminal_Number',
        varField: 'Terminal Number',
        description: 'Terminal number',
        required: true
      },
      {
        steamField: 'TSYS_Category_Code',
        varField: 'SIC Code',
        description: 'Merchant category code',
        required: false
      },
      {
        steamField: 'TSYS_Terminal_ID',
        varField: 'Terminal ID (V replaced with 7)',
        description: 'Terminal identifier',
        required: true,
        transform: 'Replace leading V with 7'
      },
      {
        steamField: 'TSYS_Debit_Sharing_Group',
        varField: 'Debit Ntwrk Summary',
        description: 'Debit sharing group (if debit enabled)',
        required: false,
        conditional: 'Only if debit network summary is present'
      }
    ];
  }
}


