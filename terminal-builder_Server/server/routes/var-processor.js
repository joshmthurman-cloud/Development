import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { VarParser } from '../services/varParser.js';
import { PdfExtractor } from '../services/pdfExtractor.js';
import { FieldMapper } from '../services/fieldMapper.js';
import { steamClient } from '../services/steamClient.js';
import { getDatabase, promisifyDb } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

// STEAM field name to Param_ID mapping (Live System)
const STEAM_FIELD_PARAM_IDS = {
  'Merchant_ID': 2208174,
  'Merchant_Name': 2208175,
  'Merchant_Address': 2208176,
  'Merchant_City': 2208177,
  'Merchant_State': 2208178,
  'Merchant_City_Code': 2208179,
  'Merchant_Phone_Number': 2208180,
  'Merchant_Time_Zone': 2208182,
  'KeyManagement_RKL_Device_GroupName': 2210148,
  'TSYS_Merchant_ID': 2209760,
  'TSYS_Acquirer_Bin': 2209761,
  'TSYS_Agent_Bank_Number': 2209762,
  'TSYS_Agent_Chain_Number': 2209763,
  'TSYS_Store_Number': 2209764,
  'TSYS_Terminal_Number': 2209765,
  'TSYS_Category_Code': 2209766,
  'TSYS_Terminal_ID': 2209767,
  'TSYS_Authentication_Code': 2209775,
  'TSYS_Debit_Sharing_Group': 2209768,
  'TSYS_Merchant_ABA': 2209769,
  'TSYS_Settlement_Agent': 2209770,
  'TSYS_Reimbursement_Attribute': 2209771,
  'Contactless_Signature': 2208423
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Upload and parse VAR sheet
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    let varType = req.body.varType;
    
    // If varType is 'auto' or not provided, auto-detect
    let detectedType = null;
    if (!varType || varType === 'auto') {
      // Extract text first to detect format
      const text = await PdfExtractor.extractText(filePath);
      console.log(`[VAR Upload] Extracted text length: ${text.length} characters`);
      console.log(`[VAR Upload] First 500 chars of text: ${text.substring(0, 500)}`);
      detectedType = PdfExtractor.identifyFormat(text);
      console.log(`[VAR Upload] Detected format: ${detectedType}`);
      
      // Use detected type, or fallback to TSYS if detection failed
      if (detectedType && detectedType !== 'Unknown') {
        varType = detectedType;
        console.log(`[VAR Upload] Auto-detected VAR type: ${varType} for file: ${fileName}`);
      } else {
        console.log(`[VAR Upload] Warning: Format detection failed or returned Unknown, defaulting to TSYS`);
        varType = 'TSYS';
        detectedType = 'TSYS'; // Set detectedType so it's returned in response
      }
    } else {
      // User manually selected VAR type
      detectedType = varType; // Set detectedType to the manually selected type
      console.log(`[VAR Upload] Processing manually selected ${varType} VAR sheet: ${fileName}`);
    }
    
    // Log which VAR type is being used
    console.log(`[VAR Upload] Using VAR type: ${varType} (${detectedType === varType ? 'auto-detected' : 'manually selected'})`);

    // Parse VAR sheet with detected or specified type
    console.log(`[VAR Upload] Parsing with varType: ${varType}`);
    const varData = await VarParser.parseFromPdf(filePath, varType);
    console.log(`[VAR Upload] Parsed varData keys:`, Object.keys(varData));
    console.log(`[VAR Upload] varData.merchant:`, varData.merchant);
    console.log(`[VAR Upload] varData.terminal:`, varData.terminal);
    
    // Map to STEAM fields (without standard fields for now)
    const steamFields = FieldMapper.mapToSteam(varData, {}, varType);
    
    console.log('[VAR Upload] Mapped steamFields:', JSON.stringify(steamFields, null, 2));
    console.log('[VAR Upload] KeyManagement_RKL_Device_GroupName:', steamFields.KeyManagement_RKL_Device_GroupName);
    console.log('[VAR Upload] Total steamFields count:', Object.keys(steamFields).length);
    console.log('[VAR Upload] Non-empty steamFields:', Object.entries(steamFields).filter(([k, v]) => v && v.trim() !== '').map(([k]) => k));

    // Validate (pass varType so validation is type-aware)
    const validation = FieldMapper.validate(steamFields, varType);

    // Save to processing history (include varType in var_data)
    const db = getDatabase();
    const dbAsync = promisifyDb(db);
    
    // Include varType in the var_data for later reference
    const varDataWithType = {
      ...varData,
      varType: varType
    };
    
    const historyId = await dbAsync.run(
      `INSERT INTO processing_history 
       (user_id, file_name, file_path, var_data, status) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.session.userId,
        fileName,
        filePath,
        JSON.stringify(varDataWithType),
        'parsed'
      ]
    );

    res.json({
      success: true,
      historyId: historyId.lastID,
      varData,
      steamFields,
      validation,
      fileName,
      detectedType: detectedType // Include detected type in response (only set when auto-detection was used)
    });
  } catch (error) {
    console.error('VAR upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process VAR sheet' });
  }
});

// Batch upload
router.post('/upload/batch', requireAuth, upload.array('files', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    const db = getDatabase();
    const dbAsync = promisifyDb(db);

    for (const file of req.files) {
      try {
        const varData = await VarParser.parseFromPdf(file.path);
        const varType = varData.format || 'TSYS';
        const steamFields = FieldMapper.mapToSteam(varData, {}, varType);
        const validation = FieldMapper.validate(steamFields, varType);

        const historyId = await dbAsync.run(
          `INSERT INTO processing_history 
           (user_id, file_name, file_path, var_data, status) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            req.session.userId,
            file.originalname,
            file.path,
            JSON.stringify(varData),
            'parsed'
          ]
        );

        results.push({
          success: true,
          historyId: historyId.lastID,
          fileName: file.originalname,
          varData,
          steamFields,
          validation
        });
      } catch (error) {
        results.push({
          success: false,
          fileName: file.originalname,
          error: error.message
        });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Batch upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to process batch upload' });
  }
});

