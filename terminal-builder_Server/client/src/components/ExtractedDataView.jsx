import { useState } from 'react';

export default function ExtractedDataView({ varData, steamFields, fileName, validation, detectedType, onContinue, onBack }) {
  const [activeSection, setActiveSection] = useState('mapped'); // 'mapped', 'comparison'

  const renderRawData = () => {
    if (!varData) return <p>No data available</p>;

    return (
      <div style={{ display: 'grid', gap: '2rem' }}>
        {/* Format Info */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#e7f3ff',
          borderRadius: '4px',
          border: '1px solid #b3d9ff'
        }}>
          <strong>Detected Format:</strong> {varData.format || 'Unknown'}
        </div>

        {/* Merchant Information */}
        {varData.merchant && Object.keys(varData.merchant).length > 0 && (
          <div>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Merchant Information</h3>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(varData.merchant).map(([key, value]) => (
                    <tr key={key} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ 
                        padding: '0.75rem', 
                        fontWeight: 'bold', 
                        width: '200px',
                        color: '#495057'
                      }}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}:
                      </td>
                      <td style={{ padding: '0.75rem', color: '#212529' }}>
                        {value || <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Not found</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Terminal Information */}
        {varData.terminal && Object.keys(varData.terminal).length > 0 && (
          <div>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Terminal Information</h3>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(varData.terminal).map(([key, value]) => (
                    <tr key={key} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ 
                        padding: '0.75rem', 
                        fontWeight: 'bold', 
                        width: '200px',
                        color: '#495057'
                      }}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}:
                      </td>
                      <td style={{ padding: '0.75rem', color: '#212529' }}>
                        {value || <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Not found</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Card Types */}
        {varData.cardTypes && Object.keys(varData.cardTypes).length > 0 && (
          <div>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Card Types</h3>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(varData.cardTypes).map(([key, value]) => (
                    <tr key={key} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ 
                        padding: '0.75rem', 
                        fontWeight: 'bold', 
                        width: '200px',
                        color: '#495057'
                      }}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}:
                      </td>
                      <td style={{ padding: '0.75rem', color: '#212529' }}>
                        {value || <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Not found</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Debit Information */}
        {varData.debit && Object.keys(varData.debit).length > 0 && (
          <div>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Debit Information</h3>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #dee2e6'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(varData.debit).map(([key, value]) => (
                    <tr key={key} style={{ borderBottom: '1px solid #dee2e6' }}>
                      <td style={{ 
                        padding: '0.75rem', 
                        fontWeight: 'bold', 
                        width: '200px',
                        color: '#495057'
                      }}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim()}:
                      </td>
                      <td style={{ padding: '0.75rem', color: '#212529' }}>
                        {value || <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Not found</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMappedFields = () => {
    if (!steamFields || Object.keys(steamFields).length === 0) {
      return <p>No mapped fields available</p>;
    }

    return (
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#333', textAlign: 'center' }}>Formatted Data For STEAM</h3>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem',
          borderRadius: '4px',
          border: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6', backgroundColor: '#e9ecef' }}>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#212529', fontWeight: 'bold' }}>STEAM Field Name</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#212529', fontWeight: 'bold' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(steamFields).map(([fieldName, value]) => (
                <tr key={fieldName} style={{ borderBottom: '1px solid #dee2e6' }}>
                  <td style={{ 
                    padding: '0.75rem', 
                    fontWeight: 'bold',
                    color: '#495057',
                    textAlign: 'center'
                  }}>
                    {fieldName}
                  </td>
                  <td style={{ padding: '0.75rem', color: '#212529', textAlign: 'center' }}>
                    {value || <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Empty</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderComparison = () => {
    // Get VAR type from varData.format
    const varType = varData?.format || 'TSYS'; // Default to TSYS if not specified
    
    // Define field name mappings for each VAR type
    const fieldNameMap = {
      TSYS: {
        'Merchant_ID': 'Merchant ID',
        'Merchant_Name': 'DBA Name',
        'Merchant_Address': 'Address',
        'Merchant_City': 'Merchant City',
        'Merchant_State': 'Merchant State',
        'Merchant_City_Code': 'Merchant Zipcode',
        'Merchant_Phone_Number': 'DBA Phone',
        'Merchant_Time_Zone': 'Time Zone Ind',
        'KeyManagement_RKL_Device_GroupName': 'Not in VAR (Default Value)',
        'TSYS_Merchant_ID': 'Vital Merchant ID',
        'TSYS_Acquirer_Bin': 'Acquirer ID',
        'TSYS_Agent_Bank_Number': 'Agency Number',
        'TSYS_Agent_Chain_Number': 'Chain Number',
        'TSYS_Store_Number': 'Store Number',
        'TSYS_Terminal_Number': 'Terminal Number',
        'TSYS_Category_Code': 'SIC Code',
        'TSYS_Terminal_ID': 'Terminal ID'
      },
      Propelr: {
        'Merchant_ID': 'Merchant Number',
        'Merchant_Name': 'Merchant Name',
        'Merchant_Address': 'Street Address',
        'Merchant_City': 'City',
        'Merchant_State': 'State',
        'Merchant_City_Code': 'Postal Code',
        'Merchant_Phone_Number': 'Phone Number',
        'Merchant_Time_Zone': 'Time Zone Differential',
        'KeyManagement_RKL_Device_GroupName': 'Not in VAR (Default Value)',
        'TSYS_Merchant_ID': 'Merchant Number',
        'TSYS_Acquirer_Bin': 'BIN',
        'TSYS_Agent_Bank_Number': 'Agent',
        'TSYS_Agent_Chain_Number': 'Chain',
        'TSYS_Store_Number': 'Store Number',
        'TSYS_Terminal_Number': 'Terminal#',
        'TSYS_Category_Code': 'VISA MCC',
        'TSYS_Terminal_ID': 'V Number'
      },
      Heartland: {
        'Merchant_ID': 'MID',
        'Merchant_Name': 'Merchant Name',
        'Merchant_Address': 'DBA Address 1',
        'Merchant_City': 'DBA City',
        'Merchant_State': 'DBA State',
        'Merchant_City_Code': 'DBA Zip',
        'Merchant_Phone_Number': 'DBA Phone',
        'Merchant_Time_Zone': 'Time Zone',
        'KeyManagement_RKL_Device_GroupName': 'Not in VAR (Default Value)',
        'TSYS_Merchant_ID': 'MID',
        'TSYS_Acquirer_Bin': 'Acquiring Bank Name/Bin',
        'TSYS_Agent_Bank_Number': 'Agent Number',
        'TSYS_Agent_Chain_Number': 'Chain Number',
        'TSYS_Store_Number': 'Store Number',
        'TSYS_Terminal_Number': 'Terminal Number',
        'TSYS_Category_Code': 'SIC',
        'TSYS_Terminal_ID': 'Terminal TID'
      },
      UR: {
        'Merchant_ID': 'Merchant Number (12 digits)',
        'Merchant_Name': 'Merchant Name (various)',
        'Merchant_Address': 'Merchant Physical Address',
        'Merchant_City': 'Merchant City (various)',
        'Merchant_State': 'Merchant State (2 characters)',
        'Merchant_City_Code': 'Merchant City/Location/Zip Code (5 digits)',
        'Merchant_Phone_Number': 'Not in VAR',
        'Merchant_Time_Zone': 'Time Zone Differential (3 digits)',
        'KeyManagement_RKL_Device_GroupName': 'Not in VAR (Default Value)',
        'TSYS_Merchant_ID': 'Merchant Number (12 digits)',
        'TSYS_Acquirer_Bin': 'Acquiring Bank ID/BIN (6 digits)',
        'TSYS_Agent_Bank_Number': 'Agent Number (6 digits)',
        'TSYS_Agent_Chain_Number': 'Chain Code (6 digits)',
        'TSYS_Store_Number': 'Store # (4 digits)',
        'TSYS_Terminal_Number': 'Terminal # (4 digits)',
        'TSYS_Category_Code': 'Merchant Category/SIC Code (4 digits)',
        'TSYS_Terminal_ID': 'VisaNet Terminal ID (8 digits)',
        'TSYS_Authentication_Code': 'Authentication Code',
        'TSYS_Debit_Sharing_Group': 'Sharing Groups',
        'TSYS_Merchant_ABA': 'ABA',
        'TSYS_Settlement_Agent': 'Settlement',
        'TSYS_Reimbursement_Attribute': 'Re-imbursement Attribute'
      }
    };

    // Define all required STEAM fields in order
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

    // Get the field name map for the current VAR type
    const currentFieldMap = fieldNameMap[varType] || fieldNameMap.TSYS;

    // Create a mapping showing VAR field → STEAM field for all required fields
    const mapping = requiredFields.map(steamField => {
      // Get VAR field name specific to the VAR type
      const varField = currentFieldMap[steamField] || 'Unknown';
      let varValue = '';
      
      switch (steamField) {
        case 'Merchant_ID':
          varValue = varData?.merchant?.merchantId || varData?.merchant?.vitalMerchantId || '';
          break;
        case 'Merchant_Name':
          varValue = varData?.merchant?.dbaName || '';
          break;
        case 'Merchant_Address':
          varValue = varData?.merchant?.address || '';
          break;
        case 'Merchant_City':
          varValue = varData?.merchant?.city || '';
          break;
        case 'Merchant_State':
          varValue = varData?.merchant?.state || '';
          break;
        case 'Merchant_City_Code':
          varValue = varData?.merchant?.zipcode || '';
          break;
        case 'Merchant_Phone_Number':
          varValue = varData?.merchant?.dbaPhone || '';
          break;
        case 'Merchant_Time_Zone':
          varValue = varData?.terminal?.timeZoneInd || '';
          break;
        case 'KeyManagement_RKL_Device_GroupName':
          varValue = steamFields?.[steamField] || '';
          break;
        case 'TSYS_Merchant_ID':
          varValue = varData?.merchant?.vitalMerchantId || varData?.merchant?.merchantId || '';
          break;
        case 'TSYS_Acquirer_Bin':
          varValue = varData?.terminal?.acquirerId || varData?.terminal?.bin || '';
          break;
        case 'TSYS_Agent_Bank_Number':
          varValue = varData?.terminal?.agencyNumber || varData?.terminal?.agentNumber || '';
          break;
        case 'TSYS_Agent_Chain_Number':
          varValue = varData?.terminal?.chainNumber || '';
          break;
        case 'TSYS_Store_Number':
          varValue = varData?.terminal?.storeNumber || '';
          break;
        case 'TSYS_Terminal_Number':
          varValue = varData?.terminal?.terminalNumber || '';
          break;
        case 'TSYS_Category_Code':
          varValue = varData?.terminal?.sicCode || '';
          break;
        case 'TSYS_Terminal_ID':
          varValue = varData?.terminal?.terminalId || '';
          break;
        case 'TSYS_Authentication_Code':
          varValue = varData?.ur?.authenticationCode || steamFields?.[steamField] || '';
          break;
        case 'TSYS_Debit_Sharing_Group':
          varValue = varData?.ur?.sharingGroups || steamFields?.[steamField] || '';
          break;
        case 'TSYS_Merchant_ABA':
          varValue = varData?.ur?.aba || steamFields?.[steamField] || '';
          break;
        case 'TSYS_Settlement_Agent':
          varValue = varData?.ur?.settlement || steamFields?.[steamField] || '';
          break;
        case 'TSYS_Reimbursement_Attribute':
          varValue = varData?.ur?.reimbursementAttribute || steamFields?.[steamField] || '';
          break;
        default:
          varValue = '';
      }

      return {
        varField,
        varValue: varValue || '',
        steamField,
        steamValue: steamFields?.[steamField] || ''
      };
    });

    return (
      <div>
        <h3 style={{ marginBottom: '1rem', color: '#333', textAlign: 'center' }}>Field Mapping Comparison</h3>
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1rem',
          borderRadius: '4px',
          border: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <table style={{ borderCollapse: 'collapse', tableLayout: 'auto', margin: '0 auto' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #dee2e6', backgroundColor: '#e9ecef' }}>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#212529', fontWeight: 'bold' }}>VAR Field</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#212529', fontWeight: 'bold' }}>STEAM Field</th>
                <th style={{ padding: '0.75rem', textAlign: 'center', color: '#212529', fontWeight: 'bold' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {mapping.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ padding: '1rem', textAlign: 'center', color: '#6c757d' }}>
                    No mapped fields found
                  </td>
                </tr>
              ) : (
                mapping.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #dee2e6' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold', color: '#495057', textAlign: 'center' }}>
                      {item.varField}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold', color: '#495057', textAlign: 'center' }}>
                      {item.steamField}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#212529', textAlign: 'center' }}>
                      {item.steamValue || <span style={{ color: '#6c757d', fontStyle: 'italic' }}>N/A</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
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
      boxSizing: 'border-box',
      margin: '0 auto'
    }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>Extracted Data Review</h2>
          {fileName && (
            <p style={{ margin: 0, color: '#6c757d' }}>File: {fileName}</p>
          )}
        </div>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ← Back
          </button>
        )}
      </div>

      {/* Validation Status */}
      {validation && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          borderRadius: '4px',
          backgroundColor: validation.isValid ? '#d4edda' : '#f8d7da',
          border: `1px solid ${validation.isValid ? '#c3e6cb' : '#f5c6cb'}`,
          color: validation.isValid ? '#155724' : '#721c24'
        }}>
          <strong>Validation Status:</strong> {validation.isValid ? '✓ Valid' : '✗ Errors Found'}
          {detectedType && (
            <div style={{ marginTop: '0.5rem' }}>
              <strong>Parsed for:</strong> {detectedType}
            </div>
          )}
          {validation.errors && validation.errors.length > 0 && (
            <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
              {validation.errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          )}
          {validation.warnings && validation.warnings.length > 0 && (
            <div style={{ marginTop: '0.5rem', color: '#856404' }}>
              <strong>Warnings:</strong>
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                {validation.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        borderBottom: '2px solid #dee2e6'
      }}>
        <button
          onClick={() => setActiveSection('mapped')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            backgroundColor: 'transparent',
            borderBottom: activeSection === 'mapped' ? '2px solid #007bff' : '2px solid transparent',
            color: activeSection === 'mapped' ? '#007bff' : '#666',
            cursor: 'pointer',
            fontWeight: activeSection === 'mapped' ? 'bold' : 'normal'
          }}
        >
          Formatted Data For STEAM
        </button>
        <button
          onClick={() => setActiveSection('comparison')}
          style={{
            padding: '0.75rem 1.5rem',
            border: 'none',
            backgroundColor: 'transparent',
            borderBottom: activeSection === 'comparison' ? '2px solid #007bff' : '2px solid transparent',
            color: activeSection === 'comparison' ? '#007bff' : '#666',
            cursor: 'pointer',
            fontWeight: activeSection === 'comparison' ? 'bold' : 'normal'
          }}
        >
          Field Mapping Comparison
        </button>
      </div>

      {/* Content */}
      <div style={{ marginBottom: '2rem' }}>
        {activeSection === 'mapped' && renderMappedFields()}
        {activeSection === 'comparison' && renderComparison()}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
        {onContinue && (
          <button
            onClick={onContinue}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Continue to Template Selection →
          </button>
        )}
      </div>
    </div>
  );
}

