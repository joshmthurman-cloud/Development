import { useState, useEffect } from 'react';
import { locationsAPI } from '../services/api';

export default function LocationSelector({ onSelect, selectedLocationId }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await locationsAPI.getLocations();
      setLocations(response.data.locations || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  };

  const filteredLocations = locations.filter(location => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const locationId = location.Location_ID || location.LocationId || location.Id || location.id || '';
    const locationName = location.Location_Name || location.Name || location.name || '';
    return (
      locationName.toLowerCase().includes(search) ||
      locationId.toString().includes(search)
    );
  });

  const handleSelect = (location) => {
    onSelect(location);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: '#212529' }}>Loading locations...</p>
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
      <h3 style={{ color: '#212529', marginBottom: '1rem' }}>Select Location</h3>
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search locations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '1rem'
          }}
        />
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
      <div style={{
        maxHeight: '300px',
        overflowY: 'auto',
        border: '1px solid #ddd',
        borderRadius: '4px'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
            <tr>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: '#212529', fontWeight: 'bold' }}>Location ID</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: '#212529', fontWeight: 'bold' }}>Location Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', color: '#212529', fontWeight: 'bold' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLocations.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#6c757d' }}>
                  {searchTerm ? 'No locations found' : 'No locations available'}
                </td>
              </tr>
            ) : (
              filteredLocations.map((location, index) => {
                const locationId = location.Location_ID || location.LocationId || location.Id || location.id;
                const locationName = location.Location_Name || location.Name || location.name || '-';
                const isSelected = selectedLocationId === locationId;
                
                return (
                  <tr
                    key={locationId || index}
                    style={{
                      borderBottom: '1px solid #eee',
                      backgroundColor: isSelected ? '#e7f3ff' : 'white'
                    }}
                  >
                    <td style={{ padding: '0.75rem', color: '#212529' }}>{locationId || '-'}</td>
                    <td style={{ padding: '0.75rem', color: '#212529' }}>{locationName}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        onClick={() => handleSelect(location)}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: isSelected ? '#28a745' : '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


