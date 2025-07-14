// Authentication service for Chrome extension
export interface User {
  id: string;
  email: string;
  name?: string;
  plan: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
  usageCount: number;
  profile?: any;
}

export interface AuthResponse {
  success: boolean;
  data?: { user: User };
  error?: string;
  message?: string;
}

class AuthService {
  private apiUrl = 'http://localhost:3000/api';
  private currentUser: User | null = null;

  constructor() {
    this.loadStoredUser();
  }

  // Load user from chrome storage
  private async loadStoredUser(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['user']);
      if (result.user) {
        this.currentUser = result.user;
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
    }
  }

  // Save user to chrome storage
  private async saveUser(user: User): Promise<void> {
    try {
      await chrome.storage.local.set({ user });
      this.currentUser = user;
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }

  // Clear user from storage
  private async clearUser(): Promise<void> {
    try {
      await chrome.storage.local.remove(['user']);
      this.currentUser = null;
    } catch (error) {
      console.error('Error clearing user:', error);
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Register new user
  async register(email: string, password: string, name?: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data?.user) {
        await this.saveUser(data.data.user);
      }

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  // Login user
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data?.user) {
        await this.saveUser(data.data.user);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.clearUser();
    }
  }

  // Check authentication status with server
  async checkAuth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.data?.user) {
        await this.saveUser(data.data.user);
        return true;
      } else {
        await this.clearUser();
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      await this.clearUser();
      return false;
    }
  }

  // Google OAuth login
  async loginWithGoogle(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Open Google OAuth in new tab
        const authUrl = `${this.apiUrl}/auth/google`;
        chrome.tabs.create({ url: authUrl }, (authTab) => {
          if (!authTab || !authTab.id) {
            reject(new Error('Failed to create auth tab'));
            return;
          }

          // Listen for tab updates to detect successful login
          const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
            if (tabId === authTab.id && changeInfo.url) {
              console.log('Auth tab URL changed:', changeInfo.url);
              
              // Check if redirected to success page (not auth URL anymore)
              if (changeInfo.url.includes('localhost:3000') && !changeInfo.url.includes('/auth/')) {
                // Authentication successful, check auth status
                this.checkAuth().then((isAuthenticated) => {
                  chrome.tabs.remove(tabId);
                  chrome.tabs.onUpdated.removeListener(listener);
                  if (isAuthenticated) {
                    resolve();
                  } else {
                    reject(new Error('Authentication failed'));
                  }
                }).catch(reject);
              }
              
              // Check for error in URL
              if (changeInfo.url.includes('error=')) {
                chrome.tabs.remove(tabId);
                chrome.tabs.onUpdated.removeListener(listener);
                reject(new Error('OAuth authentication failed'));
              }
            }
          };

          // Remove listener after 5 minutes to prevent memory leaks
          const timeoutId = setTimeout(() => {
            chrome.tabs.onUpdated.removeListener(listener);
            reject(new Error('Authentication timeout'));
          }, 5 * 60 * 1000);

          chrome.tabs.onUpdated.addListener(listener);
        });
      } catch (error) {
        console.error('Google OAuth error:', error);
        reject(error);
      }
    });
  }

  // Get user's usage information
  async getUsageInfo(): Promise<{ usageCount: number; limit: number; plan: string } | null> {
    if (!this.currentUser) return null;

    const limits = {
      FREE: 5,
      PREMIUM: 100,
      ENTERPRISE: -1, // Unlimited
    };

    return {
      usageCount: this.currentUser.usageCount,
      limit: limits[this.currentUser.plan],
      plan: this.currentUser.plan,
    };
  }

  // Refresh user data
  async refreshUserData(): Promise<void> {
    await this.checkAuth();
  }
}

// Export singleton instance
export const authService = new AuthService();