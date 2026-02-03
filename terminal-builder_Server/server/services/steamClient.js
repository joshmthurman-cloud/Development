import soap from 'soap';
import { getSteamConfig } from '../config/steamConfig.js';

export class SteamClient {
  constructor() {
    this.client = null;
    this.wsdlUrl = null;
  }

  /**
   * Initialize SOAP client
   */
  async initialize() {
    const config = await getSteamConfig();
    const newWsdlUrl = config.wsdlUrl;

    // If client exists but WSDL URL changed, reset the client
    if (this.client && this.wsdlUrl !== newWsdlUrl) {
      console.log(`[SteamClient] WSDL URL changed from ${this.wsdlUrl} to ${newWsdlUrl}, resetting client...`);
      this.client = null;
      this.wsdlUrl = null;
    }

    // If client already exists and URL matches, return it
    if (this.client) {
      return this.client;
    }

    this.wsdlUrl = newWsdlUrl;

    return new Promise((resolve, reject) => {
      console.log(`[SteamClient] Creating SOAP client with WSDL: ${this.wsdlUrl}`);
      soap.createClient(this.wsdlUrl, (err, client) => {
        if (err) {
          console.error('SOAP client creation error:', err);
          reject(new Error(`Failed to create SOAP client: ${err.message}`));
          return;
        }
        
        // Setup logging
        this.setupLogging(client);
        client._loggingSetup = true;
        
        this.client = client;
        console.log(`[SteamClient] SOAP client created successfully`);
        resolve(client);
      });
    });
  }

  /**
   * Get SOAP client instance
   */
  async getClient() {
    await this.initialize(); // This will check for WSDL URL changes and reset if needed
    return this.client;
  }

  /**
   * Reset SOAP client (useful when configuration changes)
   */
  resetClient() {
    console.log('[SteamClient] Resetting SOAP client...');
    this.client = null;
    this.wsdlUrl = null;
  }

  /**
   * Setup SOAP request/response logging
   */
  setupLogging(client) {
    let requestTimestamp = null;
    
    // Add request/response logging
    client.on('request', async (xml, e) => {
      requestTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      console.log('=== SOAP Request XML (first 5000 chars) ===');
      console.log(xml.substring(0, 5000));
      if (xml.length > 5000) {
        console.log(`... (truncated, total length: ${xml.length} chars)`);
      }
      console.log('==========================================');
      
      // Save full request to file
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const logDir = path.join(__dirname, '../logs');
        await fs.mkdir(logDir, { recursive: true });
        const logFile = path.join(logDir, `soap-request-${requestTimestamp}.xml`);
        await fs.writeFile(logFile, xml, 'utf8');
        console.log(`Full SOAP Request saved to: ${logFile}`);
      } catch (fileError) {
        console.error('Failed to save SOAP request:', fileError);
      }
    });
    
