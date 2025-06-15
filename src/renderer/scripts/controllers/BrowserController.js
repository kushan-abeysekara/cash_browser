export class BrowserController {
  constructor(authController, notification) {
    this.authController = authController;
    this.notification = notification;
    this.webview = null;
    this.urlInput = null;
    this.isLoading = false;
    this.navigationListeners = []; // Track navigation state change listeners
  }

  initialize() {
    this.webview = document.getElementById('web-view');
    this.urlInput = document.getElementById('url-input');
    
    if (!this.webview) {
      console.error('Webview element not found');
      return;
    }
    
    // Additional initialization for webview
    this.webview.addEventListener('did-fail-load', (event) => {
      this.isLoading = false;
      if (event.errorCode !== -3) { // Ignore ERR_ABORTED as it's usually just for navigation changes
        this.notification.show('Error', `Failed to load: ${event.errorDescription}`, 'error');
      }
      this.updateNavigationState();
    });
    
    // Add console logging for debugging
    this.webview.addEventListener('console-message', (event) => {
      console.log('Webview console:', event.message);
    });
    
    // Track loading status
    this.webview.addEventListener('did-start-loading', () => {
      this.isLoading = true;
      this.updateNavigationState();
    });
    
    this.webview.addEventListener('did-stop-loading', () => {
      this.isLoading = false;
      this.urlInput.value = this.webview.getURL();
      this.updateNavigationState();
    });
    
    // Update URL when navigation happens
    this.webview.addEventListener('did-navigate', (event) => {
      this.urlInput.value = event.url;
      this.updateNavigationState();
    });
    
    this.webview.addEventListener('did-navigate-in-page', () => {
      this.updateNavigationState();
    });
    
    // Make sure webview is ready before use
    this.webview.addEventListener('dom-ready', () => {
      console.log('Webview DOM is ready');
    });
    
    console.log('BrowserController initialized successfully');
    
    // Initial load of about:blank if webview is empty
    if (!this.webview.src || this.webview.src === '') {
      this.webview.src = 'about:blank';
    }
  }

  loadUrl(url) {
    // Validate and format URL
    if (!url) return false;
    
    try {
      const urlString = url.trim();
      let formattedUrl = urlString;
      
      // Add https:// protocol if missing
      if (!urlString.startsWith('http://') && !urlString.startsWith('https://') &&
          !urlString.startsWith('file://') && !urlString.startsWith('about:')) {
        formattedUrl = 'https://' + urlString;
      }
      
      // Update the URL input field
      if (this.urlInput) {
        this.urlInput.value = formattedUrl;
      }
      
      console.log('Loading URL:', formattedUrl);
      
      // Load the URL in the webview
      if (this.webview) {
        // Use loadURL instead of setAttribute for more reliable loading
        if (this.webview.loadURL) {
          this.webview.loadURL(formattedUrl);
        } else {
          // Fallback to setAttribute if loadURL is not available
          this.webview.setAttribute('src', formattedUrl);
        }
        
        // Focus the webview after loading
        setTimeout(() => {
          if (this.webview) {
            this.webview.focus();
          }
        }, 100);
        
        return true;
      } else {
        console.error('Webview element not available');
        return false;
      }
    } catch (error) {
      console.error('Error loading URL:', error);
      this.notification.show('Error', `Failed to load URL: ${error.message}`, 'error');
      return false;
    }
  }
  
  goBack() {
    if (this.webview && this.webview.canGoBack()) {
      console.log('Navigating back');
      this.webview.goBack();
      return true;
    }
    return false;
  }
  
  goForward() {
    if (this.webview && this.webview.canGoForward()) {
      console.log('Navigating forward');
      this.webview.goForward();
      return true;
    }
    return false;
  }
  
  refresh() {
    if (this.webview) {
      console.log('Refreshing page');
      this.webview.reload();
      return true;
    }
    return false;
  }
  
  stop() {
    if (this.webview && this.isLoading) {
      console.log('Stopping page load');
      this.webview.stop();
      return true;
    }
    return false;
  }
  
  getCurrentUrl() {
    return this.webview ? this.webview.getURL() : '';
  }
  
  // Add listener for navigation state changes
  addNavigationStateListener(callback) {
    if (typeof callback === 'function') {
      this.navigationListeners.push(callback);
    }
  }
  
  // Update navigation state and notify listeners
  updateNavigationState() {
    if (!this.webview) return;
    
    const navigationState = {
      canGoBack: this.webview.canGoBack(),
      canGoForward: this.webview.canGoForward(),
      isLoading: this.isLoading,
      currentUrl: this.webview.getURL()
    };
    
    // Notify all listeners
    this.navigationListeners.forEach(listener => {
      try {
        listener(navigationState);
      } catch (error) {
        console.error('Error in navigation state listener:', error);
      }
    });
  }
}
