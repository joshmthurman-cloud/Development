import { useState, useEffect } from 'react';
import { merchantsLocationsAPI } from '../services/api';

export default function MerchantLocationSelector({ tpn, varType, onSelect, selectedLocationId }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedMerchants, setExpandedMerchants] = useState(new Set());

  useEffect(() => {
    // For UR, can load without TPN. For others, need TPN.
    if (varType === 'UR' || tpn) {
      loadMerchantsLocations();
    }
  }, [tpn, varType]);

  const loadMerchantsLocations = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await merchantsLocationsAPI.getMerchantsLocations(tpn, varType);
      setMerchants(response.data.merchants || []);
      
      // Auto-expand merchants that have the selected location
      if (selectedLocationId) {
        const merchantWithSelectedLocation = (response.data.merchants || []).find(m => 
          m.locations.some(loc => loc.Id === selectedLocationId || loc.id === selectedLocationId)
        );
        if (merchantWithSelectedLocation) {
          setExpandedMerchants(new Set([merchantWithSelectedLocation.Id || merchantWithSelectedLocation.id]));
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load merchants and locations');
    } finally {
      setLoading(false);
    }
  };

  const toggleMerchant = (merchantId) => {
    const newExpanded = new Set(expandedMerchants);
    if (newExpanded.has(merchantId)) {
      newExpanded.delete(merchantId);
    } else {
      newExpanded.add(merchantId);
    }
    setExpandedMerchants(newExpanded);
  };

  const filteredMerchants = merchants;

  const handleSelectLocation = (location) => {
    onSelect(location);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: '#212529' }}>Loading merchants and locations...</p>
      </div>
    );
  }

  // For UR, TPN is not required. For others, show message if no TPN.
  if (!tpn && varType !== 'UR') {
    return (
      <div style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', color: '#856404' }}>
        Please create a TPN first to load merchants and locations.
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      marginBottom: '1rem'
    }}>
      <h3 style={{ color: '#212529', marginBottom: '1rem' }}>Select Merchant & Location</h3>
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
        maxHeight: '400px',
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}>
          {filteredMerchants.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
              No merchants available
            </div>
        ) : (
          <div style={{ padding: '0.5rem' }}>
            {filteredMerchants.map((merchant) => {
              const merchantId = merchant.Id || merchant.id;
              const merchantName = merchant.Name || merchant.name || 'Unknown Merchant';
              const merchantLocations = merchant.locations || [];
              const isExpanded = expandedMerchants.has(merchantId);
              
              return (
                <div key={merchantId} style={{ marginBottom: '0.5rem' }}>
                  <div
                    onClick={() => toggleMerchant(merchantId)}
                    style={{
                      padding: '0.75rem',
                      backgroundColor: isExpanded ? '#e7f3ff' : '#f8f9fa',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontWeight: 'bold',
                      color: '#212529'
                    }}
                  >
                    <span>{merchantName}</span>
                    <span style={{ fontSize: '0.875rem', color: '#6c757d' }}>
                      {merchantLocations.length} location{merchantLocations.length !== 1 ? 's' : ''}
                      {isExpanded ? ' ▼' : ' ▶'}
                    </span>
                  </div>
                  
                  {isExpanded && merchantLocations.length > 0 && (
                    <div style={{
                      marginLeft: '1rem',
                      marginTop: '0.25rem',
                      borderLeft: '2px solid #ddd',
                      paddingLeft: '0.75rem'
                    }}>
                      {merchantLocations.map((location) => {
                        const locationId = location.Id || location.id;
                        const locationName = location.Name || location.name || 'Unknown Location';
                        const isSelected = selectedLocationId === locationId;
                        const isMainLocation = location.IsMainLocation;
                        
                        return (
                          <div
                            key={locationId}
                            style={{
                              padding: '0.5rem',
                              marginBottom: '0.25rem',
                              backgroundColor: isSelected ? '#28a745' : 'white',
                              border: isSelected ? '2px solid #1e7e34' : '1px solid #e9ecef',
                              borderRadius: '4px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer'
                            }}
                            onClick={() => handleSelectLocation(location)}
                          >
                            <div>
                              <span style={{ fontWeight: isMainLocation ? 'bold' : 'normal', color: isSelected ? 'white' : '#212529' }}>
                                {locationName}
                              </span>
                              {isMainLocation && (
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: isSelected ? 'rgba(255,255,255,0.9)' : '#6c757d' }}>
                                  (Main)
                                </span>
                              )}
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: isSelected ? 'rgba(255,255,255,0.9)' : '#6c757d' }}>
                                ID: {locationId}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectLocation(location);
                              }}
                              style={{
                                padding: '0.25rem 0.75rem',
                                backgroundColor: isSelected ? '#1e7e34' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                              }}
                            >
                              {isSelected ? 'Selected' : 'Select'}
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
    </div>
  );
}

