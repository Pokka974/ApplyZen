import React, { useState, useEffect } from 'react';
import { JobData, UserProfile, ChromeMessage, ScrapeJobResponse } from '@./shared-types';
import JobDetected from './components/JobDetected';
import NoJob from './components/NoJob';
import ProfileSetup from './components/ProfileSetup';
import LoadingSpinner from './components/LoadingSpinner';
import DownloadOptions from './components/DownloadOptions';
import { AuthModal } from './components/AuthModal';
import { UserProfile as UserProfileComponent } from './components/UserProfile';
import TemplateSelection from './components/TemplateSelection';
import { authService, User } from '../services/authService';
import './app.css';

interface AppState {
  currentJobData: JobData | null;
  userProfile: UserProfile | null;
  currentUser: User | null;
  isLoading: boolean;
  status: string;
  showProfileSetup: boolean;
  showAuthModal: boolean;
  showHistory: boolean;
  showTemplateSelection: boolean;
  selectedTemplateId: string | null;
  generatedDocuments: any;
}

export function App() {
  const [state, setState] = useState<AppState>({
    currentJobData: null,
    userProfile: null,
    currentUser: null,
    isLoading: false,
    status: 'Prêt',
    showProfileSetup: false,
    showAuthModal: false,
    showHistory: false,
    showTemplateSelection: false,
    selectedTemplateId: localStorage.getItem('selectedTemplateId') || 'classique',
    generatedDocuments: null,
  });

  // Check if we're on a job page when popup opens
  useEffect(() => {
    checkJobPage();
    loadUserProfile();
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const isAuthenticated = await authService.checkAuth();
    const user = authService.getCurrentUser();
    
    setState(prev => ({ 
      ...prev, 
      currentUser: user,
      showAuthModal: !isAuthenticated
    }));
  };

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
      if (tabs[0] && tabs[0].id) {
        const message: ChromeMessage = { action: 'scrapeJob' };
        
        // First, inject the content script if needed
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content/scraper.js']
        }).then(() => {
          // Now send the message
          chrome.tabs.sendMessage(tabs[0].id!, message, (response: ScrapeJobResponse) => {
            if (chrome.runtime.lastError) {
              console.error('Error sending message:', chrome.runtime.lastError);
              setState(prev => ({ 
                ...prev, 
                status: 'Contenu non accessible - Actualisez la page'
              }));
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
              setState(prev => ({ 
                ...prev, 
                status: 'Échec de l\'extraction - Réessayez'
              }));
            }
          });
        }).catch((error) => {
          console.error('Error injecting content script:', error);
          setState(prev => ({ 
            ...prev, 
            status: 'Erreur d\'injection du script - Actualisez'
          }));
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

  const checkUsageLimit = (generationsNeeded = 1) => {
    if (!state.currentUser) return false;
    
    const limits = {
      FREE: 5,
      PREMIUM: 50,
      ENTERPRISE: 1000
    };
    
    const userLimit = limits[state.currentUser.plan] || 5;
    const remainingGenerations = userLimit - state.currentUser.usageCount;
    return remainingGenerations < generationsNeeded;
  };

  const getRemainingGenerations = () => {
    if (!state.currentUser) return 0;
    
    const limits = {
      FREE: 5,
      PREMIUM: 50,
      ENTERPRISE: 1000
    };
    
    const userLimit = limits[state.currentUser.plan] || 5;
    return Math.max(0, userLimit - state.currentUser.usageCount);
  };

  const handleGenerateDocument = async (type: 'cv' | 'cover-letter' | 'both') => {
    if (!state.currentUser) {
      setState(prev => ({ ...prev, showAuthModal: true }));
      return;
    }

    // Check usage limit before attempting generation (both = 2 generations, others = 1)
    const generationsNeeded = type === 'both' ? 2 : 1;
    if (checkUsageLimit(generationsNeeded)) {
      showUpgradeModal(generationsNeeded);
      return;
    }

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
      const response = await fetch('http://localhost:3000/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for session authentication
        body: JSON.stringify({
          jobData: state.currentJobData,
          profile: state.userProfile,
          type,
          templateId: state.selectedTemplateId,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          // User needs to authenticate
          setState(prev => ({ ...prev, showAuthModal: true, isLoading: false }));
          return;
        }
        if (response.status === 429) {
          const errorData = await response.json();
          setState(prev => ({ ...prev, isLoading: false, status: 'Limite atteinte' }));
          showUpgradeModal();
          return;
        }
        throw new Error(`API Error: ${response.status}`);
      }

      const documents = await response.json();
      
      // Update user data after successful generation
      await authService.refreshUserData();
      const updatedUser = authService.getCurrentUser();
      
      setState(prev => ({
        ...prev,
        currentUser: updatedUser,
        isLoading: false,
        status: documents.message || 'Documents générés avec succès!',
        generatedDocuments: documents.data || documents,
      }));
      
    } catch (error) {
      console.error('Error generating documents:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        status: 'Erreur lors de la génération',
      }));
      
      const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Erreur lors de la génération: ${errorMsg}`);
    }
  };

  const openProfileManager = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('profile.html') });
  };

  const handleAuthSuccess = async () => {
    const user = authService.getCurrentUser();
    setState(prev => ({ 
      ...prev, 
      currentUser: user,
      showAuthModal: false
    }));
  };

  const handleTemplateSelection = (templateId: string) => {
    console.log('handleTemplateSelection called with:', templateId);
    setState(prev => ({ 
      ...prev, 
      selectedTemplateId: templateId,
      showTemplateSelection: false
    }));
    console.log('Template selection state updated to:', templateId);
  };

  const openTemplateSelection = () => {
    console.log('Opening template selection modal');
    setState(prev => ({ 
      ...prev, 
      showTemplateSelection: true
    }));
  };

  const closeTemplateSelection = () => {
    console.log('Closing template selection modal');
    setState(prev => ({ 
      ...prev, 
      showTemplateSelection: false
    }));
  };

  const handleLogout = async () => {
    await authService.logout();
    setState(prev => ({ 
      ...prev, 
      currentUser: null,
      showAuthModal: true,
      generatedDocuments: null
    }));
  };

  const handleOpenHistory = () => {
    setState(prev => ({ ...prev, showHistory: true }));
  };

  const showUpgradeModal = (generationsNeeded = 1) => {
    const limits = {
      FREE: 5,
      PREMIUM: 50,
      ENTERPRISE: 1000
    };
    
    const userLimit = limits[state.currentUser?.plan || 'FREE'];
    const usageCount = state.currentUser?.usageCount || 0;
    const remaining = userLimit - usageCount;
    
    const modal = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 400px;
          margin: 20px;
          text-align: center;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        ">
          <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
          <h2 style="color: #1f2937; margin-bottom: 12px; font-size: 24px;">Générations insuffisantes !</h2>
          <p style="color: #6b7280; margin-bottom: 20px; line-height: 1.5;">
            Cette action nécessite <strong>${generationsNeeded} génération${generationsNeeded > 1 ? 's' : ''}</strong> mais vous n'avez que <strong>${remaining}</strong> restante${remaining > 1 ? 's' : ''}.<br>
            Plan actuel: <strong>${state.currentUser?.plan}</strong> (${usageCount}/${userLimit} utilisées)
          </p>
          <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 24px;
          ">
            <h3 style="margin-bottom: 8px;">✨ Passez au Premium</h3>
            <p style="font-size: 14px; opacity: 0.9;">
              50 générations/mois<br>
              Formats avancés<br>
              Support prioritaire
            </p>
          </div>
          <div style="display: flex; gap: 12px;">
            <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" style="
              flex: 1;
              background: #f3f4f6;
              border: none;
              padding: 12px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">Plus tard</button>
            <button onclick="alert('Mise à niveau bientôt disponible !'); this.closest('div[style*=\"position: fixed\"]').remove()" style="
              flex: 1;
              background: #3b82f6;
              color: white;
              border: none;
              padding: 12px;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
            ">Upgrader 🚀</button>
          </div>
        </div>
      </div>
    `;
    
    const modalDiv = document.createElement('div');
    modalDiv.innerHTML = modal;
    document.body.appendChild(modalDiv);
  };

  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">📄</span>
          <h1>ApplyZen</h1>
        </div>
      </header>

      {state.currentUser && (
        <UserProfileComponent
          user={state.currentUser}
          onLogout={handleLogout}
          onOpenHistory={handleOpenHistory}
        />
      )}

      <main className="main">
        {!state.currentUser ? (
          <div className="auth-required">
            <span className="auth-icon">🔐</span>
            <h3>Bienvenue sur ApplyZen</h3>
            <p>Connectez-vous pour générer des CV et lettres de motivation personnalisés en un clic</p>
            <button 
              className="auth-btn"
              onClick={() => setState(prev => ({ ...prev, showAuthModal: true }))}
            >
              Se connecter
            </button>
          </div>
        ) : state.currentJobData ? (
          <JobDetected 
            jobData={state.currentJobData}
            onGenerateCV={() => handleGenerateDocument('cv')}
            onGenerateCoverLetter={() => handleGenerateDocument('cover-letter')}
            onGenerateBoth={() => handleGenerateDocument('both')}
            isLoading={state.isLoading}
            checkUsageLimit={checkUsageLimit}
            remainingGenerations={getRemainingGenerations()}
            currentUser={state.currentUser}
            selectedTemplateId={state.selectedTemplateId}
            onTemplateSelection={openTemplateSelection}
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
            userProfile={state.userProfile}
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
          {state.currentUser && (
            <button 
              className="footer-btn" 
              onClick={openProfileManager}
              title="Gérer le profil"
            >
              <span>⚙️</span>
            </button>
          )}
        </div>
      </footer>

      <AuthModal
        isOpen={state.showAuthModal}
        onClose={() => setState(prev => ({ ...prev, showAuthModal: false }))}
        onSuccess={handleAuthSuccess}
      />

      {state.showTemplateSelection && (
        <TemplateSelection
          onTemplateSelected={handleTemplateSelection}
          selectedTemplateId={state.selectedTemplateId}
          onClose={closeTemplateSelection}
        />
      )}
    </div>
  );
}

export default App;