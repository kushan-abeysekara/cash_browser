export class BrowserController {
  constructor(authController, notification) {
    this.authController = authController;
    this.notification = notification;
    this.webview = null;
    this.urlInput = null;
    this.isLoading = false;
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
    });
    
    // Add console logging for debugging
    this.webview.addEventListener('console-message', (event) => {
      console.log('Webview console:', event.message);
    });
    
    // Track loading status
    this.webview.addEventListener('did-start-loading', () => {
      this.isLoading = true;
    });
    
    this.webview.addEventListener('did-stop-loading', () => {
      this.isLoading = false;
      this.urlInput.value = this.webview.getURL();
    });
    
    // Update URL when navigation happens
    this.webview.addEventListener('did-navigate', (event) => {
      this.urlInput.value = event.url;
    });
    
    console.log('BrowserController initialized successfully');
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
      this.urlInput.value = formattedUrl;
      
      console.log('Loading URL:', formattedUrl);
      
      // Load the URL in the webview
      if (this.webview) {
        this.webview.src = formattedUrl;
        
        // Focus the webview after loading
        setTimeout(() => {
          this.webview.focus();
        }, 100);
      } else {
        console.error('Webview element not available');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error loading URL:', error);
      this.notification.show('Error', `Failed to load URL: ${error.message}`, 'error');
      return false;
    }
  }
  
  goBack() {
    if (this.webview && this.webview.canGoBack()) {
      this.webview.goBack();
    }
  }
  
  goForward() {
    if (this.webview && this.webview.canGoForward()) {
      this.webview.goForward();
    }
  }
  
  refresh() {
    if (this.webview) {
      this.webview.reload();
    }
  }
  
  stop() {
    if (this.webview && this.isLoading) {
      this.webview.stop();
    }
  }
  
  getCurrentUrl() {
    return this.webview ? this.webview.getURL() : '';
  }
}
