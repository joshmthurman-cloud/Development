import { useState, useEffect } from 'react';
import { varAPI } from '../services/api';
import MerchantLocationSelector from './MerchantLocationSelector';

export default function FieldMapper({ varData, steamFields, historyId, template, onReady, detectedType }) {
  // Debug logging
  useEffect(() => {
    console.log('[FieldMapper] steamFields prop:', steamFields);
    console.log('[FieldMapper] varData prop:', varData);
    console.log('[FieldMapper] detectedType prop:', detectedType);
  }, [steamFields, varData, detectedType]);

  // Determine if this is a UR VAR
  const isUR = detectedType === 'UR' || varData?.format === 'UR';
  
  // Initialize Processing_Debit based on VAR type
  const [standardFields, setStandardFields] = useState({
    Contactless_Signature: 'Off',
    // KeyManagement_RKL_Device_GroupName: '', // Hidden for now until field name is found
    TSYS_Authentication_Code: steamFields?.TSYS_Authentication_Code || '', // Preserve from UR data
    Processing_Debit: isUR ? 'UR' : 'No' // UR, MHC, or No
  });

  // Initialize and update editableFields when steamFields prop changes or Processing_Debit changes
  const [editableFields, setEditableFields] = useState(() => {
    // Initialize with steamFields if available, otherwise empty object
    const baseFields = steamFields || {};
    console.log('[FieldMapper] Initial state with steamFields:', baseFields);
    return baseFields;
  });

  useEffect(() => {
    // Ensure we have a valid steamFields object
    const baseFields = steamFields || {};
    console.log('[FieldMapper] Updating editableFields from steamFields:', baseFields);
    let updatedFields = { ...baseFields };
    
    // Always include debit fields (even if not used)
    // For UR: use values from UR data (already populated)
    // For MHC: populate with stock values if Processing_Debit is "MHC"
    if (standardFields.Processing_Debit === 'MHC') {
      // Apply stock debit values for MHC
      updatedFields = {
        ...updatedFields,
        TSYS_Debit_Sharing_Group: updatedFields.TSYS_Debit_Sharing_Group || 'G8E7LYWQNZV',
        TSYS_Merchant_ABA: updatedFields.TSYS_Merchant_ABA || '990025276',
        TSYS_Settlement_Agent: updatedFields.TSYS_Settlement_Agent || 'V074',
        TSYS_Reimbursement_Attribute: updatedFields.TSYS_Reimbursement_Attribute || 'Z'
      };
    } else if (standardFields.Processing_Debit === 'UR') {
      // For UR, keep the values that were already populated from UR data
      // Don't overwrite them with stock values
      updatedFields = {
        ...updatedFields,
        // Ensure fields exist (but don't overwrite if already set from UR data)
        TSYS_Debit_Sharing_Group: updatedFields.TSYS_Debit_Sharing_Group || '',
        TSYS_Merchant_ABA: updatedFields.TSYS_Merchant_ABA || '',
        TSYS_Settlement_Agent: updatedFields.TSYS_Settlement_Agent || '',
        TSYS_Reimbursement_Attribute: updatedFields.TSYS_Reimbursement_Attribute || ''
      };
    } else {
      // For "No", still show fields but leave them empty
      updatedFields = {
        ...updatedFields,
        TSYS_Debit_Sharing_Group: updatedFields.TSYS_Debit_Sharing_Group || '',
        TSYS_Merchant_ABA: updatedFields.TSYS_Merchant_ABA || '',
        TSYS_Settlement_Agent: updatedFields.TSYS_Settlement_Agent || '',
        TSYS_Reimbursement_Attribute: updatedFields.TSYS_Reimbursement_Attribute || ''
      };
    }
    
    // Preserve TSYS_Authentication_Code from UR data if it exists
    if (isUR && steamFields?.TSYS_Authentication_Code) {
      updatedFields.TSYS_Authentication_Code = steamFields.TSYS_Authentication_Code;
      // Also update standardFields to preserve it
      if (standardFields.TSYS_Authentication_Code !== steamFields.TSYS_Authentication_Code) {
        setStandardFields(prev => ({
          ...prev,
          TSYS_Authentication_Code: steamFields.TSYS_Authentication_Code
        }));
      }
    }
    
    console.log('[FieldMapper] Setting editableFields to:', updatedFields);
    setEditableFields(updatedFields);
  }, [steamFields, standardFields.Processing_Debit, isUR]);
  const [tpn, setTpn] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [tpnCreated, setTpnCreated] = useState(false);
  const [tpnCreateResult, setTpnCreateResult] = useState(null);
  const [populating, setPopulating] = useState(false);
  const [parametersPopulated, setParametersPopulated] = useState(false);
  const [addingMerchant, setAddingMerchant] = useState(false);
  const [locationAssigned, setLocationAssigned] = useState(false);
  const [enablingSpin, setEnablingSpin] = useState(false);
  const [spinEnabled, setSpinEnabled] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const handleFieldChange = (fieldName, value) => {
    setEditableFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleStandardFieldChange = (fieldName, value) => {
    setStandardFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleCreateTPN = async () => {
    if (!tpn.trim()) {
      setError('TPN is required');
      return;
    }

    if (!template) {
      setError('Template is required');
      return;
    }

    if (!standardFields.TSYS_Authentication_Code || !standardFields.TSYS_Authentication_Code.trim()) {
      setError('TSYS Authentication Code is required');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await varAPI.createTPN({
        historyId,
        templateId: template.Template_ID,
        tpn: tpn.trim(),
        standardFields: {
          ...standardFields,
          ...editableFields
        }
      });

      if (response.data.success && response.data.tpnCreated) {
        setTpnCreated(true);
        setTpnCreateResult(response.data.createResult);
      } else {
        setError(response.data.error || 'Failed to create TPN');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create TPN');
    } finally {
      setCreating(false);
    }
  };

  const handlePopulateParameters = async () => {
    setPopulating(true);
    setError('');

    try {
      const response = await varAPI.populateParameters({
        historyId,
        templateId: template.Template_ID,
        tpn: tpn.trim(),
        standardFields: {
          ...standardFields,
          ...editableFields
        }
      });

      if (response.data.success) {
        setParametersPopulated(true);
        // Don't call onReady() yet - wait for merchant/location to be added
      } else {
        setError(response.data.error || 'Failed to populate parameters');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to populate parameters');
    } finally {
      setPopulating(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.75rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
      border: '1px solid #e5e7eb',
      width: '100%',
      maxWidth: '100%',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ color: '#212529', marginBottom: '1rem' }}>Field Mapping & TPN Creation</h2>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: '#212529', marginBottom: '1rem' }}>Standard Fields</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#212529' }}>
              Contactless Signature
            </label>
            <select
              value={standardFields.Contactless_Signature}
              onChange={(e) => handleStandardFieldChange('Contactless_Signature', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                color: '#212529',
                backgroundColor: 'white'
              }}
            >
              <option value="Off">Off</option>
              <option value="On Credit">On Credit</option>
              <option value="On Debit">On Debit</option>
              <option value="On Both">On Both</option>
            </select>
          </div>
          {/* KeyManagement RKL Device Group Name - Hidden for now until field name is found */}
          {/* <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#212529' }}>
              KeyManagement RKL Device Group Name
            </label>
            <input
              type="text"
              value={standardFields.KeyManagement_RKL_Device_GroupName}
              onChange={(e) => handleStandardFieldChange('KeyManagement_RKL_Device_GroupName', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                color: '#212529',
                backgroundColor: 'white'
              }}
            />
          </div> */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#212529' }}>
              TSYS Authentication Code <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              type="text"
              value={standardFields.TSYS_Authentication_Code}
              onChange={(e) => handleStandardFieldChange('TSYS_Authentication_Code', e.target.value)}
              placeholder="Enter TSYS Auth Code (includes Heartland code)"
              required
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                color: '#212529',
                backgroundColor: 'white'
              }}
            />
            <p style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.25rem', marginBottom: 0 }}>
              This field includes both TSYS and Heartland authentication codes
            </p>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#212529' }}>
              Processing Debit?
            </label>
            <select
              value={standardFields.Processing_Debit}
              onChange={(e) => handleStandardFieldChange('Processing_Debit', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                color: '#212529',
                backgroundColor: 'white'
              }}
            >
              <option value="No">No</option>
              <option value="UR">UR</option>
              <option value="MHC">MHC</option>
            </select>
            {standardFields.Processing_Debit === 'UR' && (
              <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#d1ecf1', borderRadius: '4px', fontSize: '0.875rem', color: '#0c5460' }}>
                UR funder Processing Debit - Using values from UR VAR sheet:
                <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                  <li>TSYS_Debit_Sharing_Group: {editableFields.TSYS_Debit_Sharing_Group || '(from UR VAR)'}</li>
                  <li>TSYS_Merchant_ABA: {editableFields.TSYS_Merchant_ABA || '(from UR VAR)'}</li>
                  <li>TSYS_Settlement_Agent: {editableFields.TSYS_Settlement_Agent || '(from UR VAR)'}</li>
                  <li>TSYS_Reimbursement_Attribute: {editableFields.TSYS_Reimbursement_Attribute || '(from UR VAR)'}</li>
                </ul>
              </div>
            )}
            {standardFields.Processing_Debit === 'MHC' && (
              <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#d1ecf1', borderRadius: '4px', fontSize: '0.875rem', color: '#0c5460' }}>
                MHC funder Processing Debit - Debit fields will be populated with standard values:
                <ul style={{ margin: '0.5rem 0 0 1.5rem', padding: 0 }}>
                  <li>TSYS_Debit_Sharing_Group: G8E7LYWQNZV</li>
                  <li>TSYS_Merchant_ABA: 990025276</li>
                  <li>TSYS_Settlement_Agent: V074</li>
                  <li>TSYS_Reimbursement_Attribute: Z</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: '#212529', marginBottom: '1rem' }}>Formatted Data For STEAM</h3>
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '1rem'
        }}>
          {(() => {
            // Define required fields in specific order
            const requiredFields = [
              'Merchant_ID',
              'Merchant_Name',
              'Merchant_Address',
              'Merchant_City',
              'Merchant_State',
              'Merchant_City_Code',
              'Merchant_Phone_Number',
              'Merchant_Time_Zone',
              'KeyManagement_RKL_Device_GroupName',
              'TSYS_Merchant_ID',
              'TSYS_Acquirer_Bin',
              'TSYS_Agent_Bank_Number',
              'TSYS_Agent_Chain_Number',
              'TSYS_Store_Number',
              'TSYS_Terminal_Number',
              'TSYS_Category_Code',
              'TSYS_Terminal_ID',
              'TSYS_Authentication_Code',
              'TSYS_Debit_Sharing_Group',
              'TSYS_Merchant_ABA',
              'TSYS_Settlement_Agent',
              'TSYS_Reimbursement_Attribute'
            ];

            // Ensure all required fields exist in editableFields
            // Also merge in standardFields values (like TSYS_Authentication_Code)
            const allFields = { ...editableFields, ...standardFields };
            requiredFields.forEach(field => {
              if (!(field in allFields)) {
                allFields[field] = '';
              }
            });

            console.log('[FieldMapper] Rendering with editableFields:', JSON.stringify(editableFields, null, 2));
            console.log('[FieldMapper] allFields for rendering:', JSON.stringify(allFields, null, 2));
            console.log('[FieldMapper] KeyManagement_RKL_Device_GroupName value:', allFields.KeyManagement_RKL_Device_GroupName);
            console.log('[FieldMapper] Merchant_ID value:', allFields.Merchant_ID);
            console.log('[FieldMapper] Merchant_Name value:', allFields.Merchant_Name);

            // Render fields in the specified order
            return (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {requiredFields.map((fieldName) => {
                  const value = allFields[fieldName] || '';
                  const isEmpty = !value || value.trim() === '';
                  
                  return (
                    <div key={fieldName} style={{ display: 'grid', gridTemplateColumns: '250px 1fr auto', gap: '1rem', alignItems: 'center' }}>
                      <label style={{ fontWeight: 'bold', color: '#212529' }}>{fieldName}:</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                        style={{
                          padding: '0.5rem',
                          border: isEmpty ? '2px solid #ffc107' : '1px solid #ddd',
                          borderRadius: '4px',
                          backgroundColor: isEmpty ? '#fff3cd' : 'white',
                          color: '#212529'
                        }}
                      />
                      {isEmpty && (
                        <span style={{ 
                          color: '#856404', 
                          fontSize: '0.875rem',
                          fontWeight: 'bold',
                          padding: '0.25rem 0.5rem',
                          backgroundColor: '#ffc107',
                          borderRadius: '4px'
                        }}>
                          BLANK
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#212529' }}>
          TPN (Terminal Profile Number) <span style={{ color: '#6c757d', fontSize: '0.875rem', fontWeight: 'normal' }}>(10-12 characters)</span>
        </label>
        <input
          type="text"
          value={tpn}
          onChange={(e) => setTpn(e.target.value)}
          placeholder="Enter TPN (10-12 characters)"
          required
          maxLength={12}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: tpn.length >= 10 && tpn.length <= 12 ? '1px solid #28a745' : '2px solid #dc3545',
            borderRadius: '4px',
            fontSize: '1rem',
            backgroundColor: tpn.length >= 10 && tpn.length <= 12 ? 'white' : '#fff5f5',
            color: '#212529'
          }}
        />
        {tpn && (tpn.length < 10 || tpn.length > 12) && (
          <p style={{ marginTop: '0.5rem', color: '#dc3545', fontSize: '0.875rem' }}>
            TPN must be between 10 and 12 characters (currently {tpn.length})
          </p>
        )}
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

      {tpnCreated && tpnCreateResult && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '4px',
          marginBottom: '1rem',
          border: '1px solid #c3e6cb'
        }}>
          <strong>✓ TPN Created Successfully!</strong>
          <p style={{ margin: '0.5rem 0 0 0' }}>{tpnCreateResult.message}</p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
            TPN: <strong>{tpn}</strong> is ready. Click below to populate parameters.
          </p>
        </div>
      )}

      {!tpnCreated ? (
        <button
          onClick={handleCreateTPN}
          disabled={creating || !tpn.trim() || tpn.length < 10 || tpn.length > 12}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: creating || !tpn.trim() || tpn.length < 10 || tpn.length > 12 ? '#6c757d' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: creating || !tpn.trim() || tpn.length < 10 || tpn.length > 12 ? 'not-allowed' : 'pointer'
          }}
        >
          {creating ? 'Creating TPN...' : 'Create TPN'}
        </button>
      ) : !parametersPopulated ? (
        <button
          onClick={handlePopulateParameters}
          disabled={populating}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: populating ? '#6c757d' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            cursor: populating ? 'not-allowed' : 'pointer'
          }}
        >
          {populating ? 'Populating Parameters...' : 'Populate Parameters →'}
        </button>
      ) : (
        <div>
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
            <strong style={{ color: '#155724' }}>✓ Parameters Populated Successfully!</strong>
            <p style={{ margin: '0.5rem 0 0 0', color: '#155724' }}>
              {locationAssigned ? 'TPN assigned to location successfully. Now enable SPIn.' : 'Now assign TPN to location.'}
            </p>
          </div>
          
          {!locationAssigned ? (
            <div>
              {!selectedLocation ? (
                <div>
                  {isUR ? (
                    // For UR, skip location selector and auto-assign location 183478
                    <div>
                      <div style={{ padding: '1rem', backgroundColor: '#e7f3ff', borderRadius: '4px', border: '1px solid #b3d9ff', marginBottom: '1rem' }}>
                        <strong style={{ color: '#004085' }}>UR VAR Detected:</strong>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#004085' }}>
                          Location will be automatically assigned to ID: 183478 (Production)
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          setAddingMerchant(true);
                          setError('');
                          
                          try {
                            const response = await varAPI.addMerchantLocation({
                              tpn: tpn.trim(),
                              locationId: 183478
                            });
                            
                            if (!response.data.success) {
                              throw new Error(response.data.error || 'Failed to assign TPN to location');
                            }
                            
                            console.log('[FieldMapper] TPN assigned to location successfully:', response.data);
                            setLocationAssigned(true);
                          } catch (err) {
                            setError(err.response?.data?.error || err.message || 'Failed to assign TPN to location');
                          } finally {
                            setAddingMerchant(false);
                          }
                        }}
                        disabled={addingMerchant || !tpn}
                        style={{
                          padding: '0.75rem 2rem',
                          backgroundColor: (addingMerchant || !tpn) ? '#6c757d' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '1rem',
                          cursor: (addingMerchant || !tpn) ? 'not-allowed' : 'pointer',
                          marginBottom: '1rem'
                        }}
                      >
                        {addingMerchant ? 'Assigning TPN to Location...' : 'Assign TPN to Location (183478) →'}
                      </button>
                    </div>
                  ) : (tpn || isUR) ? (
                    <MerchantLocationSelector
                      tpn={tpn ? tpn.trim() : null}
                      varType={detectedType || varData?.format || null}
                      onSelect={(location) => {
                        setSelectedLocation(location);
                      }}
                      selectedLocationId={selectedLocation?.Id || selectedLocation?.id}
                    />
                  ) : (
                    <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', color: '#856404' }}>
                      Please create a TPN first to select a merchant and location.
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
                    <strong style={{ color: '#155724' }}>Selected Location:</strong> <span style={{ color: '#155724' }}>{selectedLocation.Name || selectedLocation.name || 'Unknown'} (ID: {selectedLocation.Id || selectedLocation.id})</span>
                    <button
                      onClick={() => {
                        setSelectedLocation(null);
                      }}
                      style={{
                        marginLeft: '1rem',
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                        cursor: 'pointer'
                      }}
                    >
                      Change
                    </button>
                  </div>
                  {addingMerchant && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 9999
                    }}>
                      <div style={{
                        backgroundColor: 'white',
                        padding: '2rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                      }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#212529', marginBottom: '1rem' }}>
                          Waiting on STEAM!!!
                        </div>
                        <div style={{ color: '#6c757d' }}>
                          Assigning TPN to location...
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={async () => {
                      setAddingMerchant(true);
                      setError('');
                      
                      try {
                        // For UR, use hardcoded location ID 183478
                        const locationId = isUR ? 183478 : (selectedLocation.Id || selectedLocation.id);
                        const response = await varAPI.addMerchantLocation({
                          tpn: tpn.trim(),
                          locationId: locationId
                        });
                        
                        if (!response.data.success) {
                          throw new Error(response.data.error || 'Failed to assign TPN to location');
                        }
                        
                        console.log('[FieldMapper] TPN assigned to location successfully:', response.data);
                        setLocationAssigned(true);
                      } catch (err) {
                        setError(err.response?.data?.error || err.message || 'Failed to assign TPN to location');
                      } finally {
                        setAddingMerchant(false);
                      }
                    }}
                    disabled={addingMerchant}
                    style={{
                      padding: '0.75rem 2rem',
                      backgroundColor: addingMerchant ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      cursor: addingMerchant ? 'not-allowed' : 'pointer',
                      marginBottom: '1rem'
                    }}
                  >
                    {addingMerchant ? 'Assigning TPN to Location...' : 'Assign TPN to Location →'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
                <strong style={{ color: '#155724' }}>✓ TPN assigned to location {isUR ? '183478' : (selectedLocation?.Id || selectedLocation?.id || 'selected location')}</strong>
              </div>
              {!spinEnabled ? (
                <button
                  onClick={async () => {
                    setEnablingSpin(true);
                    setError('');
                    
                    try {
                      // Enable SPIn
                      const response = await varAPI.enableSpin({
                        tpn: tpn.trim()
                      });
                      
                      if (!response.data.success) {
                        throw new Error(response.data.error || 'Failed to enable SPIn');
                      }
                      
                      console.log('[FieldMapper] SPIn enabled successfully:', response.data);
                      
                      // Store SPIn success state with location info
                      setSpinEnabled(true);
                      
                      // Success - proceed to next step with SPIn data
                      onReady(response.data.spinData || null);
                    } catch (err) {
                      setError(err.response?.data?.error || err.message || 'Failed to enable SPIn');
                    } finally {
                      setEnablingSpin(false);
                    }
                  }}
                  disabled={enablingSpin}
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: enablingSpin ? '#6c757d' : '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    cursor: enablingSpin ? 'not-allowed' : 'pointer'
                  }}
                >
                  {enablingSpin ? 'Enabling SPIn...' : 'Enable SPIn →'}
                </button>
              ) : (
                <div>
                  <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#d4edda', borderRadius: '4px', border: '1px solid #c3e6cb' }}>
                    <strong style={{ color: '#155724' }}>✓ SPIn enabled successfully!</strong>
                  </div>
                  {selectedLocation && (
                    <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                      <h4 style={{ color: '#212529', marginBottom: '0.75rem', fontWeight: 'bold' }}>Credentials sent to:</h4>
                      <div style={{ display: 'grid', gap: '0.5rem', color: '#212529' }}>
                        <div><strong>Company Name:</strong> {selectedLocation.BillingCompanyName || selectedLocation.billingCompanyName || 'N/A'}</div>
                        <div><strong>First Name:</strong> {selectedLocation.BillingFirstName || selectedLocation.billingFirstName || 'N/A'}</div>
                        <div><strong>Last Name:</strong> {selectedLocation.BillingLaststName || selectedLocation.BillingLastName || selectedLocation.billingLastName || selectedLocation.billingLaststName || 'N/A'}</div>
                        <div><strong>Email:</strong> {selectedLocation.BillingEmail || selectedLocation.billingEmail || 'N/A'}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


