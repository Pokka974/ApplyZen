import React from 'react';
import { JobData } from '@./shared-types';

interface JobDetectedProps {
  jobData: JobData;
  onGenerateCV: () => void;
  onGenerateCoverLetter: () => void;
  onGenerateBoth: () => void;
  isLoading: boolean;
}

const JobDetected: React.FC<JobDetectedProps> = ({
  jobData,
  onGenerateCV,
  onGenerateCoverLetter,
  onGenerateBoth,
  isLoading,
}) => {
  return (
    <div className="job-info">
      <div className="job-card">
        <h3>{jobData.title || 'Titre non disponible'}</h3>
        <p>{jobData.company || 'Entreprise non disponible'}</p>
        <span className="location">{jobData.location || 'Lieu non disponible'}</span>
      </div>
      
      <div className="actions">
        <div className="generation-buttons">
          <button 
            className="btn-primary"
            onClick={onGenerateCV}
            disabled={isLoading}
          >
            <span className="btn-icon">📄</span>
            Générer un CV personnalisé
          </button>
          
          <button 
            className="btn-primary"
            onClick={onGenerateCoverLetter}
            disabled={isLoading}
          >
            <span className="btn-icon">✉️</span>
            Générer une lettre de motivation
          </button>
          
          <button 
            className="btn-primary-accent"
            onClick={onGenerateBoth}
            disabled={isLoading}
          >
            <span className="btn-icon">🎯</span>
            Générer CV + Lettre
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobDetected;