import React, { useState } from 'react';
import { authService, AuthResponse } from '../../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let response: AuthResponse;
      
      if (isLogin) {
        response = await authService.login(formData.email, formData.password);
      } else {
        response = await authService.register(formData.email, formData.password, formData.name);
      }

      if (response.success) {
        if (response.message && response.message.includes('Vérifiez votre email')) {
          // Registration successful, show email verification message
          setError('');
          setFormData({ email: '', password: '', name: '' });
          setIsLogin(true); // Switch back to login mode
          // Show a more user-friendly message
          setError('✅ Compte créé avec succès ! Un email de vérification a été envoyé à votre adresse. Vérifiez votre boîte de réception (et vos spams) puis revenez vous connecter.');
        } else {
          // Normal login success
          onSuccess();
          onClose();
        }
      } else {
        setError(response.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.loginWithGoogle();
      // Auth service will handle the success
      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Google authentication failed';
      setError(errorMessage);
      console.error('Google auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ email: '', password: '', name: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h2>{isLogin ? 'Se connecter' : 'Créer un compte'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="auth-modal-content">
          {error && (
            <div className={error.startsWith('✅') ? "success-message" : "error-message"}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="name">Nom complet</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required={!isLogin}
                  placeholder="Votre nom complet"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="votre@email.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'Créer le compte')}
            </button>
          </form>

          <div className="auth-divider">
            <span>ou</span>
          </div>

          <button
            type="button"
            className="google-auth-btn"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="google-icon" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuer avec Google
          </button>

          <div className="auth-toggle">
            {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
            <button type="button" onClick={toggleMode} className="toggle-btn">
              {isLogin ? "Créer un compte" : "Se connecter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// CSS styles (would normally be in a separate file)
const styles = `
.auth-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.auth-modal {
  background: white;
  border-radius: 12px;
  width: 400px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.auth-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.auth-modal-header h2 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #374151;
}

.auth-modal-content {
  padding: 24px;
}

.error-message {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
}

.success-message {
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  color: #15803d;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.auth-submit-btn {
  width: 100%;
  background-color: #3b82f6;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 16px;
}

.auth-submit-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.auth-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-divider {
  text-align: center;
  margin: 20px 0;
  position: relative;
}

.auth-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #e5e7eb;
}

.auth-divider span {
  background-color: white;
  padding: 0 16px;
  color: #6b7280;
  font-size: 14px;
}

.google-auth-btn {
  width: 100%;
  background-color: white;
  border: 1px solid #d1d5db;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.google-auth-btn:hover:not(:disabled) {
  background-color: #f9fafb;
}

.google-auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-icon {
  width: 18px;
  height: 18px;
}

.auth-toggle {
  text-align: center;
  font-size: 14px;
  color: #6b7280;
}

.toggle-btn {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-size: 14px;
  margin-left: 4px;
  text-decoration: underline;
}

.toggle-btn:hover {
  color: #2563eb;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}