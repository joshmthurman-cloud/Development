import { useState, useEffect, useMemo } from 'react';
import { templatesAPI } from '../services/api';

export default function TemplateSelector({ onSelect, initialData }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [expandedHardware, setExpandedHardware] = useState(new Set());
  const [expandedScenarios, setExpandedScenarios] = useState(new Set());

  // Get varType from initialData (could be in varData.format or detectedType)
  const varType = useMemo(() => {
    return initialData?.varData?.format || initialData?.detectedType || null;
  }, [initialData]);

  useEffect(() => {
    loadTemplates();
  }, [varType]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await templatesAPI.getTemplates(varType);
      const templatesList = response.data.templates || [];
      setTemplates(templatesList);
      
      // Auto-expand all hardware initially
      const hardwareSet = new Set();
      templatesList.forEach(t => {
        if (t.Hardware_Name) {
          hardwareSet.add(t.Hardware_Name);
        }
      });
      setExpandedHardware(hardwareSet);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Group templates hierarchically: Hardware_Name → ScenarioName → Template_Name
  // Filter to show only the latest scenario (prioritize "_Fixed" suffix or highest version)
  const groupedTemplates = templates.reduce((acc, template) => {
    const hardwareName = template.Hardware_Name || 'Unknown Hardware';
    const scenarioName = template.ScenarioName || 'Unknown Scenario';
    const templateName = template.Template_Name || 'Unknown Template';
    const templateId = template.Template_ID || template.TemplateId;
    
    if (!acc[hardwareName]) {
      acc[hardwareName] = {};
    }
    
    if (!acc[hardwareName][scenarioName]) {
      acc[hardwareName][scenarioName] = [];
    }
    
    // Only add if not already present (by Template_ID)
    const exists = acc[hardwareName][scenarioName].some(t => 
      (t.Template_ID || t.TemplateId) === templateId
    );
    
    if (!exists) {
      acc[hardwareName][scenarioName].push(template);
    }
    
    return acc;
  }, {});

  // Filter scenarios to show only the latest/newest one per hardware
  // Use ScenarioNumber (represents date, larger = newer)
  const filteredGroupedTemplates = Object.keys(groupedTemplates).reduce((acc, hardwareName) => {
    const scenarios = groupedTemplates[hardwareName];
    const scenarioNames = Object.keys(scenarios);
    
    if (scenarioNames.length === 0) {
      return acc;
    }
    
    // Get the ScenarioNumber for each scenario (use the first template's ScenarioNumber as representative)
    // ScenarioNumber represents the date, so larger = newer
    const scenarioData = scenarioNames.map(scenarioName => {
      const templates = scenarios[scenarioName];
      const firstTemplate = templates[0];
      
      // Try multiple possible field names for ScenarioNumber
      const scenarioNumber = parseInt(
        firstTemplate?.ScenarioNumber || 
        firstTemplate?.Scenario_Number || 
        firstTemplate?.scenarioNumber || 
        firstTemplate?.ScenarioNumber_ID ||
        firstTemplate?.ScenarioNumberId ||
        0, 
        10
      );
      
      // Debug logging
      if (hardwareName.includes('QD') || scenarioName.includes('DvPay_40043')) {
        console.log(`[TemplateSelector] Hardware: ${hardwareName}, Scenario: ${scenarioName}, ScenarioNumber: ${scenarioNumber}, Template keys:`, Object.keys(firstTemplate || {}));
      }
      
      return {
        name: scenarioName,
        scenarioNumber: scenarioNumber || 0,
        templates
      };
    });
    
    // Sort scenarios by larger ScenarioNumber (larger = newer date)
    scenarioData.sort((a, b) => {
      const diff = b.scenarioNumber - a.scenarioNumber;
      if (diff !== 0) return diff;
      // If ScenarioNumbers are equal, fall back to name comparison
      return b.name.localeCompare(a.name);
    });
    
    console.log(`[TemplateSelector] Hardware: ${hardwareName}, Sorted scenarios:`, scenarioData.map(s => `${s.name} (ScenarioNumber: ${s.scenarioNumber})`));
    
    // Only keep the first (highest ScenarioNumber = newest) scenario
    const latestScenario = scenarioData[0];
    
    acc[hardwareName] = {
      [latestScenario.name]: latestScenario.templates
    };
    
    return acc;
  }, {});

  const toggleHardware = (hardwareName) => {
    const newExpanded = new Set(expandedHardware);
    if (newExpanded.has(hardwareName)) {
      newExpanded.delete(hardwareName);
    } else {
      newExpanded.add(hardwareName);
    }
    setExpandedHardware(newExpanded);
  };

  const toggleScenario = (hardwareName, scenarioName) => {
    const key = `${hardwareName}::${scenarioName}`;
    const newExpanded = new Set(expandedScenarios);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedScenarios(newExpanded);
  };

  const handleSelect = (template) => {
    setSelectedTemplate(template);
    onSelect(template);
  };

  // Calculate counts for display
  const getHardwareCounts = (hardwareName) => {
    const scenarios = filteredGroupedTemplates[hardwareName] || {};
    const scenarioCount = Object.keys(scenarios).length;
    const templateCount = Object.values(scenarios).reduce((sum, templates) => sum + templates.length, 0);
    return { scenarioCount, templateCount };
  };

  const getScenarioCounts = (hardwareName, scenarioName) => {
    const templates = filteredGroupedTemplates[hardwareName]?.[scenarioName] || [];
    return templates.length;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: '#212529' }}>Loading templates...</p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ color: '#212529', marginBottom: '1rem' }}>Select Template</h2>
      
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}
      
      <div style={{
        maxHeight: '600px',
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: '4px',
        padding: '0.5rem'
      }}>
        {Object.keys(filteredGroupedTemplates).length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
            No templates available
          </div>
        ) : (
          <div>
            {Object.keys(filteredGroupedTemplates).map((hardwareName) => {
              const isHardwareExpanded = expandedHardware.has(hardwareName);
              const { scenarioCount, templateCount } = getHardwareCounts(hardwareName);
              
              return (
                <div key={hardwareName} style={{ marginBottom: '0.5rem' }}>
                  {/* Hardware Level */}
                  <div
                    onClick={() => toggleHardware(hardwareName)}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: isHardwareExpanded ? '#e7f3ff' : '#f8f9fa',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: 'bold',
                      color: '#212529',
                      marginBottom: '0.25rem'
                    }}
                  >
                    <span>{hardwareName}</span>
                    <span style={{ fontSize: '0.875rem', color: '#6c757d', fontWeight: 'normal' }}>
                      {scenarioCount} scenario{scenarioCount !== 1 ? 's' : ''} / {templateCount} template{templateCount !== 1 ? 's' : ''}
                      {isHardwareExpanded ? ' ▼' : ' ▶'}
                    </span>
                  </div>
                  
                  {/* Scenarios Level */}
                  {isHardwareExpanded && (
                    <div style={{ marginLeft: '1rem', marginTop: '0.25rem' }}>
                      {Object.keys(filteredGroupedTemplates[hardwareName]).map((scenarioName) => {
                        const scenarioKey = `${hardwareName}::${scenarioName}`;
                        const isScenarioExpanded = expandedScenarios.has(scenarioKey);
                        const templateCount = getScenarioCounts(hardwareName, scenarioName);
                        const scenarioTemplates = filteredGroupedTemplates[hardwareName][scenarioName];
                        
                        return (
                          <div key={scenarioKey} style={{ marginBottom: '0.5rem' }}>
                            <div
                              onClick={() => toggleScenario(hardwareName, scenarioName)}
                              style={{
                                padding: '0.5rem 0.75rem',
                                backgroundColor: isScenarioExpanded ? '#f0f8ff' : 'white',
                                border: '1px solid #e9ecef',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                color: '#212529',
                                marginBottom: '0.25rem'
                              }}
                            >
                              <span>{scenarioName}</span>
                              <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                                {templateCount} template{templateCount !== 1 ? 's' : ''}
                                {isScenarioExpanded ? ' ▼' : ' ▶'}
                              </span>
                            </div>
                            
                            {/* Templates Level */}
                            {isScenarioExpanded && (
                              <div style={{ marginLeft: '1rem', marginTop: '0.25rem', borderLeft: '2px solid #ddd', paddingLeft: '0.75rem' }}>
                                <div style={{ fontWeight: 'bold', color: '#6c757d', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                  Templates:
                                </div>
                                {scenarioTemplates.map((template) => {
                                  const templateId = template.Template_ID || template.TemplateId;
                                  const templateName = template.Template_Name || 'Unknown Template';
                                  const isSelected = selectedTemplate?.Template_ID === templateId || selectedTemplate?.TemplateId === templateId;
                                  
                                  return (
                                    <div
                                      key={templateId}
                                      style={{
                                        padding: '0.5rem',
                                        marginBottom: '0.25rem',
                                        backgroundColor: isSelected ? '#d4edda' : 'white',
                                        border: isSelected ? '2px solid #28a745' : '1px solid #e9ecef',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                      }}
                                    >
                                      <div>
                                        <span style={{ fontWeight: 'bold', color: '#212529' }}>
                                          {templateName}
                                        </span>
                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6c757d' }}>
                                          (ID: {templateId})
                                        </span>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSelect(template);
                                        }}
                                        style={{
                                          padding: '0.25rem 0.75rem',
                                          backgroundColor: isSelected ? '#28a745' : '#007bff',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '0.875rem',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        {isSelected ? 'Selected' : 'Create Terminal'}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Summary */}
      {Object.keys(filteredGroupedTemplates).length > 0 && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '0.875rem',
          color: '#6c757d',
          textAlign: 'center'
        }}>
          Total: {Object.keys(filteredGroupedTemplates).length} model{Object.keys(filteredGroupedTemplates).length !== 1 ? 's' : ''} / {' '}
          {Object.values(filteredGroupedTemplates).reduce((sum, scenarios) => sum + Object.keys(scenarios).length, 0)} scenario{Object.values(filteredGroupedTemplates).reduce((sum, scenarios) => sum + Object.keys(scenarios).length, 0) !== 1 ? 's' : ''} / {' '}
          {templates.length} template{templates.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
