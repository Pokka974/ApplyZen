import React, { useState } from 'react';
import { UserProfile } from '@./shared-types';

interface ProfileSetupProps {
  onSetupProfile: () => void;
  onSaveProfile?: (profile: UserProfile) => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ onSetupProfile, onSaveProfile }) => {
  const [showForm, setShowForm] = useState(false);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    currentTitle: '',
    experience: '1-3',
    skills: '',
    summary: '',
    education: '',
    languages: ''
  });

  const handleSave = async () => {
    try {
      // Save to Chrome storage
      await chrome.storage.sync.set({ 
        userProfile: {
          ...profile,
          updatedAt: new Date().toISOString()
        }
      });
      
      if (onSaveProfile) {
        onSaveProfile(profile as UserProfile);
      }
      
      alert('Profil sauvegardé avec succès!');
      setShowForm(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  if (showForm) {
    return (
      <div className="profile-setup" style={{ textAlign: 'left', maxHeight: '400px', overflow: 'auto' }}>
        <h3 style={{ textAlign: 'center', marginBottom: '16px' }}>Configuration du profil</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="Nom complet"
            value={profile.fullName}
            onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          
          <input
            type="email"
            placeholder="Email"
            value={profile.email}
            onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          
          <input
            type="text"
            placeholder="Téléphone"
            value={profile.phone}
            onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          
          <input
            type="text"
            placeholder="Localisation"
            value={profile.location}
            onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          
          <input
            type="text"
            placeholder="Poste actuel"
            value={profile.currentTitle}
            onChange={(e) => setProfile(prev => ({ ...prev, currentTitle: e.target.value }))}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
          
          <textarea
            placeholder="Compétences (séparées par des virgules)"
            value={profile.skills}
            onChange={(e) => setProfile(prev => ({ ...prev, skills: e.target.value }))}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '60px' }}
          />
          
          <textarea
            placeholder="Résumé professionnel"
            value={profile.summary}
            onChange={(e) => setProfile(prev => ({ ...prev, summary: e.target.value }))}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '60px' }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button className="btn-primary" onClick={handleSave} style={{ flex: 1 }}>
            Sauvegarder
          </button>
          <button className="btn-secondary" onClick={() => setShowForm(false)} style={{ flex: 1 }}>
            Annuler
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-setup">
      <h3>Configuration du profil</h3>
      <p>Configurez votre profil pour personnaliser vos CV</p>
      <button className="btn-secondary" onClick={() => setShowForm(true)}>
        Configurer rapidement
      </button>
    </div>
  );
};

export default ProfileSetup;