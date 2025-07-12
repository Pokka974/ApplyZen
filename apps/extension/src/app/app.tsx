import React, { useState, useEffect } from 'react';
import { JobData, UserProfile, ChromeMessage, ScrapeJobResponse } from '@./shared-types';
import JobDetected from './components/JobDetected';
import NoJob from './components/NoJob';
import ProfileSetup from './components/ProfileSetup';
import LoadingSpinner from './components/LoadingSpinner';
import DownloadOptions from './components/DownloadOptions';
import './app.module.css';

interface AppState {
  currentJobData: JobData | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  status: string;
  showProfileSetup: boolean;
  generatedDocuments: any;
}

export function App() {
  const [state, setState] = useState<AppState>({
    currentJobData: null,
    userProfile: null,
    isLoading: false,
    status: 'Prêt',
    showProfileSetup: false,
    generatedDocuments: null,
  });

  // Check if we're on a job page when popup opens
  useEffect(() => {
    checkJobPage();
    loadUserProfile();
  }, []);

  const checkJobPage = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        const isJobPage = url.includes('/jobs/view/') || 
                         (url.includes('/jobs/') && url.includes('currentJobId='));
        
        if (isJobPage) {
          scrapeJobData();
        } else {
          setState(prev => ({ ...prev, status: 'En attente d\'une offre d\'emploi' }));
        }
      }
    });
  };

  const scrapeJobData = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const message: ChromeMessage = { action: 'scrapeJob' };
        
        chrome.tabs.sendMessage(tabs[0].id!, message, (response: ScrapeJobResponse) => {
          if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            setState(prev => ({ ...prev, status: 'Erreur de communication' }));
            return;
          }
          
          if (response && response.success && response.data) {
            setState(prev => ({
              ...prev,
              currentJobData: response.data!,
              status: 'Offre détectée - Prêt à générer'
            }));
          } else {
            console.error('Scraping failed:', response?.error || 'Unknown error');
            setState(prev => ({ ...prev, status: 'Échec de l\'extraction des données' }));
          }
        });
      }
    });
  };

  const loadUserProfile = async () => {
    try {
      const result = await chrome.storage.sync.get(['userProfile']);
      if (result.userProfile) {
        setState(prev => ({ ...prev, userProfile: result.userProfile }));
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleGenerateDocument = async (type: 'cv' | 'cover-letter' | 'both') => {
    if (!state.currentJobData) {
      alert('Aucune offre détectée. Naviguez vers une offre LinkedIn.');
      return;
    }

    if (!state.userProfile) {
      setState(prev => ({ ...prev, showProfileSetup: true }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      status: `Génération ${type === 'both' ? 'des documents' : type === 'cv' ? 'du CV' : 'de la lettre'} en cours...`
    }));

    try {
      // TODO: Call backend API instead of direct OpenAI
      const response = await fetch('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobData: state.currentJobData,
          profile: state.userProfile,
          type,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const documents = await response.json();
      
      console.log('API Response:', documents);
      console.log('Documents data:', documents.data);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        status: 'Documents générés avec succès!',
        generatedDocuments: documents.data || documents,
      }));
      
    } catch (error) {
      console.error('Error generating documents:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        status: 'Erreur lors de la génération',
      }));
      
      const errorMsg = error instanceof Error && error.message.includes('API Error: 401') 
        ? 'Erreur d\'authentification API. Vérifiez votre configuration.'
        : error instanceof Error && error.message.includes('API Error: 429')
        ? 'Limite de taux API atteinte. Attendez un moment et réessayez.'
        : `Erreur lors de la génération: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
        
      alert(errorMsg);
    }
  };

  const openProfileManager = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('profile.html') });
  };

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">📄</span>
          <h1>ApplyZen</h1>
        </div>
      </header>

      <main className="main">
        {state.currentJobData ? (
          <JobDetected 
            jobData={state.currentJobData}
            onGenerateCV={() => handleGenerateDocument('cv')}
            onGenerateCoverLetter={() => handleGenerateDocument('cover-letter')}
            onGenerateBoth={() => handleGenerateDocument('both')}
            isLoading={state.isLoading}
          />
        ) : (
          <NoJob />
        )}

        {state.isLoading && (
          <LoadingSpinner message={state.status} />
        )}

        {state.generatedDocuments && (
          <DownloadOptions 
            documents={state.generatedDocuments}
            jobData={state.currentJobData!}
          />
        )}

        {state.showProfileSetup && (
          <ProfileSetup 
            onSetupProfile={openProfileManager}
            onSaveProfile={(profile) => {
              setState(prev => ({ 
                ...prev, 
                userProfile: profile,
                showProfileSetup: false 
              }));
            }}
          />
        )}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <div className="status">{state.status}</div>
          <button 
            className="footer-btn" 
            onClick={openProfileManager}
            title="Gérer le profil"
          >
            <span>⚙️</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;