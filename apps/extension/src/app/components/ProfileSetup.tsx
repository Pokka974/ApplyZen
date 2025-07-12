import React from 'react';

interface ProfileSetupProps {
  onSetupProfile: () => void;
}

const ProfileSetup: React.FC<ProfileSetupProps> = ({ onSetupProfile }) => {
  return (
    <div className="profile-setup">
      <h3>Configuration du profil</h3>
      <p>Configurez votre profil pour personnaliser vos CV</p>
      <button className="btn-secondary" onClick={onSetupProfile}>
        Configurer
      </button>
    </div>
  );
};

export default ProfileSetup;