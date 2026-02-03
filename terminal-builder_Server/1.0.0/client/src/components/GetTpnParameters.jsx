import { useState, useEffect } from 'react';
import { varAPI } from '../services/api';

export default function GetTpnParameters() {
  const [tpn, setTpn] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [parameters, setParameters] = useState(null);
  const [terminalStatus, setTerminalStatus] = useState(null);
  
  // Field management
  const [steamFields, setSteamFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [mode, setMode] = useState('all'); // 'all' or 'custom'
  const [selectedFields, setSelectedFields] = useState([]);
  const [parameterValues, setParameterValues] = useState({}); // Map of fieldName -> parameter data
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Load STEAM fields on component mount
  useEffect(() => {
    const loadFields = async () => {
      try {
        console.log('Loading STEAM fields...');
        const response = await varAPI.getSteamFields();
        console.log('STEAM fields response:', response);
        console.log('Response data:', response.data);
        
        if (response.data) {
          // Handle both success: true format and direct fields array
          const fields = response.data.fields || response.data || [];
          console.log('Loaded fields:', fields);
          
          if (Array.isArray(fields) && fields.length > 0) {
            setSteamFields(fields);
            // Initialize selectedFields with all fields (default mode)
            setSelectedFields(fields);
            setError(''); // Clear any previous errors
          } else {
            throw new Error('No fields found in response');
          }
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Failed to load STEAM fields:', err);
        console.error('Error details:', err.response?.data || err.message);
        const errorMessage = err.response?.data?.error || err.message || 'Failed to load STEAM field names';
        setError(`Failed to load STEAM field names: ${errorMessage}`);
        // Set empty arrays to prevent errors
        setSteamFields([]);
        setSelectedFields([]);
      } finally {
        setLoadingFields(false);
      }
    };
    
    loadFields();
  }, []);

  // Update selectedFields when mode changes
  useEffect(() => {
    if (mode === 'all') {
      // Show all fields
      setSelectedFields([...steamFields]);
    }
    // In custom mode, keep current selection
  }, [mode, steamFields]);

  const handleGetParameters = async () => {
    if (!tpn.trim()) {
      setError('TPN is required');
      return;
    }

    setLoading(true);
    setError('');
    setParameterValues({});
    setTerminalStatus(null);

    try {
      // Get field names based on mode
      const fieldNames = mode === 'all' ? null : selectedFields;
      const response = await varAPI.getTpnParameters(tpn.trim(), fieldNames);
      const params = response.data.parameters || [];
      
      // Store terminal status if available
      if (response.data.terminalStatus) {
        setTerminalStatus(response.data.terminalStatus);
      }
      
      // Create a map of Param_Name -> parameter data for easy lookup
      const valueMap = {};
      params.forEach(param => {
        const fieldName = param.Param_Name || param.ParamName;
        if (fieldName) {
          valueMap[fieldName] = param;
        }
      });
      
      setParameterValues(valueMap);
      setParameters(params);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get TPN parameters');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldToggle = (fieldName) => {
    if (selectedFields.includes(fieldName)) {
      setSelectedFields(selectedFields.filter(f => f !== fieldName));
    } else {
      setSelectedFields([...selectedFields, fieldName]);
    }
  };

  const handleAddField = (fieldName) => {
    if (!selectedFields.includes(fieldName)) {
      setSelectedFields([...selectedFields, fieldName]);
    }
  };

  const handleRemoveField = (fieldName) => {
    setSelectedFields(selectedFields.filter(f => f !== fieldName));
  };

  const handleClearAllFields = () => {
    setSelectedFields([]);
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Reorder the fields
    const newFields = [...selectedFields];
    const [draggedField] = newFields.splice(draggedIndex, 1);
    newFields.splice(dropIndex, 0, draggedField);
    
    setSelectedFields(newFields);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const availableFieldsToAdd = steamFields.filter(f => !selectedFields.includes(f));
  const fieldsToDisplay = mode === 'all' ? steamFields : selectedFields;

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.75rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
      border: '1px solid #e5e7eb'
    }}>
      <h2 style={{ color: '#212529', marginBottom: '1.5rem' }}>Get Terminal Parameters</h2>
      
      {loadingFields && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#d1ecf1',
          color: '#0c5460',
          borderRadius: '4px',
          marginBottom: '1rem'
        }}>
          Loading STEAM field names...
        </div>
      )}
      
      {/* Mode Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#212529', fontWeight: 'bold' }}>
          Field Selection Mode
        </label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="mode"
              value="all"
              checked={mode === 'all'}
              onChange={(e) => setMode(e.target.value)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: '#212529' }}>Show All Fields</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="mode"
              value="custom"
              checked={mode === 'custom'}
              onChange={(e) => setMode(e.target.value)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: '#212529' }}>Custom Select</span>
          </label>
        </div>
      </div>

      {/* TPN Input */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#212529', fontWeight: 'bold' }}>
          TPN (Terminal Profile Number)
        </label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="text"
            value={tpn}
            onChange={(e) => setTpn(e.target.value)}
            placeholder="Enter TPN"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleGetParameters();
              }
            }}
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
              color: '#212529',
              backgroundColor: 'white'
            }}
          />
          <button
            onClick={handleGetParameters}
            disabled={loading || !tpn.trim() || (mode === 'custom' && selectedFields.length === 0)}
            style={{
              padding: '0.5rem 2rem',
              backgroundColor: (loading || !tpn.trim() || (mode === 'custom' && selectedFields.length === 0)) ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: (loading || !tpn.trim() || (mode === 'custom' && selectedFields.length === 0)) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Get Parameters'}
          </button>
        </div>
      </div>

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

      {terminalStatus && (
        <div style={{
          padding: '1rem',
          backgroundColor: terminalStatus.isOnline ? '#d1ecf1' : '#fff3cd',
          color: terminalStatus.isOnline ? '#0c5460' : '#856404',
          borderRadius: '4px',
          marginBottom: '1rem',
          border: `1px solid ${terminalStatus.isOnline ? '#bee5eb' : '#ffeaa7'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <strong>Terminal Status:</strong>
          <span style={{
            fontWeight: 'bold',
            color: terminalStatus.isOnline ? '#28a745' : '#dc3545'
          }}>
            {terminalStatus.status}
          </span>
          {terminalStatus.error && (
            <span style={{ fontSize: '0.875rem', marginLeft: '0.5rem' }}>
              ({terminalStatus.error})
            </span>
          )}
        </div>
      )}

      {/* Results Table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: '#212529', margin: 0 }}>
            {mode === 'all' ? 'All STEAM Fields' : `Custom Fields (${fieldsToDisplay.length} selected)`}
          </h3>
          {parameters && (
            <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>
              {parameters.length} {parameters.length === 1 ? 'value found' : 'values found'}
            </span>
          )}
        </div>

        {/* Custom Mode: Add Field Dropdown */}
        {mode === 'custom' && (
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddField(e.target.value);
                  e.target.value = '';
                }
              }}
              style={{
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                color: '#212529',
                backgroundColor: 'white',
                fontSize: '0.875rem'
              }}
            >
              <option value="">+ Add Field...</option>
              {availableFieldsToAdd.map(field => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
            {selectedFields.length > 0 && (
              <button
                onClick={handleClearAllFields}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#c82333';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#dc3545';
                }}
                title="Clear all selected fields"
              >
                Clear All Fields
              </button>
            )}
            {availableFieldsToAdd.length === 0 && selectedFields.length === 0 && (
              <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>No fields selected</span>
            )}
            {availableFieldsToAdd.length === 0 && selectedFields.length > 0 && (
              <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>All fields selected</span>
            )}
          </div>
        )}

        <div style={{
          maxHeight: '600px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}>
          {fieldsToDisplay.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
              {mode === 'custom' ? 'No fields selected. Add fields to see their values.' : 'No fields available'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                <tr>
                  {mode === 'custom' && (
                    <th style={{ padding: '0.75rem', textAlign: 'center', color: '#212529', fontWeight: 'bold', borderBottom: '2px solid #dee2e6', width: '40px' }}>Remove</th>
                  )}
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#212529', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' }}>Field Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#212529', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' }}>Param ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#212529', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' }}>Value</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#212529', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' }}>Category</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#212529', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' }}>Family</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#212529', fontWeight: 'bold', borderBottom: '2px solid #dee2e6' }}>Enabled</th>
                </tr>
              </thead>
              <tbody>
                {fieldsToDisplay.map((fieldName, index) => {
                  const param = parameterValues[fieldName];
                  const hasValue = param !== undefined;
                  const isDragging = draggedIndex === index;
                  const isDragOver = dragOverIndex === index;
                  
                  return (
                    <tr
                      key={fieldName}
                      draggable={mode === 'custom'}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      style={{
                        borderBottom: '1px solid #eee',
                        backgroundColor: isDragging ? '#e3f2fd' : isDragOver ? '#fff3cd' : (index % 2 === 0 ? 'white' : '#f8f9fa'),
                        cursor: mode === 'custom' ? 'move' : 'default',
                        opacity: isDragging ? 0.5 : 1,
                        transition: 'background-color 0.2s'
                      }}
                    >
                      {mode === 'custom' && (
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleRemoveField(fieldName)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc3545',
                              cursor: 'pointer',
                              fontSize: '1.2rem',
                              lineHeight: 1,
                              padding: 0,
                              width: '24px',
                              height: '24px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Remove field"
                            onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking remove
                          >
                            ×
                          </button>
                        </td>
                      )}
                      <td style={{ padding: '0.75rem', color: '#212529', fontWeight: '500' }}>
                        {mode === 'custom' && (
                          <span style={{ 
                            marginRight: '0.5rem', 
                            color: '#6c757d',
                            cursor: 'move',
                            userSelect: 'none'
                          }}>☰</span>
                        )}
                        {fieldName}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#212529' }}>
                        {hasValue ? (param.Param_ID || '-') : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#212529', maxWidth: '300px', wordBreak: 'break-word' }}>
                        {hasValue ? (
                          param.Param_Value || <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Empty</span>
                        ) : (
                          <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Not retrieved</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#212529' }}>
                        {hasValue ? (param.CategoryName || '-') : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#212529' }}>
                        {hasValue ? (param.FamilyName || '-') : '-'}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#212529' }}>
                        {hasValue ? (param.Enabled !== undefined ? param.Enabled : '-') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
