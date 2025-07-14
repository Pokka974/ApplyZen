import React, { useState, useEffect } from 'react';
import { authService, User } from '../../services/authService';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
  onOpenHistory: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout, onOpenHistory }) => {
  const [usageInfo, setUsageInfo] = useState<{
    usageCount: number;
    limit: number;
    plan: string;
  } | null>(null);

  useEffect(() => {
    const loadUsageInfo = async () => {
      const info = await authService.getUsageInfo();
      setUsageInfo(info);
    };
    loadUsageInfo();
  }, [user]);

  const getUsageColor = () => {
    if (!usageInfo || usageInfo.limit === -1) return '#10b981'; // Green for unlimited
    const percentage = (usageInfo.usageCount / usageInfo.limit) * 100;
    if (percentage >= 90) return '#ef4444'; // Red
    if (percentage >= 70) return '#f59e0b'; // Yellow
    return '#10b981'; // Green
  };

  const getUsageText = () => {
    if (!usageInfo) return '';
    if (usageInfo.limit === -1) return `${usageInfo.usageCount} générations (illimité)`;
    return `${usageInfo.usageCount}/${usageInfo.limit} générations`;
  };

  const getPlanBadgeColor = () => {
    switch (user.plan) {
      case 'PREMIUM': return '#3b82f6';
      case 'ENTERPRISE': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  return (
    <div className="user-profile">
      <div className="user-info">
        <div className="user-avatar">
          {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
        </div>
        <div className="user-details">
          <div className="user-name">{user.name || user.email}</div>
          <div className="user-email">{user.email}</div>
          <div className="user-plan">
            <span 
              className="plan-badge" 
              style={{ backgroundColor: getPlanBadgeColor() }}
            >
              {user.plan}
            </span>
          </div>
        </div>
      </div>

      {usageInfo && (
        <div className="usage-info">
          <div className="usage-text" style={{ color: getUsageColor() }}>
            {getUsageText()}
          </div>
          {usageInfo.limit !== -1 && (
            <div className="usage-bar">
              <div 
                className="usage-fill" 
                style={{ 
                  width: `${Math.min((usageInfo.usageCount / usageInfo.limit) * 100, 100)}%`,
                  backgroundColor: getUsageColor()
                }}
              />
            </div>
          )}
        </div>
      )}

      <div className="user-actions">
        <button className="action-btn history-btn" onClick={() => {
          chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Historique
        </button>
        
        <button className="action-btn logout-btn" onClick={onLogout}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Déconnexion
        </button>
      </div>
    </div>
  );
};

// CSS styles
const styles = `
.user-profile {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
}

.user-details {
  flex: 1;
}

.user-name {
  font-weight: 600;
  color: #111827;
  font-size: 14px;
  margin-bottom: 2px;
}

.user-email {
  color: #6b7280;
  font-size: 12px;
  margin-bottom: 4px;
}

.user-plan {
  display: flex;
  align-items: center;
}

.plan-badge {
  color: white;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.usage-info {
  margin-bottom: 16px;
}

.usage-text {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 6px;
}

.usage-bar {
  height: 4px;
  background-color: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
}

.usage-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.user-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: white;
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.history-btn:hover {
  color: #3b82f6;
  border-color: #3b82f6;
}

.logout-btn:hover {
  color: #ef4444;
  border-color: #ef4444;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const existingStyles = document.querySelector('style[data-component="user-profile"]');
  if (!existingStyles) {
    const styleSheet = document.createElement('style');
    styleSheet.setAttribute('data-component', 'user-profile');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }
}