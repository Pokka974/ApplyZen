import React from 'react';
import { JobData } from '@./shared-types';

interface JobDetectedProps {
  jobData: JobData;
  onGenerateCV: () => void;
  onGenerateCoverLetter: () => void;
  onGenerateBoth: () => void;
  isLoading: boolean;
  checkUsageLimit?: (generationsNeeded: number) => boolean;
  remainingGenerations?: number;
  currentUser?: any;
  selectedTemplateId?: string;
  onTemplateSelection?: () => void;
}

const JobDetected: React.FC<JobDetectedProps> = ({
  jobData,
  onGenerateCV,
  onGenerateCoverLetter,
  onGenerateBoth,
  isLoading,
  checkUsageLimit = () => false,
  remainingGenerations = 0,
  currentUser,
  selectedTemplateId = 'classique',
  onTemplateSelection,
}) => {
  const getLimitInfo = () => {
    const limits = { FREE: 5, PREMIUM: 50, ENTERPRISE: 1000 };
    const userLimit = limits[currentUser?.plan] || 5;
    const usageCount = currentUser?.usageCount || 0;
    return { usageCount, userLimit };
  };

  const { usageCount, userLimit } = getLimitInfo();
  
  // Check if each button should be disabled
  const isCVLimitReached = checkUsageLimit(1);
  const isCoverLetterLimitReached = checkUsageLimit(1);
  const isBothLimitReached = checkUsageLimit(2);
  
  const isCVDisabled = isLoading || isCVLimitReached;
  const isCoverLetterDisabled = isLoading || isCoverLetterLimitReached;
  const isBothDisabled = isLoading || isBothLimitReached;
  return (
    <>
      <div className="job-info">
        <div className="job-card">
          <h3>{jobData.title || 'Titre non disponible'}</h3>
          <p>{jobData.company || 'Entreprise non disponible'}</p>
          <span className="location">
            {jobData.location || 'Lieu non disponible'}
          </span>
        </div>
      </div>
      

      {/* Template selection */}
      {onTemplateSelection && (
        <div className="template-selection-info">
          <div className="template-current">
            <span className="template-label">Template sélectionné:</span>
            <span className="template-name">{selectedTemplateId || 'Classique'}</span>
          </div>
          <button 
            className="btn-secondary template-select-btn"
            onClick={onTemplateSelection}
          >
            Changer le template
          </button>
        </div>
      )}
      
      <div className="actions">
        <div className="generation-buttons">
          <button
            className={isCVDisabled ? "btn-primary btn-locked" : "btn-primary"}
            onClick={onGenerateCV}
            disabled={isCVDisabled}
            title={
              isLoading ? "Génération en cours..." : 
              isCVLimitReached ? "Générations insuffisantes - Passez au plan Premium" : 
              "Consomme 1 génération"
            }
          >
            <span className="btn-icon">{isCVLimitReached ? '🔒' : '📄'}</span>
            {isCVLimitReached ? 'CV - Indisponible' : 'Générer un CV personnalisé'}
            <span className="generation-cost">+1</span>
          </button>

          <button
            className={isCoverLetterDisabled ? "btn-primary btn-locked" : "btn-primary"}
            onClick={onGenerateCoverLetter}
            disabled={isCoverLetterDisabled}
            title={
              isLoading ? "Génération en cours..." : 
              isCoverLetterLimitReached ? "Générations insuffisantes - Passez au plan Premium" : 
              "Consomme 1 génération"
            }
          >
            <span className="btn-icon">{isCoverLetterLimitReached ? '🔒' : '✉️'}</span>
            {isCoverLetterLimitReached ? 'Lettre - Indisponible' : 'Générer une lettre de motivation'}
            <span className="generation-cost">+1</span>
          </button>

          <button
            className={isBothDisabled ? "btn-primary-accent btn-locked" : "btn-primary-accent"}
            onClick={onGenerateBoth}
            disabled={isBothDisabled}
            title={
              isLoading ? "Génération en cours..." : 
              isBothLimitReached ? "Générations insuffisantes (besoin de 2) - Passez au plan Premium" : 
              "Consomme 2 générations"
            }
          >
            <span className="btn-icon">{isBothLimitReached ? '🔒' : '🎯'}</span>
            {isBothLimitReached ? 'CV + Lettre - Indisponible' : 'Générer CV + Lettre'}
            <span className="generation-cost">+2</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default JobDetected;
