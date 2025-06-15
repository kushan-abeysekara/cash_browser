const axios = require('axios');
const crypto = require('crypto');
const ElectronStore = require('electron-store');

class AuthService {
  constructor() {
    this.store = new ElectronStore({
      name: 'auth-store',
      encryptionKey: 'secure-encryption-key',
    });
    this.currentSession = null;
  }

  async login(credentials) {
    try {
      const { url, username, password, authType = 'basic' } = credentials;
      
      // Handle different authentication types
      switch(authType) {
        case 'basic':
          return await this.basicLogin(url, username, password);
        
        case 'jwt':
          return await this.jwtLogin(url, username, password);
          
        case 'oauth':
          return await this.oauthLogin(url, credentials);
          
        default:
          throw new Error('Unsupported authentication type');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  async basicLogin(url, username, password) {
    try {
      // Call the login endpoint
      const response = await axios.post(`${url}/login`, {
        username,
        password
      });
      
      if (response.data.success) {
        const sessionData = {
          type: 'basic',
          token: response.data.token,
          userId: response.data.userId,
          expires: response.data.expires,
          url
        };
        
        this.saveSession(sessionData);
        this.currentSession = sessionData;
        
        return { 
          success: true, 
          message: 'Login successful',
          userId: response.data.userId
        };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('Basic login error:', error);
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  }

  async jwtLogin(url, username, password) {
    try {
      // Call the JWT login endpoint
      const response = await axios.post(`${url}/api/auth/login`, {
        username,
        password
      });
      
      if (response.data.token) {
        const sessionData = {
          type: 'jwt',
          token: response.data.token,
          refreshToken: response.data.refreshToken,
          userId: response.data.user?.id,
          expires: this.getTokenExpiry(response.data.token),
          url
        };
        
        this.saveSession(sessionData);
        this.currentSession = sessionData;
        
        return { 
          success: true, 
          message: 'JWT login successful',
          userId: response.data.user?.id
        };
      } else {
        throw new Error('JWT login failed: No token received');
      }
    } catch (error) {
      console.error('JWT login error:', error);
      throw new Error(error.response?.data?.message || error.message || 'JWT login failed');
    }
  }

  async oauthLogin(url, credentials) {
    // OAuth implementation would go here
    throw new Error('OAuth login not yet implemented');
  }

  saveSession(sessionData) {
    const sessionKey = crypto.createHash('md5').update(sessionData.url).digest('hex');
    this.store.set(`sessions.${sessionKey}`, sessionData);
  }

  getSession(url) {
    const sessionKey = crypto.createHash('md5').update(url).digest('hex');
    return this.store.get(`sessions.${sessionKey}`);
  }

  async logout() {
    if (!this.currentSession) {
      return { success: false, message: 'No active session' };
    }
    
    const sessionKey = crypto.createHash('md5').update(this.currentSession.url).digest('hex');
    this.store.delete(`sessions.${sessionKey}`);
    this.currentSession = null;
    
    return { success: true, message: 'Logged out successfully' };
  }

  async checkSession(url) {
    const session = this.getSession(url);
    if (!session) {
      return { valid: false, message: 'No session found' };
    }
    
    // Check if session is expired
    if (session.expires && new Date(session.expires) < new Date()) {
      return { valid: false, message: 'Session expired' };
    }
    
    // If it's a JWT, we can try to refresh it if it's close to expiry
    if (session.type === 'jwt' && session.refreshToken) {
      const expiryDate = new Date(session.expires);
      const now = new Date();
      const timeLeft = expiryDate - now;
      
      // If less than 5 minutes left, try to refresh
      if (timeLeft < 5 * 60 * 1000) {
        try {
          const response = await axios.post(`${url}/api/auth/refresh`, {
            refreshToken: session.refreshToken
          });
          
          if (response.data.token) {
            session.token = response.data.token;
            session.refreshToken = response.data.refreshToken || session.refreshToken;
            session.expires = this.getTokenExpiry(response.data.token);
            this.saveSession(session);
          }
        } catch (error) {
          console.error('Error refreshing token:', error);
          // Continue with current token
        }
      }
    }
    
    return { valid: true, session };
  }

  getTokenExpiry(token) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return new Date(payload.exp * 1000).toISOString();
    } catch (error) {
      console.error('Error parsing token expiry:', error);
      // Default expiry: 1 hour from now
      return new Date(Date.now() + 60 * 60 * 1000).toISOString();
    }
  }
}

module.exports = AuthService;
