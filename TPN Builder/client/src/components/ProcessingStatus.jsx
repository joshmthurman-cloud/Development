export default function ProcessingStatus({ processingData, onComplete }) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      textAlign: 'center'
    }}>
      <h2 style={{ color: '#212529', margin: '0 0 1rem 0' }}>TPN Creation Status</h2>
      <div style={{
        margin: '2rem 0',
        padding: '2rem',
        backgroundColor: '#d4edda',
        color: '#155724',
        borderRadius: '8px'
      }}>
        <h3 style={{ margin: 0, marginBottom: '1rem' }}>✓ Success!</h3>
        <p style={{ margin: 0, fontSize: '1.1rem' }}>
          TPN has been created successfully in STEAM.
        </p>
        {processingData?.tpn && (
          <p style={{ marginTop: '1rem', fontWeight: 'bold' }}>
            TPN: {processingData.tpn}
          </p>
        )}
        {processingData?.spinData && (
          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '4px',
            textAlign: 'left',
            display: 'inline-block'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#212529' }}>SPIn Configuration</h4>
            {processingData.spinData.authKey && (
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: '#495057' }}>Auth Key:</strong>
                <div style={{ 
                  marginTop: '0.25rem', 
                  padding: '0.5rem', 
                  backgroundColor: 'white', 
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  wordBreak: 'break-all'
                }}>
                  {processingData.spinData.authKey}
                </div>
              </div>
            )}
            {processingData.spinData.registerId && (
              <div style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: '#495057' }}>Register ID:</strong>
                <div style={{ 
                  marginTop: '0.25rem', 
                  padding: '0.5rem', 
                  backgroundColor: 'white', 
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem'
                }}>
                  {processingData.spinData.registerId}
                </div>
              </div>
            )}
            {processingData.spinData.tunelHost && (
              <div style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#6c757d' }}>
                <strong>Tunnel Host:</strong> {processingData.spinData.tunelHost}
              </div>
            )}
          </div>
        )}
      </div>
      <button
        onClick={onComplete}
        style={{
          padding: '0.75rem 2rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '1rem',
          cursor: 'pointer'
        }}
      >
        Process Another VAR Sheet
      </button>
    </div>
  );
}