    client.on('response', async (xml, e) => {
      console.log('=== SOAP Response XML (first 5000 chars) ===');
      console.log(xml.substring(0, 5000));
      if (xml.length > 5000) {
        console.log(`... (truncated, total length: ${xml.length} chars)`);
      }
      console.log('===========================================');
      
      // Save full response to file
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const logDir = path.join(__dirname, '../logs');
        await fs.mkdir(logDir, { recursive: true });
        const timestamp = requestTimestamp || new Date().toISOString().replace(/[:.]/g, '-');
        const logFile = path.join(logDir, `soap-response-${timestamp}.xml`);
        await fs.writeFile(logFile, xml, 'utf8');
        console.log(`Full SOAP Response saved to: ${logFile}`);
      } catch (fileError) {
        console.error('Failed to save SOAP response:', fileError);
      }
    });
  }

  /**
   * Get credentials from config
   * @param {number} userId - Optional user ID to get user-specific credentials
   * @param {string} varType - Optional VAR type ('UR', 'TSYS', etc.) to use UR-specific credentials
   */
  async getCredentials(userId = null, varType = null) {
    const config = await getSteamConfig(userId, varType);
    return {
      UserName: config.username,
      Password: config.password
    };
  }

  /**
   * Show_TemplateList - Get list of available templates
   * @param {string} err2 - Optional error text parameter
   * @param {number} userId - Optional user ID to get user-specific credentials
   * @param {string} varType - Optional VAR type ('UR', 'TSYS', etc.) to use UR-specific credentials
   * @returns {Promise<Array>} Array of template objects
   */
  async showTemplateList(err2 = '', userId = null, varType = null) {
    try {
      const client = await this.getClient();
      const credentials = await this.getCredentials(userId, varType);

      const args = {
        err: err2,
        UserName: credentials.UserName,
        Password: credentials.Password
      };

      return new Promise((resolve, reject) => {
        client.Show_TemplateList(args, (err, result) => {
          if (err) {
            console.error('Show_TemplateList error:', err);
            reject(new Error(`Show_TemplateList failed: ${err.message}`));
            return;
          }

          // Parse result
          if (result && result.Show_TemplateListResult) {
            const templates = this.parseTemplateList(result.Show_TemplateListResult);
            resolve(templates);
          } else {
            resolve([]);
          }
        });
      });
    } catch (error) {
      console.error('Show_TemplateList error:', error);
      throw error;
    }
  }

  /**
   * Parse template list result
   */
  parseTemplateList(result) {
    if (!result) return [];

    // Handle different result formats
    if (Array.isArray(result)) {
      return result;
    }

    if (result.diffgram && result.diffgram.NewDataSet && result.diffgram.NewDataSet.Table) {
      const tables = Array.isArray(result.diffgram.NewDataSet.Table) 
        ? result.diffgram.NewDataSet.Table 
        : [result.diffgram.NewDataSet.Table];
      return tables;
    }

    if (result.Table) {
      return Array.isArray(result.Table) ? result.Table : [result.Table];
    }

    return [];
  }

  /**
   * Show_LocationList - Get list of available locations
   * @param {string} err2 - Optional error text parameter
   * @param {number} userId - Optional user ID to get user-specific credentials
   * @param {string} varType - Optional VAR type ('UR', 'TSYS', etc.) to use UR-specific credentials
   * @returns {Promise<Array>} Array of location objects
   */
  async showLocationList(err2 = '', userId = null, varType = null) {
    try {
      const client = await this.getClient();
      const credentials = await this.getCredentials(userId, varType);

      const args = {
        err: err2,
        UserName: credentials.UserName,
        Password: credentials.Password
      };

      // Try different method name variations
      const methodNames = [
        'Show_LocationList',
        'ShowLocationList',
        'Get_LocationList',
        'GetLocationList',
        'List_Locations',
        'ListLocations'
      ];

      let methodFound = null;
      for (const methodName of methodNames) {
        if (typeof client[methodName] === 'function') {
          methodFound = methodName;
          console.log(`[SteamClient] Using location list method: ${methodName}`);
          break;
        }
      }

      if (!methodFound) {
        // If method not found, try manual SOAP request (like Show_TemplateList)
        console.log('[SteamClient] Location list method not found, trying manual SOAP request...');
        return this.showLocationListManual(err2, varType);
      }

      return new Promise((resolve, reject) => {
        client[methodFound](args, (err, result) => {
          if (err) {
            console.error('Show_LocationList error:', err);
            reject(new Error(`Show_LocationList failed: ${err.message}`));
            return;
          }

          // Parse result
          if (result && result.Show_LocationListResult) {
            const locations = this.parseLocationList(result.Show_LocationListResult);
            resolve(locations);
          } else if (result) {
            // Try parsing the result directly
            const locations = this.parseLocationList(result);
            resolve(locations);
          } else {
            resolve([]);
          }
        });
      });
    } catch (error) {
      console.error('Show_LocationList error:', error);
      throw error;
    }
  }

  /**
   * Manual SOAP request for Show_LocationList (fallback)
   */
  async showLocationListManual(err2 = '', varType = null) {
    try {
      const config = await getSteamConfig(null, varType);
      const axios = (await import('axios')).default;

      const soapBody = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Show_LocationList xmlns="http://tempuri.org/"><err>${this.escapeXml(err2)}</err><UserName>${this.escapeXml(config.username)}</UserName><Password>${this.escapeXml(config.password)}</Password></Show_LocationList></soap:Body></soap:Envelope>`;

      const response = await axios.post(
        config.wsdlUrl,
        soapBody,
        {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'http://tempuri.org/Show_LocationList'
          }
        }
      );

      const locations = this.parseLocationList(response.data);
      return locations;
    } catch (error) {
      console.error('Show_LocationListManual error:', error);
      throw error;
    }
  }

  /**
   * Get Merchant List By Login - Get merchants and their locations for a TPN (or all merchants if TPN not provided)
   * @param {string} tpn - Optional Terminal Profile Number (not required for UR)
   * @param {number} userId - Optional user ID to get user-specific credentials
   * @param {string} varType - Optional VAR type ('UR', 'TSYS', etc.) to use UR-specific credentials
   * @returns {Promise<Object>} Object with merchants array and locations grouped by merchant
   */
  async getMerchantListByLogin(tpn = null, userId = null, varType = null) {
    try {
      const config = await getSteamConfig(userId, varType);
      const axios = (await import('axios')).default;

      // Build SOAP body - TPN is NOT required for Get_Merchant_List_By_Login (for any VAR type)
      // Match EXACT format from Postman - include XML declaration and exact spacing
      // Do NOT include TPN in the request
      const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Get_Merchant_List_By_Login xmlns="http://tempuri.org/"><username>${this.escapeXml(config.username)}</username><password>${this.escapeXml(config.password)}</password>
    </Get_Merchant_List_By_Login>
  </soap:Body>
</soap:Envelope>`;

      const apiUrl = config.apiUrl || 'https://dvmms.com/steam/api/ws/VDirectAccess.asmx';
      
      console.log(`[SteamClient] Making SOAP request to Get_Merchant_List_By_Login (TPN not required)`);
      console.log(`[SteamClient] Using credentials: username=${config.username}, varType=${varType || 'default'}`);
      
      // Log the SOAP request XML (since we're using axios directly, not the SOAP client)
      console.log('=== Get_Merchant_List_By_Login SOAP Request XML ===');
      console.log(soapBody);
      console.log('===================================================');
      
      // Save to file for debugging
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const logDir = path.join(__dirname, '../logs');
        await fs.mkdir(logDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logFile = path.join(logDir, `soap-request-Get_Merchant_List_By_Login-${timestamp}.xml`);
        await fs.writeFile(logFile, soapBody, 'utf8');
        console.log(`Full SOAP Request saved to: ${logFile}`);
      } catch (fileError) {
        console.error('Failed to save SOAP request:', fileError);
      }

      const response = await axios.post(apiUrl, soapBody, {
        headers: {
          'Content-Type': 'text/xml',
          'SOAPAction': 'http://tempuri.org/Get_Merchant_List_By_Login'
        },
        transformRequest: [(data) => data] // Don't transform the data, send as-is
      });

      const responseText = typeof response.data === 'string' ? response.data : response.data.toString();
      console.log(`[SteamClient] Get_Merchant_List_By_Login response received`);
      
      // Log the response XML for debugging
      console.log('=== Get_Merchant_List_By_Login SOAP Response XML (first 5000 chars) ===');
      console.log(responseText.substring(0, 5000));
      if (responseText.length > 5000) {
        console.log(`... (truncated, total length: ${responseText.length} chars)`);
      }
      console.log('===================================================');
      
      // Save response to file
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const logDir = path.join(__dirname, '../logs');
        await fs.mkdir(logDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logFile = path.join(logDir, `soap-response-Get_Merchant_List_By_Login-${timestamp}.xml`);
        await fs.writeFile(logFile, responseText, 'utf8');
        console.log(`Full SOAP Response saved to: ${logFile}`);
      } catch (fileError) {
        console.error('Failed to save SOAP response:', fileError);
      }

      // Parse the response
      const parsed = this.parseMerchantListResponse(responseText);
      console.log(`[SteamClient] Parsed ${parsed.merchants.length} merchants and ${parsed.allLocations.length} locations`);
      if (parsed.merchants.length === 0 && parsed.allLocations.length === 0) {
        console.log('[SteamClient] WARNING: No merchants or locations found. Response structure:');
        console.log('[SteamClient] Response contains <Merchants>:', responseText.includes('<Merchants'));
        console.log('[SteamClient] Response contains <Locations>:', responseText.includes('<Locations'));
        console.log('[SteamClient] Response contains <Table>:', responseText.includes('<Table'));
        console.log('[SteamClient] Response contains <NewDataSet>:', responseText.includes('<NewDataSet'));
      }
      return parsed;
    } catch (error) {
      console.error('Get_Merchant_List_By_Login error:', error);
      throw error;
    }
  }

  /**
   * Check terminal connection status via SPIn Proxy
   * @param {string} tpn - Terminal Profile Number
   * @param {string} registerId - Optional Register ID (alternative to TPN)
   * @returns {Promise<Object>} Status object with online/offline status
   */
  async checkTerminalStatus(tpn = null, registerId = null) {
    try {
      const axios = (await import('axios')).default;
      
      // Use SPIn proxy URL - default to production, can be overridden via env
      const spinProxyUrl = process.env.SPIN_PROXY_URL || 'https://spinpos.net/spin';
      
      let statusUrl;
      if (tpn) {
        statusUrl = `${spinProxyUrl}/GetTerminalStatus?tpn=${encodeURIComponent(tpn)}`;
      } else if (registerId) {
        statusUrl = `${spinProxyUrl}/GetTerminalStatus?RegisterID=${encodeURIComponent(registerId)}`;
      } else {
        throw new Error('Either TPN or RegisterID is required');
      }
      
      console.log(`[SteamClient] Checking terminal status: ${statusUrl}`);
      
      const response = await axios.get(statusUrl, {
        timeout: 10000, // 10 second timeout
        validateStatus: (status) => status < 500 // Don't throw on 4xx errors
      });
      
      const statusText = (response.data || '').toString().trim();
      const isOnline = statusText.toLowerCase() === 'online';
      
      console.log(`[SteamClient] Terminal status response: ${statusText} (Online: ${isOnline})`);
      
      return {
        status: isOnline ? 'Online' : 'Offline',
        isOnline: isOnline,
        rawResponse: statusText
      };
    } catch (error) {
      console.error('Check terminal status error:', error);
      // Return offline status on error, but include error info
      return {
        status: 'Offline',
        isOnline: false,
        error: error.message || 'Failed to check terminal status',
        rawResponse: null
      };
    }
  }

  /**
   * Parse Get_Merchant_List_By_Login response
   * Groups locations under their merchants
   */
  parseMerchantListResponse(xmlResponse) {
    try {
      // Check for error first
      const errorMatch = xmlResponse.match(/<err>(.*?)<\/err>/s);
      if (errorMatch && errorMatch[1] && errorMatch[1].trim() && errorMatch[1].trim() !== '') {
        const errorMsg = errorMatch[1].trim();
        console.log(`[SteamClient] Error in response: ${errorMsg}`);
        if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('error')) {
          throw new Error(`STEAM API Error: ${errorMsg}`);
        }
      }
      
      // Use a simple XML parser or regex to extract data
      // The response has Merchants and Locations in diffgram/NewDataSet
      
      const merchants = [];
      const locations = [];
      
      // Helper function to extract text content from XML element
      const extractElement = (xml, tagName) => {
        const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, 's');
        const match = xml.match(regex);
        return match ? match[1].trim() : null;
      };
      
      // Extract Merchants - look for <Merchants> elements (can be directly in response or in NewDataSet)
      const merchantRegex = /<Merchants[^>]*>([\s\S]*?)<\/Merchants>/g;
      let merchantMatch;
      while ((merchantMatch = merchantRegex.exec(xmlResponse)) !== null) {
        const merchantXml = merchantMatch[1];
        const id = extractElement(merchantXml, 'Id');
        const name = extractElement(merchantXml, 'Name');
        
        if (id && name !== null) {
          const companyId = extractElement(merchantXml, 'CompanyId');
          const status = extractElement(merchantXml, 'Status');
          
          merchants.push({
            Id: parseInt(id, 10),
            Name: name || '',
            CompanyId: companyId ? parseInt(companyId, 10) : null,
            Status: status ? parseInt(status, 10) : null
          });
        }
      }
      
      // Extract Locations - look for <Locations> elements
      const locationRegex = /<Locations[^>]*>([\s\S]*?)<\/Locations>/g;
      let locationMatch;
      while ((locationMatch = locationRegex.exec(xmlResponse)) !== null) {
        const locationXml = locationMatch[1];
        const id = extractElement(locationXml, 'Id');
        const name = extractElement(locationXml, 'Name');
        const merchantId = extractElement(locationXml, 'MerchantId');
        
        if (id && name !== null && merchantId) {
          const description = extractElement(locationXml, 'Description');
          const isMainLocationStr = extractElement(locationXml, 'IsMainLocation');
          
          // Extract billing fields
          const billingCompanyName = extractElement(locationXml, 'BillingCompanyName');
          const billingFirstName = extractElement(locationXml, 'BillingFirstName');
          const billingLastName = extractElement(locationXml, 'BillingLaststName') || extractElement(locationXml, 'BillingLastName');
          const billingEmail = extractElement(locationXml, 'BillingEmail');
          
          locations.push({
            Id: parseInt(id, 10),
            Name: name || '',
            MerchantId: parseInt(merchantId, 10),
            Description: description || '',
            IsMainLocation: isMainLocationStr === 'true',
            BillingCompanyName: billingCompanyName || '',
            BillingFirstName: billingFirstName || '',
            BillingLaststName: billingLastName || '',
            BillingLastName: billingLastName || '',
            BillingEmail: billingEmail || ''
          });
        }
      }
      
      // Group locations under merchants
      const merchantsWithLocations = merchants.map(merchant => ({
        ...merchant,
        locations: locations.filter(loc => loc.MerchantId === merchant.Id)
      }));
      
      console.log(`[SteamClient] Parsed ${merchants.length} merchants and ${locations.length} locations`);
      console.log(`[SteamClient] Merchants:`, merchants.map(m => `${m.Name} (ID: ${m.Id})`).join(', '));
      console.log(`[SteamClient] Locations:`, locations.map(l => `${l.Name} (ID: ${l.Id}, Merchant: ${l.MerchantId})`).join(', '));
      
      return {
        merchants: merchantsWithLocations,
        allLocations: locations,
        allMerchants: merchants
      };
    } catch (error) {
      console.error('Parse merchant list response error:', error);
      console.error('XML Response (first 2000 chars):', xmlResponse.substring(0, 2000));
      throw new Error(`Failed to parse merchant list response: ${error.message}`);
    }
  }

  /**
   * Parse location list result
   */
  parseLocationList(result) {
    if (!result) return [];
    
    // Handle different result formats (similar to parseTemplateList)
    if (Array.isArray(result)) {
      return result;
    }
    
    if (typeof result === 'object') {
      // Try diffgram format (common in .NET SOAP services)
      if (result.diffgram && result.diffgram.NewDataSet && result.diffgram.NewDataSet.Table) {
        const tables = Array.isArray(result.diffgram.NewDataSet.Table) 
          ? result.diffgram.NewDataSet.Table 
          : [result.diffgram.NewDataSet.Table];
        return tables;
      }
      
      // Try Table format
      if (result.Table) {
        return Array.isArray(result.Table) ? result.Table : [result.Table];
      }
      
      // Try Location or locations array
      if (result.Location || result.locations) {
        const locations = result.Location || result.locations;
        return Array.isArray(locations) ? locations : [locations];
      }
      
      // If result is a single location object, wrap it in array
      if (result.Location_ID || result.LocationId || result.Id || result.id) {
        return [result];
      }
      
      // If result is XML string, try to parse it
      if (typeof result === 'string' && result.includes('<')) {
        // For now, return empty array - would need XML parsing
        console.warn('[SteamClient] parseLocationList: Result appears to be XML string, parsing not implemented');
        return [];
      }
    }
    
    return [];
  }

  /**
   * Show_TemplateParameters - Get parameters for a template
   * @param {number} templateId - Template ID
   * @param {string} err - Optional error text parameter
   * @param {number} userId - Optional user ID to get user-specific credentials
   * @param {string} varType - Optional VAR type ('UR', 'TSYS', etc.) to use UR-specific credentials
   * @returns {Promise<Array>} Array of parameter objects
   */
  async showTemplateParameters(templateId, err = '', userId = null, varType = null) {
    try {
      const client = await this.getClient();
      const credentials = await this.getCredentials(userId, varType);

      const args = {
        err: err,
        UserName: credentials.UserName,
        Password: credentials.Password,
        Template_ID: templateId,
        TotalMerchants: 0
      };

      return new Promise((resolve, reject) => {
        client.Show_TemplateParameters(args, (err, result) => {
          if (err) {
            console.error('Show_TemplateParameters error:', err);
            reject(new Error(`Show_TemplateParameters failed: ${err.message}`));
            return;
          }

          // Parse result
          if (result && result.Show_TemplateParametersResult) {
            const parameters = this.parseTemplateParameters(result.Show_TemplateParametersResult);
            resolve(parameters);
          } else {
            resolve([]);
          }
        });
      });
    } catch (error) {
      console.error('Show_TemplateParameters error:', error);
      throw error;
    }
  }

  /**
   * Parse template parameters result
   */
  parseTemplateParameters(result) {
    if (!result) {
      console.log('[parseTemplateParameters] Result is null/undefined');
      return [];
    }

    console.log('[parseTemplateParameters] Input type:', typeof result, 'Is array:', Array.isArray(result));
    console.log('[parseTemplateParameters] Input keys:', Object.keys(result || {}));

    if (Array.isArray(result)) {
      console.log('[parseTemplateParameters] Returning array directly, length:', result.length);
      return result;
    }

    // Check for diffgram structure
    if (result.diffgram && result.diffgram.NewDataSet && result.diffgram.NewDataSet.Table) {
      const tables = Array.isArray(result.diffgram.NewDataSet.Table) 
        ? result.diffgram.NewDataSet.Table 
        : [result.diffgram.NewDataSet.Table];
      console.log('[parseTemplateParameters] Found diffgram structure, returning', tables.length, 'tables');
      return tables;
    }

    // Check for direct Table property
    if (result.Table) {
      const tables = Array.isArray(result.Table) ? result.Table : [result.Table];
      console.log('[parseTemplateParameters] Found Table property, returning', tables.length, 'tables');
      return tables;
    }

    // Check for NewDataSet structure (direct, not in diffgram)
    if (result.NewDataSet && result.NewDataSet.Table) {
      const tables = Array.isArray(result.NewDataSet.Table) 
        ? result.NewDataSet.Table 
        : [result.NewDataSet.Table];
      console.log('[parseTemplateParameters] Found NewDataSet structure, returning', tables.length, 'tables');
      return tables;
    }

    // Check if result is a string containing XML (shouldn't happen, but handle it)
    if (typeof result === 'string') {
      console.log('[parseTemplateParameters] Result is a string, might be XML');
      // The SOAP library should have parsed this, but if it's still a string, we can't parse it here
      // Log it for debugging
      if (result.includes('<Table')) {
        console.log('[parseTemplateParameters] String contains <Table>, but SOAP library should have parsed it');
      }
      return [];
    }

    console.log('[parseTemplateParameters] No known structure found, returning empty array');
    return [];
  }

  /**
   * Insert_Terminal - Create TPN first (before populating parameters)
   * @param {string} downloadId - TPN (Terminal Profile Number)
   * @param {number} templateId - Template ID
   * @param {string} description - Optional description
   * @param {string} err - Optional error text parameter
   * @param {number} userId - Optional user ID to get user-specific credentials
   * @param {string} varType - Optional VAR type ('UR', 'TSYS', etc.) to use UR-specific credentials
   * @returns {Promise<boolean>} Success status
   */
  async insertTerminal(downloadId, templateId, description = '', err = '', userId = null, varType = null) {
    try {
      const client = await this.getClient();
      const credentials = await this.getCredentials(userId, varType);

      const args = {
        err: err,
        UserName: credentials.UserName,
        Password: credentials.Password,
        Download_ID: downloadId,
        Template_ID: templateId,
        Description: description
      };

      // Log the SOAP request
      console.log('=== Insert_Terminal SOAP Request ===');
      console.log('Arguments:', JSON.stringify(args, null, 2));
      
      // Try to get the SOAP request XML if available
      if (client.wsdl) {
        console.log('WSDL URL:', this.wsdlUrl);
      }

      // Log the actual SOAP envelope if we can access it
      const soapRequest = this.buildSoapRequest('Insert_Terminal', args);
      console.log('SOAP Request XML:');
      console.log(soapRequest);
      console.log('===================================');

      return new Promise((resolve, reject) => {
        client.Insert_Terminal(args, (err, result) => {
          if (err) {
            console.error('Insert_Terminal error:', err);
            reject(new Error(`Insert_Terminal failed: ${err.message}`));
            return;
          }

          // Check for error message first
          let errorMessage = null;
          if (result && result.err) {
            errorMessage = result.err;
          }

          // Check result - try different result field names
          const resultFields = [
            'Insert_Terminal_Method_Second_MethodResult',
            'Insert_TerminalResult',
            'InsertTerminalResult',
            'result'
          ];

          let success = false;
          let resultValue = null;

          for (const field of resultFields) {
            if (result && result[field] !== undefined) {
              resultValue = result[field];
              success = resultValue === true || resultValue === 'true' || resultValue === 1;
              break;
            }
          }

          // If no result field found, check if result itself is truthy
          if (resultValue === null && result) {
            resultValue = result;
            success = result === true || result === 'true';
          }

          // If failed and there's an error message, reject with it
          if (!success) {
            if (errorMessage) {
              reject(new Error(errorMessage));
            } else {
              reject(new Error('Insert_Terminal failed: Unknown error'));
            }
            return;
          }

          resolve(success);
        });
      });
    } catch (error) {
      console.error('Insert_Terminal error:', error);
      throw error;
    }
  }

  /**
   * Get_TerminalParameters_First_Method - Get parameters from an existing TPN
   * @param {string} downloadId - TPN (Terminal Profile Number)
   * @param {string} err - Optional error text parameter
   * @param {number} userId - Optional user ID to get user-specific credentials
   * @param {string} varType - Optional VAR type ('UR', 'TSYS', etc.) to use UR-specific credentials
   * @returns {Promise<Array>} Array of parameter objects
   */
  async getTerminalParameters(downloadId, err = '', userId = null, varType = null) {
    try {
      const client = await this.getClient();
      const credentials = await this.getCredentials(userId, varType);

      const args = {
        err: err,
        UserName: credentials.UserName,
        Password: credentials.Password,
        Download_ID: downloadId
      };

      console.log('Getting terminal parameters for TPN:', downloadId);
      console.log('Method arguments:', { ...args, Password: '***' });

      // Try different method name variations
      const methodNames = [
        'Get_TerminalParameters_First_Method',
        'Get_TerminalParameters',
        'GetTerminalParametersFirstMethod',
        'GetTerminalParameters'
      ];

      let methodFound = null;
      for (const methodName of methodNames) {
        if (typeof client[methodName] === 'function') {
          methodFound = methodName;
          console.log(`Using method: ${methodName}`);
          break;
        }
      }

      if (!methodFound) {
        const availableMethods = Object.keys(client).filter(key => typeof client[key] === 'function' && key.includes('Terminal'));
        console.error('Get_TerminalParameters method not found. Available Terminal methods:', availableMethods);
        throw new Error(`Get_TerminalParameters method not found. Available methods: ${availableMethods.join(', ')}`);
      }

      return new Promise((resolve, reject) => {
        client[methodFound](args, (err, result) => {
          if (err) {
            console.error(`${methodFound} error:`, err);
            reject(new Error(`${methodFound} failed: ${err.message}`));
            return;
          }

          console.log(`${methodFound} result:`, JSON.stringify(result, null, 2));
          console.log(`${methodFound} result keys:`, Object.keys(result || {}));

          // Try different result field names (including Second_MethodResult)
          const resultFields = [
            'Get_TerminalParameters_Second_MethodResult',
            'Get_TerminalParameters_First_MethodResult',
            'Get_TerminalParametersResult',
            'GetTerminalParametersSecondMethodResult',
            'GetTerminalParametersFirstMethodResult',
            'GetTerminalParametersResult',
            'result'
          ];

          let parameters = [];
          let foundField = null;
          
          // First, try the known result fields
          for (const field of resultFields) {
            if (result && result[field] !== undefined) {
              console.log(`Trying result field: ${field}`);
              const fieldValue = result[field];
              console.log(`Field value type: ${typeof fieldValue}`);
              if (typeof fieldValue === 'object' && fieldValue !== null) {
                console.log(`Field value keys: ${Object.keys(fieldValue)}`);
              }
              
              // Check if it's a string (XML) that needs parsing
              if (typeof fieldValue === 'string' && fieldValue.includes('<Table')) {
                console.log(`Field value appears to be XML string, length: ${fieldValue.length}`);
                // The SOAP library should have parsed this, but if it's still a string, we might need to parse it
                // For now, try parsing as object first
              }
              
              parameters = this.parseTemplateParameters(fieldValue);
              console.log(`Parsed ${parameters.length} parameters from ${field}`);
              if (parameters.length > 0) {
                foundField = field;
                break;
              }
            }
          }
          
          // If no parameters found, try parsing the entire result object
          if (parameters.length === 0) {
            console.log('No parameters found in known fields, trying to parse entire result...');
            parameters = this.parseTemplateParameters(result);
            console.log(`Parsed ${parameters.length} parameters from entire result`);
          }
          
          // If still no parameters, try looking for nested response structure
          if (parameters.length === 0 && result) {
            const resultKeys = Object.keys(result);
            console.log(`Checking all result keys for nested structure: ${resultKeys.join(', ')}`);
            for (const key of resultKeys) {
              if (key.includes('Response') || key.includes('Result')) {
                console.log(`Trying nested key: ${key}`);
                const nestedResult = result[key];
                console.log(`Nested result type: ${typeof nestedResult}`);
                if (nestedResult) {
                  if (typeof nestedResult === 'object') {
                    console.log(`Nested result keys: ${Object.keys(nestedResult).join(', ')}`);
                  }
                  
                  // Try parsing the nested result directly
                  parameters = this.parseTemplateParameters(nestedResult);
                  console.log(`Parsed ${parameters.length} parameters from ${key} (direct)`);
                  if (parameters.length > 0) break;
                  
                  // Also try nested keys within the result
                  if (typeof nestedResult === 'object' && nestedResult !== null) {
                    const nestedKeys = Object.keys(nestedResult);
                    console.log(`Checking nested keys: ${nestedKeys.join(', ')}`);
                    for (const nestedKey of nestedKeys) {
                      console.log(`Trying nested result key: ${nestedKey}, type: ${typeof nestedResult[nestedKey]}`);
                      if (nestedKey.includes('Result') || nestedKey.includes('diffgram') || nestedKey.includes('Table') || nestedKey.includes('NewDataSet')) {
                        parameters = this.parseTemplateParameters(nestedResult[nestedKey]);
                        console.log(`Parsed ${parameters.length} parameters from ${key}.${nestedKey}`);
                        if (parameters.length > 0) break;
                      }
                    }
                  }
                  if (parameters.length > 0) break;
                }
              }
            }
          }

          console.log(`Final parameter count: ${parameters.length}`);
          resolve(parameters);
        });
      });
    } catch (error) {
      console.error('Get_TerminalParameters error:', error);
      throw error;
    }
  }

  /**
   * Insert_TerminalParameters - Populate TPN parameters (after TPN is created)
   * @param {string} downloadId - TPN (Terminal Profile Number)
   * @param {number} templateId - Template ID
   * @param {Array} paramList - Array of parameter objects
   * @param {string} err - Optional error text parameter
   * @param {number} userId - Optional user ID to get user-specific credentials
   * @param {string} varType - Optional VAR type ('UR', 'TSYS', etc.) to use UR-specific credentials
   * @returns {Promise<boolean>} Success status
   */
  async insertTerminalParameters(downloadId, templateId, paramList, err = '', userId = null, varType = null) {
    try {
      const client = await this.getClient();
      const credentials = await this.getCredentials(userId, varType);

      // Build XML for Param_List
      const paramListXml = this.buildParamListXml(paramList);
      
      // Log summary info
      console.log(`Param_List XML - Total length: ${paramListXml.length} characters`);
      console.log(`Number of parameters: ${paramList.length}`);
      console.log(`First parameter sample:`, paramList[0] ? {
        Param_ID: paramList[0].Param_ID,
        Param_Name: paramList[0].Param_Name,
        Param_Value: paramList[0].Param_Value,
        CategoryName: paramList[0].CategoryName,
        Enabled: paramList[0].Enabled
      } : 'No parameters');
      
      // Save full XML to file for debugging
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const logDir = path.join(__dirname, '../logs');
        await fs.mkdir(logDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logFile = path.join(logDir, `soap-request-${timestamp}.xml`);
        await fs.writeFile(logFile, paramListXml, 'utf8');
        console.log(`Full SOAP Param_List XML saved to: ${logFile}`);
      } catch (fileError) {
        console.error('Failed to save SOAP request to file:', fileError);
      }

      const args = {
        err: err,
        UserName: credentials.UserName,
        Password: credentials.Password,
        Download_ID: downloadId,
        Template_ID: templateId,
        Param_List: {
          $xml: paramListXml
        }
      };

      return new Promise((resolve, reject) => {
        client.Insert_TerminalParameters(args, (err, result) => {
          if (err) {
            console.error('Insert_TerminalParameters error:', err);
            reject(new Error(`Insert_TerminalParameters failed: ${err.message}`));
            return;
          }

          // Check result
          if (result && result.Insert_TerminalParameters_MethodResult) {
            const success = result.Insert_TerminalParameters_MethodResult === true || 
                           result.Insert_TerminalParameters_MethodResult === 'true';
            resolve(success);
          } else {
            resolve(false);
          }
        });
      });
    } catch (error) {
      console.error('Insert_TerminalParameters error:', error);
      throw error;
    }
  }

  /**
   * Build SOAP request XML for logging
   */
  buildSoapRequest(methodName, args) {
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${methodName} xmlns="http://tempuri.org/">
      ${args.UserName ? `<UserName>${this.escapeXml(String(args.UserName))}</UserName>` : ''}
      ${args.Password ? `<Password>${this.escapeXml(String(args.Password))}</Password>` : ''}
      ${args.Download_ID ? `<Download_ID>${this.escapeXml(String(args.Download_ID))}</Download_ID>` : ''}
      ${args.Template_ID !== undefined ? `<Template_ID>${this.escapeXml(String(args.Template_ID))}</Template_ID>` : ''}
      ${args.Description ? `<Description>${this.escapeXml(String(args.Description))}</Description>` : ''}
      ${args.err !== undefined ? `<err>${this.escapeXml(String(args.err))}</err>` : ''}
    </${methodName}>
  </soap:Body>
</soap:Envelope>`;
    return xml;
  }

  /**
   * Build XML string for Param_List with only mandatory fields
   * Mandatory: Param_ID
   * Optional but included if present: Param_Value (needed to set values)
   */
  buildParamListXml(paramList) {
    if (!Array.isArray(paramList) || paramList.length === 0) {
      return this.buildEmptyParamListXml();
    }

    // Build the schema section with only mandatory field (Param_ID)
    // Include Param_Value in schema since we need it to set values
    const schema = `                <xs:schema id="NewDataSet" xmlns="" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:msdata="urn:schemas-microsoft-com:xml-msdata">
                    <xs:element name="NewDataSet" msdata:IsDataSet="true" msdata:UseCurrentLocale="true">
                        <xs:complexType>
                            <xs:choice minOccurs="0" maxOccurs="unbounded">
                                <xs:element name="Table">
                                    <xs:complexType>
                                        <xs:sequence>
                                            <xs:element name="Param_ID" type="xs:int" minOccurs="0" />
                                            <xs:element name="Param_Value" type="xs:string" minOccurs="0" />
                                        </xs:sequence>
                                    </xs:complexType>
                                </xs:element>
                            </xs:choice>
                        </xs:complexType>
                    </xs:element>
                </xs:schema>`;

    // Build the diffgram section with only mandatory fields
    let diffgram = `                <diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
                    <NewDataSet xmlns="">`;
    
    paramList.forEach((param, index) => {
      diffgram += `
                        <Table diffgr:id="Table${index + 1}" msdata:rowOrder="${index}">`;
      
      // Only include mandatory field: Param_ID
      const paramId = param.Param_ID !== undefined ? param.Param_ID : '';
      diffgram += `
                            <Param_ID>${paramId}</Param_ID>`;
      
      // Include Param_Value only if it has a value (optional but needed to set values)
      const paramValue = param.Param_Value !== undefined && String(param.Param_Value).trim() !== '' 
        ? this.escapeXml(String(param.Param_Value).trim()) 
        : '';
      if (paramValue !== '') {
        diffgram += `
                            <Param_Value>${paramValue}</Param_Value>`;
      }
      
      diffgram += `
                        </Table>`;
    });
    
    diffgram += `
                    </NewDataSet>
                </diffgr:diffgram>`;

    // Combine schema and diffgram
    return schema + diffgram;
  }

  /**
   * Build empty Param_List XML structure with only mandatory fields
   */
  buildEmptyParamListXml() {
    return `                <xs:schema id="NewDataSet" xmlns="" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:msdata="urn:schemas-microsoft-com:xml-msdata">
                    <xs:element name="NewDataSet" msdata:IsDataSet="true" msdata:UseCurrentLocale="true">
                        <xs:complexType>
                            <xs:choice minOccurs="0" maxOccurs="unbounded">
                                <xs:element name="Table">
                                    <xs:complexType>
                                        <xs:sequence>
                                            <xs:element name="Param_ID" type="xs:int" minOccurs="0" />
                                            <xs:element name="Param_Value" type="xs:string" minOccurs="0" />
                                        </xs:sequence>
                                    </xs:complexType>
                                </xs:element>
                            </xs:choice>
                        </xs:complexType>
                    </xs:element>
                </xs:schema>
                <diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
                    <NewDataSet xmlns=""></NewDataSet>
                </diffgr:diffgram>`;
  }

  /**
   * Escape XML special characters
   */
  escapeXml(str) {
    if (typeof str !== 'string') return str;
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Update_TerminalParameters - Update terminal parameters
   * @param {string} downloadId - TPN
   * @param {Array} paramList - Array of parameter objects to update
   * @param {string} err - Optional error text parameter
   * @returns {Promise<boolean>} Success status
   */
  async updateTerminalParameters(downloadId, paramList, err = '') {
    try {
      const client = await this.getClient();
      const credentials = await this.getCredentials();

      const paramListXml = this.buildParamListXml(paramList);

      const args = {
        err: err,
        UserName: credentials.UserName,
        Password: credentials.Password,
        Download_ID: downloadId,
        Param_List: paramListXml
      };

      return new Promise((resolve, reject) => {
        client.Update_TerminalParameters(args, (err, result) => {
          if (err) {
            console.error('Update_TerminalParameters error:', err);
            reject(new Error(`Update_TerminalParameters failed: ${err.message}`));
            return;
          }

          const success = result && result.Update_TerminalParameters_MethodResult === true;
          resolve(success);
        });
      });
    } catch (error) {
      console.error('Update_TerminalParameters error:', error);
      throw error;
    }
  }

  /**
   * Get_Terminals - Get list of terminals
   * @param {string} err - Optional error text parameter
   * @returns {Promise<Array>} Array of terminal objects
   */
  async getTerminals(err = '') {
    try {
      const client = await this.getClient();
      const credentials = await this.getCredentials();

      const args = {
        err: err,
        UserName: credentials.UserName,
        Password: credentials.Password
      };

      return new Promise((resolve, reject) => {
        client.Get_Terminals(args, (err, result) => {
          if (err) {
            console.error('Get_Terminals error:', err);
            reject(new Error(`Get_Terminals failed: ${err.message}`));
            return;
          }

          if (result && result.Get_TerminalsResult) {
            const terminals = this.parseTerminalList(result.Get_TerminalsResult);
            resolve(terminals);
          } else {
            resolve([]);
          }
        });
      });
    } catch (error) {
      console.error('Get_Terminals error:', error);
      throw error;
    }
  }

  /**
   * Parse terminal list result
   */
  parseTerminalList(result) {
    if (!result) return [];

    if (Array.isArray(result)) {
      return result;
    }

    if (result.diffgram && result.diffgram.NewDataSet && result.diffgram.NewDataSet.Table) {
      const tables = Array.isArray(result.diffgram.NewDataSet.Table) 
        ? result.diffgram.NewDataSet.Table 
        : [result.diffgram.NewDataSet.Table];
      return tables;
    }

    if (result.Table) {
      return Array.isArray(result.Table) ? result.Table : [result.Table];
    }

    return [];
  }

  /**
   * Add Merchant to Terminal (TPN)
   * Uses: Merchant_AddToTerminalApp method
   * @param {string} tpn - Terminal Profile Number
   * @param {string} merchantName - Merchant Name
   * @returns {Promise<Object>} Result object with success flag
   */
  async addMerchantToTerminal(tpn, merchantName) {
    try {
      const client = await this.getClient();
      const config = await getSteamConfig();
      
      // Debug: List available methods that contain "Merchant" or work with Terminal/TPN
      const availableMethods = Object.keys(client).filter(key => 
        typeof client[key] === 'function' && 
        (key.toLowerCase().includes('merchant') || key.toLowerCase().includes('terminal') || key.toLowerCase().includes('tpn'))
      );
      console.log('[SteamClient] Available methods containing "Merchant", "Terminal", or "TPN":', availableMethods);
      
      // Try methods that add merchant to terminal - prioritize Merchant_AddToTerminalApp
      const methodVariations = [
        'Merchant_AddToTerminalApp',
        'Merchant_AddToTerminalAppAsync',
        'MerchantAdd',
        'MerchantAddAsync',
        'Add_Merchant_By_Login',
        'AddMerchantByLogin'
      ];
      
      let methodToCall = null;
      for (const methodName of methodVariations) {
        if (client[methodName] && typeof client[methodName] === 'function') {
          methodToCall = methodName;
          console.log(`[SteamClient] Found merchant method: ${methodName}`);
          break;
        }
      }
      
      if (!methodToCall) {
        console.error('[SteamClient] No merchant add method found. Available methods:', Object.keys(client).filter(k => typeof client[k] === 'function').slice(0, 20));
        return { success: false, error: 'MerchantAdd method not available in SOAP client. Available methods with "Merchant" or "Add": ' + availableMethods.join(', ') };
      }

      return new Promise((resolve, reject) => {
        // Merchant_AddToTerminalApp should add merchant to a TPN
        // Parameters likely include: username, password, tpn, merchantName
        const params = {
          username: config.username,
          password: config.password,
          tpn: tpn,
          merchantName: merchantName
        };

        // Try to manually invoke Add_Merchant_By_Login using the SOAP client's method
        // node-soap allows calling operations by their actual SOAP operation name
        let soapMethod = null;
        
        // Check if Merchant_AddToTerminalApp is available (preferred method)
        if (client.Merchant_AddToTerminalApp) {
          soapMethod = client.Merchant_AddToTerminalApp;
          console.log('[SteamClient] Found Merchant_AddToTerminalApp method');
        } else if (client[methodToCall]) {
          soapMethod = client[methodToCall];
          console.log(`[SteamClient] Using ${methodToCall}`);
        } else {
          resolve({ success: false, error: 'Could not find merchant add to terminal method in SOAP client' });
          return;
        }
        
        console.log(`[SteamClient] Calling SOAP method with params:`, { ...params, password: '***' });

        soapMethod(params, (err, result) => {
          if (err) {
            console.error(`[SteamClient] SOAP method error:`, err);
            resolve({ success: false, error: err.message || 'Failed to add merchant' });
            return;
          }

          console.log(`[SteamClient] SOAP method result:`, result);
          
          // Result structure for Merchant_AddToTerminalApp
          const success = result?.Merchant_AddToTerminalAppResult === true || 
                         result?.success === true ||
                         (result && !result.err && !result.error);
          const error = result?.err || result?.error;
          
          if (error) {
            resolve({ success: false, error: error || 'Failed to add merchant to terminal' });
            return;
          }

          // Merchant_AddToTerminalApp typically returns a boolean success indicator
          if (success) {
            resolve({
              success: true,
              result: result,
              message: `Merchant "${merchantName}" added to TPN ${tpn} successfully`
            });
          } else {
            resolve({
              success: false,
              result: result,
              message: 'Failed to add merchant to terminal'
            });
          }
        });
      });
    } catch (error) {
      console.error('[SteamClient] Add_Merchant exception:', error);
      return { success: false, error: error.message || 'Failed to add merchant' };
    }
  }

  /**
   * Log SOAP request and response to paired file
   */
  async logSoapPair(methodName, requestXml, responseXml, statusCode = null) {
    try {
      console.log(`[SteamClient] logSoapPair called for method: ${methodName}`);
      
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const logDir = path.join(__dirname, '../logs');
      
      console.log(`[SteamClient] Log directory: ${logDir}`);
      
      // Ensure directory exists
      await fs.mkdir(logDir, { recursive: true });
      console.log(`[SteamClient] Log directory created/verified`);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const logFile = path.join(logDir, `soap-pair-${methodName}-${timestamp}.txt`);
      
      console.log(`[SteamClient] Log file path: ${logFile}`);
      
      const logContent = `=== SOAP REQUEST/RESPONSE PAIR ===
Method: ${methodName}
Timestamp: ${new Date().toISOString()}
Status Code: ${statusCode || 'N/A'}

--- REQUEST ---
${requestXml || '(empty)'}

--- RESPONSE ---
${responseXml || '(empty)'}

=== END PAIR ===
`;
      
      console.log(`[SteamClient] Writing log file...`);
      await fs.writeFile(logFile, logContent, 'utf8');
      console.log(`[SteamClient] ✓ SOAP request/response pair saved to: ${logFile}`);
      return logFile;
    } catch (error) {
      console.error('[SteamClient] ✗ Failed to save SOAP pair:', error);
      console.error('[SteamClient] Error details:', error.message);
      console.error('[SteamClient] Error stack:', error.stack);
      throw error; // Re-throw so caller knows it failed
    }
  }

  /**
   * Assign TPN to Location
   * Uses: Assign_Tpn_To_Location_By_Login method (manually constructed SOAP request)
   * @param {string} tpn - Terminal Profile Number
   * @param {number} locationId - Location ID (integer)
   * @param {number} userId - Optional user ID to get user-specific credentials
   * @param {string} varType - Optional VAR type ('UR', 'TSYS', etc.) to use UR-specific credentials
   * @returns {Promise<Object>} Result object with success flag
   */
  async assignTpnToLocation(tpn, locationId, userId = null, varType = null) {
    console.log(`[SteamClient] assignTpnToLocation called with tpn=${tpn}, locationId=${locationId}`);
    
    let soapBody = '';
    let responseText = '';
    let statusCode = null;
    
    try {
      const config = await getSteamConfig(userId, varType);
      console.log(`[SteamClient] Config loaded, apiUrl=${config.apiUrl}`);
      
      const axios = await import('axios');
      console.log(`[SteamClient] Axios imported successfully`);
      
      // Manually construct SOAP request to match exact XML format
      soapBody = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Assign_Tpn_To_Location_By_Login xmlns="http://tempuri.org/"><username>${this.escapeXml(config.username)}</username><password>${this.escapeXml(config.password)}</password><tpn>${this.escapeXml(tpn)}</tpn><locationId>${locationId}</locationId></Assign_Tpn_To_Location_By_Login></soap:Body></soap:Envelope>`;

      const apiUrl = config.apiUrl || 'https://dvmms.com/steam/api/ws/VDirectAccess.asmx';
      
      console.log(`[SteamClient] Making raw SOAP request to Assign_Tpn_To_Location_By_Login`);
      console.log(`[SteamClient] URL: ${apiUrl}`);
      console.log(`[SteamClient] SOAPAction: http://tempuri.org/Assign_Tpn_To_Location_By_Login`);
      console.log(`[SteamClient] Request XML:\n${soapBody}`);

      try {
        const response = await axios.default.post(apiUrl, soapBody, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'http://tempuri.org/Assign_Tpn_To_Location_By_Login'
          }
        });

        statusCode = response.status;
        responseText = typeof response.data === 'string' ? response.data : response.data.toString();
        
        console.log(`[SteamClient] Response status: ${statusCode}`);
        console.log(`[SteamClient] Response XML:\n${responseText}`);
      } catch (axiosError) {
        statusCode = axiosError.response?.status || 'ERROR';
        responseText = axiosError.response?.data ? 
          (typeof axiosError.response.data === 'string' ? axiosError.response.data : axiosError.response.data.toString()) :
          axiosError.message;
        
        console.error(`[SteamClient] Axios error - Status: ${statusCode}`);
        console.error(`[SteamClient] Error response:\n${responseText}`);
      }

      // Log the paired request/response - always try to log, even if there was an error
      console.log(`[SteamClient] Attempting to log SOAP pair...`);
      try {
        await this.logSoapPair('Assign_Tpn_To_Location_By_Login', soapBody, responseText, statusCode);
        console.log(`[SteamClient] SOAP pair logged successfully`);
      } catch (logError) {
        console.error(`[SteamClient] Failed to log SOAP pair:`, logError);
        // Don't fail the whole operation if logging fails
      }

      // Parse the SOAP response
      // Check for SOAP fault
      if (responseText.includes('<soap:Fault>') || responseText.includes('<faultcode>')) {
        const faultMatch = responseText.match(/<faultstring>(.*?)<\/faultstring>/);
        const faultString = faultMatch ? faultMatch[1] : 'Unknown SOAP fault';
        return { success: false, error: faultString };
      }

      // Check for error in response
      const errMatch = responseText.match(/<err[^>]*>(.*?)<\/err>/);
      if (errMatch && errMatch[1].trim()) {
        return { success: false, error: errMatch[1].trim() };
      }

      // Check for result - look for Assign_Tpn_To_Location_By_LoginResult
      const resultMatch = responseText.match(/<Assign_Tpn_To_Location_By_LoginResult[^>]*>(.*?)<\/Assign_Tpn_To_Location_By_LoginResult>/);
      if (resultMatch) {
        const resultValue = resultMatch[1].trim().toLowerCase();
        const success = resultValue === 'true' || resultValue === '1';
        return {
          success: success,
          result: responseText,
          message: success ? `TPN ${tpn} assigned to location ${locationId} successfully` : 'Failed to assign TPN to location'
        };
      }

      // If no explicit result found but no error, assume success
      return {
        success: true,
        result: responseText,
        message: `TPN ${tpn} assigned to location ${locationId} successfully`
      };
    } catch (error) {
      console.error('[SteamClient] Assign_Tpn_To_Location_By_Login exception:', error);
      console.error('[SteamClient] Exception stack:', error.stack);
      
      // Try to log the error case too
      try {
        await this.logSoapPair('Assign_Tpn_To_Location_By_Login', soapBody || 'ERROR: Could not construct request', `ERROR: ${error.message}\n${error.stack}`, 'EXCEPTION');
      } catch (logError) {
        console.error(`[SteamClient] Failed to log exception:`, logError);
      }
      
      return { success: false, error: error.message || 'Failed to assign TPN to location' };
    }
  }

  /**
   * Create Quick Paired Connection (Enable SPIn)
   * Uses: Create_QuickPairedConnection method (manually constructed SOAP request)
   * @param {string} tpn - Terminal Profile Number
   * @param {number} userId - Optional user ID to get user-specific credentials
   * @param {string} varType - Optional VAR type ('UR', 'TSYS', etc.) to use UR-specific credentials
   * @returns {Promise<Object>} Result object with success flag
   */
  async createQuickPairedConnection(tpn, userId = null, varType = null) {
    try {
      const config = await getSteamConfig(userId, varType);
      const axios = await import('axios');
      
      // Manually construct SOAP request to match exact XML format
      const soapBody = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><Create_QuickPairedConnection xmlns="http://tempuri.org/"><UserName>${this.escapeXml(config.username)}</UserName><Password>${this.escapeXml(config.password)}</Password><Tpn>${this.escapeXml(tpn)}</Tpn></Create_QuickPairedConnection></soap:Body></soap:Envelope>`;

      const apiUrl = config.apiUrl || 'https://dvmms.com/steam/api/ws/VDirectAccess.asmx';
      
      console.log(`[SteamClient] Making raw SOAP request to Create_QuickPairedConnection`);
      console.log(`[SteamClient] URL: ${apiUrl}`);
      console.log(`[SteamClient] SOAPAction: http://tempuri.org/Create_QuickPairedConnection`);
      console.log(`[SteamClient] Request XML:\n${soapBody}`);

      let response;
      let responseText = '';
      let statusCode = null;

      try {
        response = await axios.default.post(apiUrl, soapBody, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': 'http://tempuri.org/Create_QuickPairedConnection'
          }
        });

        statusCode = response.status;
        responseText = typeof response.data === 'string' ? response.data : response.data.toString();
        
        console.log(`[SteamClient] Response status: ${statusCode}`);
        console.log(`[SteamClient] Response XML:\n${responseText}`);
      } catch (axiosError) {
        statusCode = axiosError.response?.status || 'ERROR';
        responseText = axiosError.response?.data ? 
          (typeof axiosError.response.data === 'string' ? axiosError.response.data : axiosError.response.data.toString()) :
          axiosError.message;
        
        console.error(`[SteamClient] Axios error - Status: ${statusCode}`);
        console.error(`[SteamClient] Error response:\n${responseText}`);
      }

      // Log the paired request/response
      await this.logSoapPair('Create_QuickPairedConnection', soapBody, responseText, statusCode);

      // Parse the SOAP response
      console.log(`[SteamClient] Parsing Create_QuickPairedConnection response...`);
      
      // Check for SOAP fault
      if (responseText.includes('<soap:Fault>') || responseText.includes('<faultcode>')) {
        console.log(`[SteamClient] SOAP fault detected`);
        const faultMatch = responseText.match(/<faultstring>(.*?)<\/faultstring>/);
        const faultString = faultMatch ? faultMatch[1] : 'Unknown SOAP fault';
        return { success: false, error: faultString };
      }

      // Check for error in response
      const errMatch = responseText.match(/<err[^>]*>(.*?)<\/err>/);
      if (errMatch && errMatch[1].trim() && errMatch[1].trim() !== '') {
        console.log(`[SteamClient] Error in response: ${errMatch[1].trim()}`);
        return { success: false, error: errMatch[1].trim() };
      }

      // Check for Create_QuickPairedConnectionResult - this contains an object with TunelHost, TunelPort, etc.
      console.log(`[SteamClient] Looking for Create_QuickPairedConnectionResult...`);
      const resultMatch = responseText.match(/<Create_QuickPairedConnectionResult[^>]*>([\s\S]*?)<\/Create_QuickPairedConnectionResult>/);
      if (resultMatch) {
        console.log(`[SteamClient] Found Create_QuickPairedConnectionResult`);
        // Extract the result data
        const resultContent = resultMatch[1];
        console.log(`[SteamClient] Result content length: ${resultContent.length}`);
        
        // Check if there's actual content (TunelHost, etc.) - if so, it's successful
        const hasContent = resultContent.includes('<TunelHost>') || 
                          resultContent.includes('<RegisterId>') ||
                          resultContent.trim().length > 0;
        
        console.log(`[SteamClient] Has content: ${hasContent}`);
        
        if (hasContent) {
          // Extract specific fields if needed
          const tunelHostMatch = resultContent.match(/<TunelHost>(.*?)<\/TunelHost>/);
          const registerIdMatch = resultContent.match(/<RegisterId>(.*?)<\/RegisterId>/);
          const authKeyMatch = resultContent.match(/<AuthKey>(.*?)<\/AuthKey>/);
          
          console.log(`[SteamClient] Extracted - TunelHost: ${tunelHostMatch ? tunelHostMatch[1] : 'none'}, RegisterId: ${registerIdMatch ? registerIdMatch[1] : 'none'}`);
          
          return {
            success: true,
            result: {
              tunelHost: tunelHostMatch ? tunelHostMatch[1] : null,
              registerId: registerIdMatch ? registerIdMatch[1] : null,
              authKey: authKeyMatch ? authKeyMatch[1] : null,
              rawXml: responseText
            },
            message: `SPIn enabled for TPN ${tpn} successfully`
          };
        } else {
          console.log(`[SteamClient] Result element found but no content`);
        }
      } else {
        console.log(`[SteamClient] Create_QuickPairedConnectionResult not found in response`);
      }

      // If we got a 200 response and no errors, assume success
      if (statusCode === 200 && !responseText.includes('<soap:Fault>')) {
        console.log(`[SteamClient] Status 200 and no fault - assuming success`);
        return {
          success: true,
          result: responseText,
          message: `SPIn enabled for TPN ${tpn} successfully`
        };
      }

      // If we get here, something unexpected happened
      console.log(`[SteamClient] Unexpected response format - status: ${statusCode}`);
      console.log(`[SteamClient] Response text (first 500 chars): ${responseText.substring(0, 500)}`);
      return {
        success: false,
        error: 'Unexpected response format - could not parse Create_QuickPairedConnectionResult',
        result: responseText
      };
    } catch (error) {
      console.error('[SteamClient] Create_QuickPairedConnection exception:', error);
      console.error('[SteamClient] Exception stack:', error.stack);
      return { 
        success: false, 
        error: error.message || 'Failed to enable SPIn',
        details: error.stack
      };
    }
  }

  /**
   * Add Location to Terminal (TPN)
   * Uses: LocationAdd or similar method that works with TPN
   * @param {string} tpn - Terminal Profile Number
   * @param {string} locationName - Location Name
   * @param {string} merchantName - Merchant Name (optional)
   * @returns {Promise<Object>} Result object with success flag and locationId
   */
  async addLocationToTerminal(tpn, locationName, merchantName = null) {
    try {
      const client = await this.getClient();
      const config = await getSteamConfig();
      
      // Debug: List available methods that contain "Location" or work with Terminal/TPN
      const availableMethods = Object.keys(client).filter(key => 
        typeof client[key] === 'function' && 
        (key.toLowerCase().includes('location') || key.toLowerCase().includes('terminal') || key.toLowerCase().includes('tpn'))
      );
      console.log('[SteamClient] Available methods containing "Location", "Terminal", or "TPN":', availableMethods);
      
      // Try methods that add location - prioritize LocationAdd
      const methodVariations = [
        'LocationAdd',
        'LocationAddAsync',
        'Add_Location_By_Login',
        'AddLocationByLogin'
      ];
      
      let methodToCall = null;
      for (const methodName of methodVariations) {
        if (client[methodName] && typeof client[methodName] === 'function') {
          methodToCall = methodName;
          console.log(`[SteamClient] Found location method: ${methodName}`);
          break;
        }
      }
      
      if (!methodToCall) {
        console.error('[SteamClient] No location add method found. Available methods:', Object.keys(client).filter(k => typeof client[k] === 'function').slice(0, 20));
        return { success: false, error: 'LocationAdd method not available in SOAP client. Available methods with "Location" or "Add": ' + availableMethods.join(', ') };
      }
      
      return new Promise((resolve, reject) => {
        // LocationAdd parameters - typically needs username, password, tpn, location name, and optionally merchant name
        const params = {
          username: config.username,
          password: config.password,
          tpn: tpn,
          name: locationName,
          ...(merchantName && { merchantName: merchantName })
        };

        console.log(`[SteamClient] Calling ${methodToCall} with params:`, { ...params, password: '***' });

        client[methodToCall](params, (err, result) => {
          if (err) {
            console.error(`[SteamClient] ${methodToCall} error:`, err);
            resolve({ success: false, error: err.message || 'Failed to add location' });
            return;
          }

            console.log(`[SteamClient] ${methodToCall} result:`, result);
            
            // Result structure for LocationAdd
            const locationId = result?.LocationAddResult || 
                             result?.locationId ||
                             result?.id;
            const error = result?.err || result?.error;
            const success = result?.LocationAddResult !== false && 
                           result?.success !== false &&
                           !result?.err &&
                           !result?.error;
            
            if (error) {
              resolve({ success: false, error: error || 'Failed to add location to terminal' });
              return;
            }

            // If we got a location ID or success indicator
            if (locationId || success) {
              resolve({
                success: true,
                locationId: locationId,
                result: result,
                message: locationId ? `Location "${locationName}" added to TPN ${tpn} with ID: ${locationId}` : `Location "${locationName}" added to TPN ${tpn} successfully`
              });
            } else {
              resolve({
                success: false,
                locationId: locationId,
                result: result,
                message: 'Failed to add location to terminal - no location ID returned'
              });
            }
        });
      });
    } catch (error) {
      console.error('[SteamClient] Add_Location exception:', error);
      return { success: false, error: error.message || 'Failed to add location' };
    }
  }
}

// Export singleton instance
export const steamClient = new SteamClient();


