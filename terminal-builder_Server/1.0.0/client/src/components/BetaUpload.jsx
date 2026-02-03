import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { varAPI } from '../services/api';

export default function BetaUpload({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [detectedType, setDetectedType] = useState(null);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploading(true);
    setError('');
    setDetectedType(null);

    try {
      // Pass 'auto' to let the backend detect the VAR type
      const response = await varAPI.upload(file, 'auto');
      console.log('[BetaUpload] Upload response:', response.data);
      if (response.data.success) {
        // Show detected type - use varData.format if detectedType not available
        const typeToShow = response.data.detectedType || response.data.varData?.format || 'Unknown';
        setDetectedType(typeToShow);
        console.log('[BetaUpload] Showing detected type:', typeToShow);
        
        // Log the data to help debug
        console.log('[BetaUpload] varData:', response.data.varData);
        console.log('[BetaUpload] varData format:', response.data.varData?.format);
        console.log('[BetaUpload] steamFields:', response.data.steamFields);
        console.log('[BetaUpload] steamFields count:', Object.keys(response.data.steamFields || {}).length);
        
        onUploadComplete(response.data);
      } else {
        setError(response.data.error || 'Upload failed');
      }
    } catch (err) {
      console.error('[BetaUpload] Upload error:', err);
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
      <h2 style={{ color: '#1f2937', marginBottom: '1.5rem' }}>Upload VAR Sheet</h2>
      
      <div style={{ 
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '0.5rem',
        color: '#1e40af'
      }}>
        <strong>Auto-Detection Enabled:</strong> The system will automatically detect the VAR sheet type (TSYS, Propelr, or Heartland) when you upload.
      </div>

      {detectedType && (
        <div style={{ 
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: '#d1fae5',
          border: '1px solid #86efac',
          borderRadius: '0.5rem',
          color: '#065f46'
        }}>
          <strong>Detected VAR Type:</strong> {detectedType}
        </div>
      )}

      <div
        {...getRootProps()}
        style={{
          border: '2px dashed',
          borderColor: isDragActive ? '#3b82f6' : '#d1d5db',
          borderRadius: '0.5rem',
          padding: '3rem',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          backgroundColor: isDragActive ? '#eff6ff' : '#f9fafb',
          opacity: uploading ? 0.6 : 1,
          transition: 'all 0.2s ease'
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div>
            <p style={{ color: '#1f2937', fontSize: '1rem' }}>Uploading and detecting VAR type...</p>
          </div>
        ) : isDragActive ? (
          <p style={{ color: '#3b82f6', fontSize: '1rem', fontWeight: '500' }}>Drop the PDF file here...</p>
        ) : (
          <div>
            <p style={{ color: '#1f2937', fontSize: '1rem', marginBottom: '0.5rem' }}>
              Drag and drop a PDF VAR sheet here, or click to select
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Only PDF files are accepted. VAR type will be auto-detected.
            </p>
          </div>
        )}
      </div>
      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '0.5rem',
          border: '1px solid #fecaca'
        }}>
          {error}
        </div>
      )}
    </div>
  );
}