// Create TPN from parsed VAR data
router.post('/create-tpn', requireAuth, async (req, res) => {
  try {
    const { historyId, templateId, tpn, standardFields } = req.body;

    if (!templateId || !tpn) {
      return res.status(400).json({ error: 'Template ID and TPN are required' });
    }

    // Get processing history
    const db = getDatabase();
    const dbAsync = promisifyDb(db);
    
    const history = await dbAsync.get(
      'SELECT * FROM processing_history WHERE id = ? AND user_id = ?',
      [historyId, req.session.userId]
    );

    if (!history) {
      return res.status(404).json({ error: 'Processing history not found' });
    }

    const varData = JSON.parse(history.var_data);
    const varType = varData.varType || 'TSYS'; // Get varType from stored data, default to TSYS
    
    // Map fields with standard fields
    const steamFields = FieldMapper.mapToSteam(varData, standardFields || {}, varType);

    // Get merchant name for description (use mapped Merchant_Name if available, otherwise fallback)
    const merchantName = steamFields.Merchant_Name || varData.merchant?.dbaName || varData.merchant?.merchantName || 'Unknown Merchant';

    // Get template parameters
    const templateParams = await steamClient.showTemplateParameters(templateId, '', req.session.userId, varType);

    // Step 1: Create the TPN first using Insert_Terminal
    let tpnCreated = false;
    let createError = null;
    let createResult = null;
    
    try {
      tpnCreated = await steamClient.insertTerminal(
        tpn,
        templateId,
        merchantName,  // Use Merchant_Name as Description
        '',
        req.session.userId,
        varType
      );
      createResult = { success: true, message: 'TPN created successfully' };
    } catch (error) {
      createError = error.message;
      createResult = { success: false, message: error.message };
      console.error('TPN creation error:', createError);
    }

    if (!tpnCreated) {
      const errorMsg = createError || 'Failed to create TPN (Insert_Terminal)';
      await dbAsync.run(
        `UPDATE processing_history 
         SET template_id = ?, tpn = ?, status = ?, error_message = ? 
         WHERE id = ?`,
        [templateId, tpn, 'failed', errorMsg, historyId]
      );
      return res.status(500).json({ 
        error: errorMsg,
        tpnCreated: false,
        createResult 
      });
    }

    // Update history with TPN created status (before parameters)
    await dbAsync.run(
      `UPDATE processing_history 
       SET template_id = ?, tpn = ?, status = ?, error_message = ? 
       WHERE id = ?`,
      [templateId, tpn, 'tpn_created', null, historyId]
    );

    // Return success response for TPN creation (user will proceed to populate parameters)
    return res.json({
      success: true,
      tpnCreated: true,
      createResult: { success: true, message: 'TPN created successfully. Ready to populate parameters.' },
      tpn,
      message: 'TPN created successfully. You can now populate the parameters.'
    });
  } catch (error) {
    console.error('Create TPN error:', error);
    res.status(500).json({ error: error.message || 'Failed to create TPN' });
  }
});

