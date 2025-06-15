export class AuthController {
  constructor(notification) {
    this.notification = notification;
    this.isAuthenticated = false;
    this.currentUser = null;
    this.loginModal = null;
    this.loginForm = null;
  }

  initialize() {
    // Initialize login modal elements
    this.loginModal = document.getElementById('login-modal');
    this.loginForm = document.getElementById('login-form');
    const cancelButton = document.getElementById('cancel-login');
    const closeButton = this.loginModal.querySelector('.close-button');
    
    // Set up event listeners
    if (this.loginForm) {
      this.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }
    
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        this.closeLoginModal();
      });
    }
    
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closeLoginModal();
      });
    }
  }

  async checkStoredSessions() {
    try {
      if (!window.api || !window.api.auth) {
        console.error('API not available');
        return;
      }
      
      const result = await window.api.auth.checkSession();
      if (result && result.valid) {
        this.isAuthenticated = true;
        this.currentUser = {
          id: result.session.userId,
          url: result.session.url
        };
        this.notification.show('Authentication', 'Already logged in', 'success');
      }
    } catch (error) {
      console.error('Error checking stored sessions:', error);
    }
  }
  
  showLoginModal(url = '') {
    // Set the current URL if provided
    if (url && this.loginForm) {
      const urlField = document.createElement('input');
      urlField.type = 'hidden';
      urlField.name = 'url';
      urlField.value = url;
      this.loginForm.appendChild(urlField);
    }
    
    // Show the modal
    if (this.loginModal) {
      this.loginModal.style.display = 'flex';
    }
  }
  
  closeLoginModal() {
    if (this.loginModal) {
      this.loginModal.style.display = 'none';
    }
    
    // Reset the form
    if (this.loginForm) {
      this.loginForm.reset();
      // Remove any URL field that might have been added
      const urlField = this.loginForm.querySelector('input[name="url"]');
      if (urlField) {
        this.loginForm.removeChild(urlField);
      }
    }
  }
  
  async handleLogin() {
    try {
      if (!window.api || !window.api.auth) {
        throw new Error('API not available');
      }
      
      const formData = new FormData(this.loginForm);
      const credentials = {
        url: formData.get('url') || '',
        username: formData.get('username'),
        password: formData.get('password'),
        authType: 'basic' // Default to basic auth
      };
      
      this.notification.show('Authentication', 'Logging in...', 'info');
      
      const result = await window.api.auth.login(credentials);
      if (result && result.success) {
        this.isAuthenticated = true;
        this.currentUser = {
          id: result.userId,
          url: credentials.url
        };
        this.notification.show('Authentication', 'Login successful', 'success');
        this.closeLoginModal();
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('auth:login-success', { 
          detail: { userId: result.userId, url: credentials.url } 
        }));
      } else {
        this.notification.show('Authentication Error', result.message || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.notification.show('Authentication Error', error.message || 'Login failed', 'error');
    }
  }
  
  async logout() {
    try {
      if (!window.api || !window.api.auth) {
        throw new Error('API not available');
      }
      
      const result = await window.api.auth.logout();
      if (result && result.success) {
        this.isAuthenticated = false;
        this.currentUser = null;
        this.notification.show('Authentication', 'Logged out successfully', 'success');
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('auth:logout'));
      } else {
        this.notification.show('Logout Error', result.message || 'Logout failed', 'error');
      }
    } catch (error) {
      console.error('Logout error:', error);
      this.notification.show('Logout Error', error.message || 'Logout failed', 'error');
    }
  }
  
  isLoggedIn() {
    return this.isAuthenticated;
  }
  
  getCurrentUser() {
    return this.currentUser;
  }
}
