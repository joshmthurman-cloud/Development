import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { varAPI } from '../services/api';

export default function BatchProcessor({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    setError('');
    setResults([]);

    try {
      const response = await varAPI.uploadBatch(acceptedFiles);
      setResults(response.data.results || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Batch upload failed');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true,
    disabled: uploading
  });

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <h2>Batch Process VAR Sheets</h2>
      <div
        {...getRootProps()}
        style={{
          border: '2px dashed',
          borderColor: isDragActive ? '#007bff' : '#ddd',
          borderRadius: '8px',
          padding: '3rem',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          backgroundColor: isDragActive ? '#f0f8ff' : '#fafafa',
          opacity: uploading ? 0.6 : 1,
          marginBottom: '2rem'
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div>
            <p>Processing {results.length} files...</p>
          </div>
        ) : isDragActive ? (
          <p>Drop PDF files here...</p>
        ) : (
          <div>
            <p>Drag and drop multiple PDF VAR sheets here, or click to select</p>
            <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Multiple PDF files accepted (up to 50)
            </p>
          </div>
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

      {results.length > 0 && (
        <div>
          <h3>Results</h3>
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ color: '#28a745', marginRight: '1rem' }}>
              Success: {successCount}
            </span>
            <span style={{ color: '#dc3545' }}>
              Failed: {failCount}
            </span>
          </div>
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
                <tr>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>File Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left' }}>Error</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1rem' }}>{result.fileName}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        backgroundColor: result.success ? '#d4edda' : '#f8d7da',
                        color: result.success ? '#155724' : '#721c24'
                      }}>
                        {result.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#dc3545' }}>
                      {result.error || '-'}
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
}