// Get list of merchants and locations for a TPN
router.get('/merchants-locations/:tpn', requireAuth, async (req, res) => {
  try {
    const { tpn } = req.params;
    
    // Try to get varType from history if available, or from query parameter
    const db = getDatabase();
    const dbAsync = promisifyDb(db);
    let varType = req.query.varType || null;
    
    // If varType not in query, try to get from history
    if (!varType && tpn) {
      try {
        const history = await dbAsync.get(
          'SELECT var_data FROM processing_history WHERE tpn = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
          [tpn, req.session.userId]
        );
        if (history && history.var_data) {
          const varData = JSON.parse(history.var_data);
          varType = varData.varType || null;
        }
      } catch (err) {
        console.warn('Could not get varType from history:', err.message);
      }
    }
    
    const result = await steamClient.getMerchantListByLogin(tpn || null, req.session.userId, varType);
    res.json({ 
      merchants: result.merchants,
      allLocations: result.allLocations,
      allMerchants: result.allMerchants
    });
  } catch (error) {
    console.error('Get merchants/locations error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch merchants and locations' });
  }
});

// Get list of merchants and locations without TPN (for UR)
router.get('/merchants-locations', requireAuth, async (req, res) => {
  try {
    // Get varType from query parameter (required for this endpoint)
    const varType = req.query.varType || null;
    
    if (!varType || varType !== 'UR') {
      return res.status(400).json({ error: 'varType=UR is required for getting merchants without TPN' });
    }
    
    const result = await steamClient.getMerchantListByLogin(null, req.session.userId, varType);
    res.json({ 
      merchants: result.merchants,
      allLocations: result.allLocations,
      allMerchants: result.allMerchants
    });
  } catch (error) {
    console.error('Get merchants/locations error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch merchants and locations' });
  }
});

