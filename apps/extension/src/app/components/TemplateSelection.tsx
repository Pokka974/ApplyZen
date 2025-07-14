import React, { useState, useEffect } from 'react';
import { TemplatePreview } from '@./shared-types';

interface TemplateSelectionProps {
  onTemplateSelected: (templateId: string) => void;
  selectedTemplateId?: string;
  onClose: () => void;
}

const TemplateSelection: React.FC<TemplateSelectionProps> = ({
  onTemplateSelected,
  selectedTemplateId,
  onClose
}) => {
  const [templates, setTemplates] = useState<TemplatePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading templates from API...');
      
      const response = await fetch('http://localhost:3000/api/templates', {
        credentials: 'include'
      });
      
      console.log('Template API response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Template API error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch templates`);
      }
      
      const data = await response.json();
      console.log('Template API response data:', data);
      
      const templates = data.templates || [];
      console.log('Parsed templates:', templates);
      
      setTemplates(templates);
    } catch (err) {
      console.error('Error loading templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string, isPremium: boolean) => {
    console.log('Template selected:', templateId, 'isPremium:', isPremium);
    
    if (isPremium) {
      // Show upgrade modal for premium templates
      alert('Ce template nécessite un abonnement Premium. Passez au plan Premium pour l\'utiliser.');
      return;
    }
    
    console.log('Calling onTemplateSelected with:', templateId);
    onTemplateSelected(templateId);
    
    // Store selection in localStorage
    localStorage.setItem('selectedTemplateId', templateId);
    console.log('Template stored in localStorage:', templateId);
  };

  const openPreview = (templateId: string) => {
    const previewUrl = `http://localhost:3000/api/templates/${templateId}/preview`;
    window.open(previewUrl, '_blank', 'width=800,height=600');
  };

  if (loading) {
    return (
      <div className="template-selection-overlay">
        <div className="template-selection-modal">
          <div className="template-selection-header">
            <h3>Choisir un template</h3>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="loading-templates">
            <div className="spinner"></div>
            <p>Chargement des templates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="template-selection-overlay">
        <div className="template-selection-modal">
          <div className="template-selection-header">
            <h3>Choisir un template</h3>
            <button className="close-btn" onClick={onClose}>✕</button>
          </div>
          <div className="error-message">
            <p>Erreur: {error}</p>
            <button className="btn-secondary" onClick={loadTemplates}>
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="template-selection-overlay">
      <div className="template-selection-modal">
        <div className="template-selection-header">
          <h3>Choisir un template CV</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="template-grid">
          {templates.map((template) => (
            <div
              key={template.id}
              className={`template-card ${selectedTemplateId === template.id ? 'selected' : ''} ${template.isPremium ? 'premium' : ''}`}
            >
              <div className="template-preview">
                <div className="template-thumbnail">
                  <div className="template-preview-placeholder">
                    <span className="template-icon">📄</span>
                  </div>
                  {template.isPremium && (
                    <div className="premium-badge">
                      <span className="premium-icon">👑</span>
                      Premium
                    </div>
                  )}
                </div>
                
                <div className="template-info">
                  <h4 className="template-name">{template.name}</h4>
                  <p className="template-description">{template.description}</p>
                  
                  <div className="template-features">
                    {template.features.slice(0, 2).map((feature, index) => (
                      <span key={index} className="feature-tag">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="template-actions">
                  <button
                    className="btn-preview"
                    onClick={() => openPreview(template.id)}
                  >
                    Aperçu
                  </button>
                  <button
                    className={`btn-select ${template.isPremium ? 'btn-premium' : 'btn-primary'}`}
                    onClick={() => handleTemplateSelect(template.id, template.isPremium)}
                    disabled={template.isPremium}
                  >
                    {template.isPremium ? 'Premium' : 'Sélectionner'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="template-selection-footer">
          <p className="template-info-text">
            Sélectionnez un template pour personnaliser l'apparence de votre CV
          </p>
          <button className="btn-secondary" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelection;