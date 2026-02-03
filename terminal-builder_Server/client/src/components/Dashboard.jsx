import { useState } from 'react';
import BetaUpload from './BetaUpload';
import TemplateSelector from './TemplateSelector';
import FieldMapper from './FieldMapper';
import ProcessingStatus from './ProcessingStatus';
import ExtractedDataView from './ExtractedDataView';
import GetTpnParameters from './GetTpnParameters';
import UserManagement from './UserManagement';
import { authAPI, varAPI } from '../services/api';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('beta-upload');
  const [processingData, setProcessingData] = useState(null);
  const [history, setHistory] = useState([]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      onLogout();
    } catch (error) {
      console.error('Logout error:', error);
      onLogout();
    }
  };

  const loadHistory = async () => {
    try {
      const response = await varAPI.getHistory();
      setHistory(response.data.history);
    } catch (error) {
      console.error('Load history error:', error);
    }
  };

  const handleUploadComplete = (data) => {
    console.log('[Dashboard] Upload complete, received data:', data);
    console.log('[Dashboard] steamFields:', data.steamFields);
    setProcessingData(data);
    setActiveTab('extracted'); // Show extracted data first
    loadHistory();
  };

  const handleTemplateSelected = (template) => {
    setProcessingData(prev => ({ ...prev, template }));
    setActiveTab('fields');
  };

  const handleFieldsReady = (spinData) => {
    // Store SPIn data in processingData
    if (spinData) {
      setProcessingData(prev => ({ ...prev, spinData }));
    }
    setActiveTab('status');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', width: '100%', margin: 0, padding: 0 }}>
      {/* Header with Logo and Title */}
      <header style={{
        backgroundColor: '#ffffff',
        padding: '1.5rem 2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          width: '100%',
          justifyContent: 'space-between',
          maxWidth: '1400px',
          position: 'relative'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            flexShrink: 0,
            zIndex: 2,
            position: 'relative'
          }}>
            <img 
              src="/curbstone-logo.png" 
              alt="Curbstone Logo" 
              style={{
                height: '60px',
                width: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>
          <h1 style={{ 
            margin: 0, 
            fontSize: 'clamp(1.5rem, 4vw, 3rem)',
            fontWeight: '700',
            color: '#1f2937',
            letterSpacing: '-0.025em',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            zIndex: 1,
            pointerEvents: 'none',
            maxWidth: 'calc(100% - 400px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            Terminal Builder
          </h1>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1rem',
            flexShrink: 0,
            zIndex: 2,
            position: 'relative'
          }}>
            <span style={{
              color: '#6b7280',
              fontSize: '0.9375rem',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}>
              Welcome, {user.username}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.9375rem',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#dc2626';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#ef4444';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Centered Navigation */}
        <nav style={{
          width: '100%',
          maxWidth: '1400px',
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setActiveTab('beta-upload')}
            style={{
              padding: '0.875rem 1.75rem',
              border: 'none',
              backgroundColor: activeTab === 'beta-upload' ? '#f3f4f6' : '#e5e7eb',
              cursor: 'pointer',
              borderBottom: activeTab === 'beta-upload' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'beta-upload' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'beta-upload' ? '600' : '500',
              fontSize: '0.9375rem',
              transition: 'all 0.2s ease',
              borderRadius: '0.5rem 0.5rem 0 0',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'beta-upload') {
                e.target.style.color = '#3b82f6';
                e.target.style.backgroundColor = '#d1d5db';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'beta-upload') {
                e.target.style.color = '#6b7280';
                e.target.style.backgroundColor = '#e5e7eb';
              }
            }}
          >
            Upload VAR
          </button>
          <button
            onClick={() => setActiveTab('get-parameters')}
            style={{
              padding: '0.875rem 1.75rem',
              border: 'none',
              backgroundColor: activeTab === 'get-parameters' ? '#f3f4f6' : '#e5e7eb',
              cursor: 'pointer',
              borderBottom: activeTab === 'get-parameters' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'get-parameters' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'get-parameters' ? '600' : '500',
              fontSize: '0.9375rem',
              transition: 'all 0.2s ease',
              borderRadius: '0.5rem 0.5rem 0 0'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'get-parameters') {
                e.target.style.color = '#3b82f6';
                e.target.style.backgroundColor = '#d1d5db';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'get-parameters') {
                e.target.style.color = '#6b7280';
                e.target.style.backgroundColor = '#e5e7eb';
              }
            }}
          >
            Get TPN Parameters
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              loadHistory();
            }}
            style={{
              padding: '0.875rem 1.75rem',
              border: 'none',
              backgroundColor: activeTab === 'history' ? '#f3f4f6' : '#e5e7eb',
              cursor: 'pointer',
              borderBottom: activeTab === 'history' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'history' ? '#3b82f6' : '#6b7280',
              fontWeight: activeTab === 'history' ? '600' : '500',
              fontSize: '0.9375rem',
              transition: 'all 0.2s ease',
              borderRadius: '0.5rem 0.5rem 0 0'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== 'history') {
                e.target.style.color = '#3b82f6';
                e.target.style.backgroundColor = '#d1d5db';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'history') {
                e.target.style.color = '#6b7280';
                e.target.style.backgroundColor = '#e5e7eb';
              }
            }}
          >
            History
          </button>
          {user.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              style={{
                padding: '0.875rem 1.75rem',
                border: 'none',
                backgroundColor: activeTab === 'users' ? '#f3f4f6' : '#e5e7eb',
                cursor: 'pointer',
                borderBottom: activeTab === 'users' ? '3px solid #3b82f6' : '3px solid transparent',
                color: activeTab === 'users' ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === 'users' ? '600' : '500',
                fontSize: '0.9375rem',
                transition: 'all 0.2s ease',
                borderRadius: '0.5rem 0.5rem 0 0'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'users') {
                  e.target.style.color = '#3b82f6';
                  e.target.style.backgroundColor = '#d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'users') {
                  e.target.style.color = '#6b7280';
                  e.target.style.backgroundColor = '#e5e7eb';
                }
              }}
            >
              User Management
            </button>
          )}
        </nav>
      </header>

      <main style={{ 
        padding: '2rem', 
        width: '100%', 
        maxWidth: '1400px',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>
        {activeTab === 'beta-upload' && (
          <BetaUpload onUploadComplete={handleUploadComplete} />
        )}
        {activeTab === 'extracted' && processingData && (
          <ExtractedDataView
            varData={processingData.varData}
            steamFields={processingData.steamFields}
            fileName={processingData.fileName}
            validation={processingData.validation}
            detectedType={processingData.detectedType || processingData.varData?.format}
            onContinue={() => setActiveTab('template')}
            onBack={() => {
              setProcessingData(null);
              setActiveTab('beta-upload');
            }}
          />
        )}
        {activeTab === 'template' && processingData && (
          <TemplateSelector
            onSelect={handleTemplateSelected}
            initialData={processingData}
          />
        )}
        {activeTab === 'fields' && processingData && (
          <FieldMapper
            varData={processingData.varData}
            steamFields={processingData.steamFields || {}}
            historyId={processingData.historyId}
            template={processingData.template}
            detectedType={processingData.detectedType || processingData.varData?.format}
            onReady={handleFieldsReady}
          />
        )}
        {activeTab === 'status' && processingData && (
          <ProcessingStatus
            processingData={processingData}
            onComplete={() => {
              setProcessingData(null);
              setActiveTab('beta-upload');
              loadHistory();
            }}
          />
        )}
        {activeTab === 'get-parameters' && (
          <GetTpnParameters />
        )}
        {activeTab === 'users' && user.role === 'admin' && (
          <UserManagement user={user} />
        )}
        {activeTab === 'history' && (
          <div>
            <h2 style={{ 
              color: '#1f2937', 
              marginBottom: '1.5rem',
              fontSize: '1.5rem',
              fontWeight: '600'
            }}>
              Processing History
            </h2>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              overflow: 'hidden',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
              border: '1px solid #e5e7eb'
            }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ 
                    borderBottom: '2px solid #e5e7eb', 
                    backgroundColor: '#f9fafb' 
                  }}>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      color: '#374151', 
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      File Name
                    </th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      color: '#374151', 
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      TPN
                    </th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      color: '#374151', 
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Status
                    </th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      color: '#374151', 
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ 
                        padding: '3rem', 
                        textAlign: 'center', 
                        color: '#9ca3af',
                        fontSize: '0.9375rem'
                      }}>
                        No history found
                      </td>
                    </tr>
                  ) : (
                    history.map((item, index) => (
                      <tr 
                        key={item.id} 
                        style={{ 
                          borderBottom: index < history.length - 1 ? '1px solid #f3f4f6' : 'none',
                          transition: 'background-color 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ 
                          padding: '1rem', 
                          color: '#1f2937',
                          fontSize: '0.9375rem'
                        }}>
                          {item.file_name}
                        </td>
                        <td style={{ 
                          padding: '1rem', 
                          color: '#1f2937',
                          fontSize: '0.9375rem',
                          fontFamily: 'monospace'
                        }}>
                          {item.tpn || '-'}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.375rem 0.75rem',
                            borderRadius: '0.5rem',
                            backgroundColor: item.status === 'completed' ? '#d1fae5' : 
                                            item.status === 'failed' ? '#fee2e2' : 
                                            item.status === 'tpn_created' ? '#dbeafe' : '#fef3c7',
                            color: item.status === 'completed' ? '#065f46' : 
                                   item.status === 'failed' ? '#991b1b' : 
                                   item.status === 'tpn_created' ? '#1e40af' : '#92400e',
                            fontWeight: '500',
                            fontSize: '0.875rem',
                            display: 'inline-block'
                          }}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ 
                          padding: '1rem', 
                          color: '#1f2937',
                          fontSize: '0.9375rem'
                        }}>
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