// Get STEAM field names list
router.get('/steam-fields', requireAuth, async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const fieldsFile = path.join(__dirname, '../data/steam-fields.json');
    
    console.log('[Get STEAM Fields] Attempting to read file:', fieldsFile);
    
    // Check if file exists
    try {
      await fs.access(fieldsFile);
    } catch (accessError) {
      console.error('[Get STEAM Fields] File does not exist:', fieldsFile);
      return res.status(404).json({
        error: 'STEAM fields file not found',
        path: fieldsFile
      });
    }
    
    const fieldsData = await fs.readFile(fieldsFile, 'utf8');
    const fields = JSON.parse(fieldsData);
    
    console.log('[Get STEAM Fields] Successfully loaded', (fields.fields || []).length, 'fields');
    
    res.json({
      success: true,
      fields: fields.fields || []
    });
  } catch (error) {
    console.error('[Get STEAM Fields] Error:', error);
    console.error('[Get STEAM Fields] Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Failed to get STEAM fields',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get parameters from existing TPN
router.get('/tpn/:tpn/parameters', requireAuth, async (req, res) => {
  try {
    const { tpn } = req.params;
    const { fieldNames } = req.query; // Comma-separated list of field names to filter

    if (!tpn) {
      return res.status(400).json({ error: 'TPN is required' });
    }

    console.log(`[Get TPN Parameters] Request for TPN: ${tpn}`);
    if (fieldNames) {
      console.log(`[Get TPN Parameters] Filtering by field names: ${fieldNames}`);
    }
    
    // Check terminal status via SPIn Proxy
    let terminalStatus = null;
    try {
      console.log(`[Get TPN Parameters] Checking terminal status for TPN: ${tpn}`);
      terminalStatus = await steamClient.checkTerminalStatus(tpn);
      console.log(`[Get TPN Parameters] Terminal status: ${terminalStatus.status} (Online: ${terminalStatus.isOnline})`);
    } catch (statusError) {
      console.warn(`[Get TPN Parameters] Failed to check terminal status: ${statusError.message}`);
      // Continue even if status check fails
    }
    
    // Try to get varType from history if available
    const db = getDatabase();
    const dbAsync = promisifyDb(db);
    let varType = null;
    try {
      const history = await dbAsync.get(
        'SELECT var_data FROM processing_history WHERE tpn = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
        [tpn, req.session.userId]
      );
      if (history && history.var_data) {
        const varData = JSON.parse(history.var_data);
        varType = varData.varType || null;
      }
    } catch (err) {
      console.warn('Could not get varType from history:', err.message);
    }
    
    const parameters = await steamClient.getTerminalParameters(tpn, '', req.session.userId, varType);
    
    console.log(`[Get TPN Parameters] Retrieved ${parameters.length} parameters for TPN: ${tpn}`);
    
    // Create reverse mapping: Param_ID -> Field Name
    const paramIdToFieldName = {};
    Object.keys(STEAM_FIELD_PARAM_IDS).forEach(fieldName => {
      paramIdToFieldName[STEAM_FIELD_PARAM_IDS[fieldName]] = fieldName;
    });
    
    // Get all Param_IDs from STEAM_FIELD_PARAM_IDS (for "show all" mode)
    const allSteamParamIds = Object.values(STEAM_FIELD_PARAM_IDS).map(id => Number(id));
    
    // Filter parameters by field names
    let filteredParameters = parameters;
    let requestedParamIds = [];
    
    if (fieldNames) {
      // Custom select mode: filter by requested field names
      const requestedFields = fieldNames.split(',').map(f => f.trim());
      requestedParamIds = requestedFields
        .map(fieldName => STEAM_FIELD_PARAM_IDS[fieldName])
        .filter(id => id !== undefined)
        .map(id => Number(id)); // Ensure they're numbers for comparison
      
      console.log(`[Get TPN Parameters] Custom mode - Requested fields: ${requestedFields.join(', ')}`);
      console.log(`[Get TPN Parameters] Requested Param_IDs: ${requestedParamIds.join(', ')}`);
    } else {
      // Show all mode: filter by all STEAM fields from the file
      requestedParamIds = allSteamParamIds;
      console.log(`[Get TPN Parameters] Show all mode - Filtering by all ${requestedParamIds.length} STEAM field Param_IDs`);
    }
    
    console.log(`[Get TPN Parameters] Total parameters before filtering: ${parameters.length}`);
    console.log(`[Get TPN Parameters] Looking for Param_IDs: ${requestedParamIds.slice(0, 10).join(', ')}${requestedParamIds.length > 10 ? '...' : ''} (total: ${requestedParamIds.length})`);
    
    if (parameters.length > 0) {
      console.log(`[Get TPN Parameters] Sample parameter structure:`, {
        Param_ID: parameters[0].Param_ID,
        Param_ID_type: typeof parameters[0].Param_ID,
        ParamId: parameters[0].ParamId,
        Param_Name: parameters[0].Param_Name,
        allKeys: Object.keys(parameters[0])
      });
      
      // Show sample of actual Param_IDs from response
      const sampleParamIds = parameters.slice(0, 20).map(p => Number(p.Param_ID || p.ParamId)).filter(id => !isNaN(id));
      console.log(`[Get TPN Parameters] Sample Param_IDs from response: ${sampleParamIds.join(', ')}`);
      
      // Check if any of the requested IDs exist in the response
      const foundParamIds = [];
      const missingParamIds = [];
      requestedParamIds.forEach(requestedId => {
        const found = parameters.some(p => {
          const paramId = Number(p.Param_ID || p.ParamId);
          return paramId === requestedId;
        });
        if (found) {
          foundParamIds.push(requestedId);
        } else {
          missingParamIds.push(requestedId);
        }
      });
      
      console.log(`[Get TPN Parameters] Found ${foundParamIds.length} requested Param_IDs in response: ${foundParamIds.slice(0, 10).join(', ')}${foundParamIds.length > 10 ? '...' : ''}`);
      if (missingParamIds.length > 0) {
        console.log(`[Get TPN Parameters] Missing ${missingParamIds.length} requested Param_IDs: ${missingParamIds.slice(0, 10).join(', ')}${missingParamIds.length > 10 ? '...' : ''}`);
      }
    }
    
    // Filter parameters by Param_ID (handle both string and number types)
    filteredParameters = parameters.filter(param => {
      const paramId = param.Param_ID || param.ParamId;
      // Convert to number for comparison
      const paramIdNum = Number(paramId);
      const isMatch = requestedParamIds.includes(paramIdNum);
      if (isMatch) {
        const fieldName = paramIdToFieldName[paramIdNum] || 'unknown';
        // Add Param_Name if it doesn't exist
        if (!param.Param_Name) {
          param.Param_Name = fieldName;
        }
      }
      return isMatch;
    });
    
    // Add Param_Name to all filtered parameters for display
    filteredParameters.forEach(param => {
      const paramId = Number(param.Param_ID || param.ParamId);
      if (!param.Param_Name && paramIdToFieldName[paramId]) {
        param.Param_Name = paramIdToFieldName[paramId];
      }
    });
    
    console.log(`[Get TPN Parameters] Filtered to ${filteredParameters.length} parameters`);
    
    // Save parameter structure analysis to file for reference
    if (filteredParameters.length > 0) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const logDir = path.join(__dirname, '../logs');
        await fs.mkdir(logDir, { recursive: true });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Save full parameters as JSON
        const paramFile = path.join(logDir, `tpn-parameters-${tpn}-${timestamp}.json`);
        await fs.writeFile(paramFile, JSON.stringify(filteredParameters, null, 2), 'utf8');
        console.log(`TPN parameters saved to: ${paramFile}`);
      } catch (fileError) {
        console.error('Failed to save parameter analysis:', fileError);
      }
    }
    
    res.json({ 
      success: true,
      parameters: filteredParameters,
      count: filteredParameters.length,
      terminalStatus: terminalStatus || null
    });
  } catch (error) {
    console.error('[Get TPN Parameters] Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get TPN parameters',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Populate TPN parameters (separate endpoint)
router.post('/populate-parameters', requireAuth, async (req, res) => {
  try {
    const { historyId, templateId, tpn, standardFields } = req.body;

    if (!templateId || !tpn) {
      return res.status(400).json({ error: 'Template ID and TPN are required' });
    }

    // Get processing history
    const db = getDatabase();
    const dbAsync = promisifyDb(db);
    
    const history = await dbAsync.get(
      'SELECT * FROM processing_history WHERE id = ? AND user_id = ?',
      [historyId, req.session.userId]
    );

    if (!history) {
      return res.status(404).json({ error: 'Processing history not found' });
    }

    const varData = JSON.parse(history.var_data);
    const varType = varData.varType || 'TSYS'; // Get varType from stored data, default to TSYS
    
    // Map fields with standard fields
    const steamFields = FieldMapper.mapToSteam(varData, standardFields || {}, varType);
    
    // Filter steamFields to ONLY include fields that have Param_ID mappings
    const filteredSteamFields = {};
    Object.keys(steamFields).forEach(fieldName => {
      if (STEAM_FIELD_PARAM_IDS[fieldName]) {
        filteredSteamFields[fieldName] = steamFields[fieldName];
      }
    });
    
    console.log(`Original steamFields count: ${Object.keys(steamFields).length}`);
    console.log(`Filtered steamFields count (with Param_ID): ${Object.keys(filteredSteamFields).length}`);
    console.log(`Fields being sent: ${Object.keys(filteredSteamFields).join(', ')}`);
    
    // Use filtered fields
    const fieldsToSend = filteredSteamFields;
    
    // Get template parameters
    const templateParams = await steamClient.showTemplateParameters(templateId, '', req.session.userId, varType);
    
    console.log(`Retrieved ${templateParams.length} template parameters from STEAM`);
    if (templateParams.length > 0) {
      console.log('Sample template parameter structure:', {
        Param_ID: templateParams[0].Param_ID,
        Param_Name: templateParams[0].Param_Name,
        CategoryName: templateParams[0].CategoryName,
        FamilyName: templateParams[0].FamilyName,
        Param_Value: templateParams[0].Param_Value,
        Control_Definition: templateParams[0].Control_Definition,
        Enabled: templateParams[0].Enabled,
        allKeys: Object.keys(templateParams[0])
      });
    }

    // Step 2: Populate parameters using Insert_TerminalParameters
    // ONLY send parameters that we're actually mapping (have values and Param_ID mapping)
    
    // Create a lookup map of template parameters by Param_ID for getting metadata
    const templateParamByParamId = {};
    templateParams.forEach(param => {
      const paramId = param.Param_ID || param.ParamId;
      if (paramId) {
        templateParamByParamId[paramId] = param;
      }
    });
    
    // Get a sample parameter for default structure (fallback)
    const sampleParam = templateParams[0] || {};
    
    // Build parameter list - ONLY include fields we're mapping
    const updatedParams = [];
    
    console.log('=== Building parameter list ===');
    console.log(`Total steamFields keys: ${Object.keys(steamFields).length}`);
    console.log(`STEAM_FIELD_PARAM_IDS keys: ${Object.keys(STEAM_FIELD_PARAM_IDS).length}`);
    
    Object.keys(fieldsToSend).forEach(fieldName => {
      const fieldValue = fieldsToSend[fieldName];
      const paramId = STEAM_FIELD_PARAM_IDS[fieldName];
      
      // Only include if field has a non-empty value and a Param_ID mapping
      if (fieldValue && String(fieldValue).trim() !== '' && paramId) {
        // Try to find parameter details from template by Param_ID
        const templateParam = templateParamByParamId[paramId];
        
        // Build parameter object with all required fields
        const param = {
          Param_ID: paramId,
          Param_Name: fieldName,
          Param_Value: String(fieldValue).trim(),
          // Use template parameter details if found, otherwise use defaults
          CategoryName: templateParam?.CategoryName || templateParam?.Category_Name || '',
          FamilyName: templateParam?.FamilyName || templateParam?.Family_Name || '',
          Control_Definition: templateParam?.Control_Definition || templateParam?.ControlDefinition || 'TEXTBOX',
          Deliminated_String: templateParam?.Deliminated_String || templateParam?.DeliminatedString || '',
          Default_Value: templateParam?.Default_Value || templateParam?.DefaultValue || '',
          Enabled: templateParam?.Enabled !== undefined && templateParam?.Enabled !== null ? templateParam.Enabled : 2
        };
        
        updatedParams.push(param);
        console.log(`✓ Including parameter ${fieldName} (Param_ID: ${paramId}) with value: ${fieldValue}`);
      } else {
        if (!fieldValue || String(fieldValue).trim() === '') {
          console.log(`✗ Skipping ${fieldName} - no value`);
        } else if (!paramId) {
          console.log(`✗ Skipping ${fieldName} - no Param_ID mapping`);
        }
      }
    });
    
    console.log(`=== Final parameter count: ${updatedParams.length} ===`);
    if (updatedParams.length > 0) {
      console.log('Parameters being sent:');
      updatedParams.forEach(p => {
        console.log(`  - ${p.Param_Name} (Param_ID: ${p.Param_ID}, Value: ${p.Param_Value})`);
      });
    } else {
      console.log('WARNING: No parameters to send!');
    }
    
    console.log(`Preparing to populate ${updatedParams.length} parameters`);
    
    // Save parameter summary to file for debugging
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const logDir = path.join(__dirname, '../logs');
      await fs.mkdir(logDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const summaryFile = path.join(logDir, `parameter-summary-${timestamp}.json`);
      await fs.writeFile(summaryFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        tpn,
        totalParameters: updatedParams.length,
        parameters: updatedParams.map(p => ({
          Param_ID: p.Param_ID,
          Param_Name: p.Param_Name,
          Param_Value: p.Param_Value,
          CategoryName: p.CategoryName,
          FamilyName: p.FamilyName
        }))
      }, null, 2), 'utf8');
      console.log(`Parameter summary saved to: ${summaryFile}`);
    } catch (fileError) {
      console.error('Failed to save parameter summary:', fileError);
    }
    
    if (updatedParams.length > 0) {
      console.log('Sample updated parameter:', {
        Param_ID: updatedParams[0].Param_ID,
        Param_Name: updatedParams[0].Param_Name,
        Param_Value: updatedParams[0].Param_Value,
        CategoryName: updatedParams[0].CategoryName,
        Enabled: updatedParams[0].Enabled
      });
    }

    // Populate TPN parameters
    const success = await steamClient.insertTerminalParameters(
      tpn,
      templateId,
      updatedParams,
      '',
      req.session.userId,
      varType
    );

    if (success) {
      // Update history
      await dbAsync.run(
        `UPDATE processing_history 
         SET template_id = ?, template_name = ?, tpn = ?, status = ?, completed_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [templateId, '', tpn, 'completed', historyId]
      );

      res.json({
        success: true,
        tpn,
        message: 'TPN parameters populated successfully'
      });
    } else {
      await dbAsync.run(
        `UPDATE processing_history 
         SET template_id = ?, tpn = ?, status = ?, error_message = ? 
         WHERE id = ?`,
        [templateId, tpn, 'failed', 'Parameter population returned false', historyId]
      );

      res.status(500).json({ error: 'Parameter population failed' });
    }
  } catch (error) {
    console.error('Create TPN error:', error);
    res.status(500).json({ error: error.message || 'Failed to create TPN' });
  }
});

// Get processing history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const dbAsync = promisifyDb(db);
    
    const history = await dbAsync.all(
      `SELECT id, file_name, template_id, template_name, tpn, status, error_message, 
              created_at, completed_at 
       FROM processing_history 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT 100`,
      [req.session.userId]
    );

    res.json({ history });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch processing history' });
  }
});

// Get processing history item
router.get('/history/:id', requireAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const dbAsync = promisifyDb(db);
    
    const history = await dbAsync.get(
      `SELECT * FROM processing_history 
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.session.userId]
    );

    if (!history) {
      return res.status(404).json({ error: 'Processing history not found' });
    }

    const varData = history.var_data ? JSON.parse(history.var_data) : null;
    const steamFields = varData ? FieldMapper.mapToSteam(varData) : {};

    res.json({
      ...history,
      varData,
      steamFields
    });
  } catch (error) {
    console.error('Get history item error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch processing history item' });
  }
});

// Assign TPN to Location and Enable SPIn
// Flow: 1) Assign TPN to Location 4910, 2) Enable SPIn
router.post('/add-merchant-location', requireAuth, async (req, res) => {
  try {
    const { tpn, locationId } = req.body;

    if (!tpn) {
      return res.status(400).json({ error: 'TPN is required' });
    }

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    console.log(`[Assign TPN to Location] Processing for TPN: ${tpn}, Location ID: ${locationId}`);

    // Convert locationId to number if it's a string
    const locationIdNum = typeof locationId === 'string' ? parseInt(locationId, 10) : locationId;
    
    if (isNaN(locationIdNum)) {
      return res.status(400).json({ error: 'Invalid location ID' });
    }

    // Try to get varType from history if available
    const db = getDatabase();
    const dbAsync = promisifyDb(db);
    let varType = null;
    try {
      const history = await dbAsync.get(
        'SELECT var_data FROM processing_history WHERE tpn = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
        [tpn, req.session.userId]
      );
      if (history && history.var_data) {
        const varData = JSON.parse(history.var_data);
        varType = varData.varType || null;
      }
    } catch (err) {
      console.warn('Could not get varType from history:', err.message);
    }

    console.log(`[Step 1] Assigning TPN ${tpn} to location ${locationIdNum}...`);
    const assignResult = await steamClient.assignTpnToLocation(tpn, locationIdNum, req.session.userId, varType);

    if (!assignResult.success) {
      console.error(`[Step 1] Failed to assign TPN to location: ${assignResult.error}`);
      return res.status(500).json({ 
        success: false,
        error: `Failed to assign TPN to location: ${assignResult.error}`,
        step: 'assign',
        locationId: locationIdNum
      });
    }

    console.log(`[Step 1] ✓ Successfully assigned TPN ${tpn} to location ${locationIdNum}`);

    res.json({ 
      success: true, 
      message: `TPN ${tpn} assigned to location ${locationIdNum} successfully`,
      locationId: locationIdNum
    });
  } catch (error) {
    console.error('Assign TPN to location error:', error);
    res.status(500).json({ error: error.message || 'Failed to assign TPN to location' });
  }
});

// Enable SPIn (Create Quick Paired Connection)
// Separate endpoint to enable SPIn after TPN is assigned to location
router.post('/enable-spin', requireAuth, async (req, res) => {
  try {
    const { tpn } = req.body;

    if (!tpn) {
      return res.status(400).json({ error: 'TPN is required' });
    }

    console.log(`[Enable SPIn] Processing for TPN: ${tpn}`);

    // Try to get varType from history if available
    const db = getDatabase();
    const dbAsync = promisifyDb(db);
    let varType = null;
    try {
      const history = await dbAsync.get(
        'SELECT var_data FROM processing_history WHERE tpn = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
        [tpn, req.session.userId]
      );
      if (history && history.var_data) {
        const varData = JSON.parse(history.var_data);
        varType = varData.varType || null;
      }
    } catch (err) {
      console.warn('Could not get varType from history:', err.message);
    }

    const spinResult = await steamClient.createQuickPairedConnection(tpn, req.session.userId, varType);

    if (!spinResult.success) {
      console.error(`[Enable SPIn] Failed to enable SPIn: ${spinResult.error}`);
      return res.status(500).json({ 
        success: false,
        error: `Failed to enable SPIn: ${spinResult.error}`
      });
    }

    console.log(`[Enable SPIn] ✓ Successfully enabled SPIn for TPN ${tpn}`);

    res.json({ 
      success: true, 
      message: `SPIn enabled for TPN ${tpn} successfully`,
      spinEnabled: true,
      spinData: spinResult.result || null // Include AuthKey, RegisterId, etc.
    });
  } catch (error) {
    console.error('Enable SPIn error:', error);
    res.status(500).json({ error: error.message || 'Failed to enable SPIn' });
  }
});

export default router;



