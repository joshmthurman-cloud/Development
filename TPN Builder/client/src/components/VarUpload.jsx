import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { varAPI } from '../services/api';

export default function VarUpload({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [varType, setVarType] = useState('TSYS'); // 'TSYS', 'Propelr', or 'Heartland'

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError('');

    try {
      const response = await varAPI.upload(file, varType);
      if (response.data.success) {
        onUploadComplete(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: uploading
  });

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '0.75rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
      border: '1px solid #e5e7eb'
    }}>
      <h2 style={{ color: '#212529', marginBottom: '1.5rem' }}>Upload VAR Sheet</h2>
      
      {/* VAR Type Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#212529', fontWeight: 'bold' }}>
          VAR Sheet Type
        </label>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="varType"
              value="TSYS"
              checked={varType === 'TSYS'}
              onChange={(e) => setVarType(e.target.value)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: '#212529' }}>TSYS</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="varType"
              value="Propelr"
              checked={varType === 'Propelr'}
              onChange={(e) => setVarType(e.target.value)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: '#212529' }}>Propelr</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="varType"
              value="Heartland"
              checked={varType === 'Heartland'}
              onChange={(e) => setVarType(e.target.value)}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ color: '#212529' }}>Heartland</span>
          </label>
        </div>
      </div>

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
          opacity: uploading ? 0.6 : 1
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div>
            <p>Uploading and processing...</p>
          </div>
        ) : isDragActive ? (
          <p>Drop the PDF file here...</p>
        ) : (
          <div>
            <p>Drag and drop a PDF VAR sheet here, or click to select</p>
            <p style={{ color: '#666', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Only PDF files are accepted
            </p>
          </div>
        )}
      </div>
      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}


