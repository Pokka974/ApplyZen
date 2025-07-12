import React from 'react';
import { JobData, GeneratedDocument } from '@./shared-types';

interface DownloadOptionsProps {
  documents: {
    cv?: GeneratedDocument;
    coverLetter?: GeneratedDocument;
  };
  jobData: JobData;
}

const DownloadOptions: React.FC<DownloadOptionsProps> = ({ documents, jobData }) => {
  const baseFileName = `${jobData.company}_${jobData.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}`;

  const downloadAsMarkdown = (content: string, fileName: string) => {
    try {
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName}.md`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading markdown:', error);
      alert('Erreur lors du téléchargement du fichier Markdown');
    }
  };

  const downloadAsWord = async (content: string, fileName: string) => {
    // For now, fallback to markdown until we implement DOCX generation
    downloadAsMarkdown(content, fileName);
  };

  const createDownloadButton = (document: GeneratedDocument, type: string) => {
    const fileName = `${baseFileName}_${type}`;
    
    return (
      <div key={type} className="download-btn">
        <div className="download-btn-info">
          <span>{type === 'cv' ? '📄 CV Personnalisé' : '✉️ Lettre de Motivation'}</span>
          <span className="download-btn-size">{document.wordCount} mots</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className="download-md-btn"
            onClick={() => downloadAsMarkdown(document.content, fileName)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              border: '1px solid #ddd',
              background: 'white',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            .md
          </button>
          <button 
            className="download-docx-btn"
            onClick={() => downloadAsWord(document.content, fileName)}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            .docx
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="download-options">
      <h3>Documents générés</h3>
      <div className="download-buttons">
        {documents.cv && createDownloadButton(documents.cv, 'cv')}
        {documents.coverLetter && createDownloadButton(documents.coverLetter, 'cover-letter')}
      </div>
    </div>
  );
};

export default DownloadOptions;