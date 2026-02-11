import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { steamClient } from '../services/steamClient.js';

const router = express.Router();

// Get list of templates
router.get('/', requireAuth, async (req, res) => {
  try {
    // Get varType from query parameter if provided (e.g., ?varType=UR)
    const varType = req.query.varType || null;
    const templates = await steamClient.showTemplateList('', req.session.userId, varType);
    
    // Filter to unique Template_IDs only
    // For duplicate Template_IDs, keep only the one with the highest ScenarioNumber (latest date)
    const templateMap = new Map();
    
    for (const template of templates) {
      const templateId = template.Template_ID || template.TemplateId;
      if (!templateId) continue;
      
      // ScenarioNumber is a long integer (e.g., 2025011601 = 2025-01-16-01)
      // Handle both number and string types from SOAP parser
      let scenarioNumber = template.ScenarioNumber;
      
      // Debug: Log raw ScenarioNumber value for Template_ID 5047
      if (templateId === 5047) {
        console.log(`[Templates] RAW Template_ID ${templateId}: ScenarioName=${template.ScenarioName}, ScenarioNumber raw=${template.ScenarioNumber}, type=${typeof template.ScenarioNumber}, value=${JSON.stringify(template.ScenarioNumber)}`);
      }
      
      if (scenarioNumber === null || scenarioNumber === undefined) {
        scenarioNumber = 0;
      } else if (typeof scenarioNumber === 'string') {
        scenarioNumber = parseInt(scenarioNumber, 10);
        if (isNaN(scenarioNumber)) scenarioNumber = 0;
      } else if (typeof scenarioNumber !== 'number') {
        scenarioNumber = 0;
      }
      
      // Debug logging for Template_ID 5047
      if (templateId === 5047) {
        console.log(`[Templates] PARSED Template_ID ${templateId}: ScenarioName=${template.ScenarioName}, ScenarioNumber=${scenarioNumber}`);
      }
      
      if (!templateMap.has(templateId)) {
        // First occurrence of this Template_ID
        templateMap.set(templateId, template);
        if (templateId === 5047) {
          console.log(`[Templates] First Template_ID ${templateId}: ScenarioNumber=${scenarioNumber}, ScenarioName=${template.ScenarioName}`);
        }
      } else {
        // Duplicate Template_ID - compare ScenarioNumbers
        const existingTemplate = templateMap.get(templateId);
        let existingScenarioNumber = existingTemplate.ScenarioNumber;
        if (existingScenarioNumber === null || existingScenarioNumber === undefined) {
          existingScenarioNumber = 0;
        } else if (typeof existingScenarioNumber === 'string') {
          existingScenarioNumber = parseInt(existingScenarioNumber, 10);
          if (isNaN(existingScenarioNumber)) existingScenarioNumber = 0;
        } else if (typeof existingScenarioNumber !== 'number') {
          existingScenarioNumber = 0;
        }
        
        // Keep the one with the higher ScenarioNumber (newer date)
        if (scenarioNumber > existingScenarioNumber) {
          console.log(`[Templates] Replacing Template_ID ${templateId}: ScenarioNumber ${existingScenarioNumber} (${existingTemplate.ScenarioName}) -> ${scenarioNumber} (${template.ScenarioName})`);
          templateMap.set(templateId, template);
        } else {
          if (templateId === 5047) {
            console.log(`[Templates] Keeping existing Template_ID ${templateId}: ScenarioNumber ${existingScenarioNumber} (${existingTemplate.ScenarioName}) >= ${scenarioNumber} (${template.ScenarioName})`);
          }
        }
      }
    }
    
    const uniqueTemplates = Array.from(templateMap.values());
    
    // Debug: Log a sample template to see its structure
    if (uniqueTemplates.length > 0) {
      const sample = uniqueTemplates.find(t => (t.Template_ID || t.TemplateId) === 40043 || t.ScenarioName?.includes('DvPay_40043'));
      if (sample) {
        console.log(`[Templates] Sample template for Template_ID 40043:`, {
          Template_ID: sample.Template_ID || sample.TemplateId,
          ScenarioName: sample.ScenarioName,
          AllKeys: Object.keys(sample),
          ScenarioNumber: sample.ScenarioNumber,
          Scenario_Number: sample.Scenario_Number,
          scenarioNumber: sample.scenarioNumber
        });
      }
    }
    
    // Debug: Log all templates with Template_ID 5047 to verify ScenarioNumber extraction
    const templates5047 = uniqueTemplates.filter(t => (t.Template_ID || t.TemplateId) === 5047);
    if (templates5047.length > 0) {
      console.log(`[Templates] Final result for Template_ID 5047:`, templates5047.map(t => ({
        Template_ID: t.Template_ID || t.TemplateId,
        ScenarioName: t.ScenarioName,
        ScenarioNumber: t.ScenarioNumber,
        ScenarioNumberType: typeof t.ScenarioNumber,
        AllKeys: Object.keys(t)
      })));
    }
    
    console.log(`[Templates] Filtered from ${templates.length} to ${uniqueTemplates.length} unique templates by Template_ID (keeping highest ScenarioNumber)`);
    
    res.json({ templates: uniqueTemplates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch templates' });
  }
});

// Get template parameters
router.get('/:templateId/parameters', requireAuth, async (req, res) => {
  try {
    const templateId = parseInt(req.params.templateId);
    if (isNaN(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID' });
    }

    // Get varType from query parameter if provided (e.g., ?varType=UR)
    const varType = req.query.varType || null;
    const parameters = await steamClient.showTemplateParameters(templateId, '', req.session.userId, varType);
    res.json({ parameters });
  } catch (error) {
    console.error('Get template parameters error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch template parameters' });
  }
});

export default router;


