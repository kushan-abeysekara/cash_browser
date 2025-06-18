export class BrowserController {
  constructor(authController, notification) {
    this.authController = authController;
    this.notification = notification;
    this.webview = null;
    this.urlInput = null;
    this.isLoading = false;
    this.navigationListeners = []; // Track navigation state change listeners
    this.printHandler = null; // Store the print handler callback
    // Default search engine
    this.searchEngine = 'https://www.google.com/search?q=';
    this._initialized = false;
  }

  initialize() {
    // Prevent double initialization
    if (this._initialized) {
      console.warn('BrowserController already initialized');
      return;
    }

    try {
      this.webview = document.getElementById('web-view');
      this.urlInput = document.getElementById('url-input');
      
      if (!this.webview) {
        console.error('Webview element not found');
        return;
      }
      
      // Safety check for URL input
      if (!this.urlInput) {
        console.warn('URL input element not found');
        // Create a fallback element to avoid errors
        this.urlInput = { value: '' };
      }
      
      // Clear existing event listeners to prevent duplicates
      this.clearEventListeners();
      
      // Set up event listeners with proper error handling
      this.setupEventListeners();
      
      // Initialize with about:blank if not already loaded
      if (!this.webview.src || this.webview.src === '') {
        this.webview.src = 'about:blank';
      }
      
      // Mark as initialized
      this._initialized = true;
      console.log('BrowserController initialized successfully');
    } catch (error) {
      console.error('Failed to initialize BrowserController:', error);
      throw error;
    }
  }
  
  clearEventListeners() {
    // Clean up old event listeners if they exist
    try {
      // We can't actually remove anonymous listeners easily,
      // but we can clean our navigation listener array
      this.navigationListeners = [];
    } catch (error) {
      console.error('Error clearing event listeners:', error);
    }
  }
  
  setupEventListeners() {
    try {
      // Handle load failures
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
        if (this.urlInput && this.webview.getURL) {
          try {
            this.urlInput.value = this.webview.getURL();
          } catch (e) {
            console.error('Error updating URL input:', e);
          }
        }
        this.updateNavigationState();
      });
      
      // Update URL when navigation happens
      this.webview.addEventListener('did-navigate', (event) => {
        if (this.urlInput) {
          this.urlInput.value = event.url;
        }
        this.updateNavigationState();
      });
      
      this.webview.addEventListener('did-navigate-in-page', () => {
        this.updateNavigationState();
      });
      
      // Make sure webview is ready before use
      this.webview.addEventListener('dom-ready', () => {
        console.log('Webview DOM is ready');
      });
    } catch (error) {
      console.error('Error setting up event listeners:', error);
      throw error;
    }
  }

  loadUrl(url) {
    if (!this._initialized) {
      console.error('BrowserController not initialized yet');
      return false;
    }
    
    if (!url) {
      console.error('Attempted to load empty URL');
      return false;
    }
    
    try {
      const urlString = url.trim();
      let formattedUrl = urlString;
      
      // Check if this is a URL or search query
      if (this.isSearchQuery(urlString)) {
        // Encode search query and use the search engine
        const encodedQuery = encodeURIComponent(urlString);
        formattedUrl = this.searchEngine + encodedQuery;
        console.log('Search query detected, using search engine with query:', urlString);
      } else {
        // Add https:// protocol if missing but it looks like a domain
        if (!urlString.startsWith('http://') && !urlString.startsWith('https://') &&
            !urlString.startsWith('file://') && !urlString.startsWith('about:')) {
          formattedUrl = 'https://' + urlString;
        }
      }
      
      // Update the URL input field
      if (this.urlInput) {
        this.urlInput.value = formattedUrl;
      }
      
      console.log('Loading URL:', formattedUrl);
      
      // Check if webview is available
      if (!this.webview) {
        console.error('Webview element not available');
        return false;
      }
      
      // Load the URL in the webview using different methods for compatibility
      try {
        // Method 1: Using loadURL
        if (typeof this.webview.loadURL === 'function') {
          this.webview.loadURL(formattedUrl);
        } 
        // Method 2: Using setAttribute
        else {
          this.webview.setAttribute('src', formattedUrl);
        }
        
        // Focus the webview after loading with delay for better reliability
        setTimeout(() => {
          if (this.webview && typeof this.webview.focus === 'function') {
            try {
              this.webview.focus();
            } catch (focusError) {
              console.error('Error focusing webview:', focusError);
            }
          }
        }, 100);
        
        return true;
      } catch (loadError) {
        console.error('Error loading URL:', loadError);
        this.notification.show('Error', `Failed to load URL: ${loadError.message}`, 'error');
        return false;
      }
    } catch (error) {
      console.error('Error processing URL:', error);
      this.notification.show('Error', `Failed to load URL: ${error.message}`, 'error');
      return false;
    }
  }
  
  isSearchQuery(input) {
    if (!input) return false;
    
    // URL validation regex
    const urlPattern = /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    
    // More relaxed pattern that matches potential domains
    const domainPattern = /^[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
    
    // IP address pattern
    const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    
    // If the input contains spaces, it's definitely a search query
    if (input.includes(' ')) {
      return true;
    }
    
    // Check if the input matches any of the URL patterns
    if (urlPattern.test(input) || domainPattern.test(input) || ipPattern.test(input)) {
      return false; // It's a URL, not a search query
    }
    
    // Check if the input looks like a local URL or special URL scheme
    if (input.startsWith('localhost') || 
        input.startsWith('127.0.0.1') || 
        input.startsWith('about:') || 
        input.startsWith('file:')) {
      return false; // It's a URL, not a search query
    }
    
    // If there are no dots and no protocol, likely a search query
    if (!input.includes('.') && !input.includes('://')) {
      return true;
    }
    
    // Default behavior - if we can't determine for sure, treat as a URL
    return false;
  }
  
  setSearchEngine(searchUrl) {
    if (searchUrl && typeof searchUrl === 'string') {
      this.searchEngine = searchUrl;
      return true;
    }
    return false;
  }

  goBack() {
    if (!this._initialized) return false;
    
    try {
      if (this.webview && typeof this.webview.canGoBack === 'function' && 
          this.webview.canGoBack()) {
        console.log('Navigating back');
        this.webview.goBack();
        return true;
      }
    } catch (error) {
      console.error('Error navigating back:', error);
    }
    return false;
  }
  
  goForward() {
    if (!this._initialized) return false;
    
    try {
      if (this.webview && typeof this.webview.canGoForward === 'function' && 
          this.webview.canGoForward()) {
        console.log('Navigating forward');
        this.webview.goForward();
        return true;
      }
    } catch (error) {
      console.error('Error navigating forward:', error);
    }
    return false;
  }
  
  refresh() {
    if (!this._initialized) return false;
    
    try {
      if (this.webview && typeof this.webview.reload === 'function') {
        console.log('Refreshing page');
        this.webview.reload();
        return true;
      }
    } catch (error) {
      console.error('Error refreshing page:', error);
    }
    return false;
  }
  
  stop() {
    if (!this._initialized) return false;
    
    try {
      if (this.webview && this.isLoading && 
          typeof this.webview.stop === 'function') {
        console.log('Stopping page load');
        this.webview.stop();
        return true;
      }
    } catch (error) {
      console.error('Error stopping page load:', error);
    }
    return false;
  }
  
  getCurrentUrl() {
    if (!this._initialized) return '';
    
    try {
      return this.webview && typeof this.webview.getURL === 'function' ? 
        this.webview.getURL() : '';
    } catch (error) {
      console.error('Error getting current URL:', error);
      return '';
    }
  }
  
  // Add listener for navigation state changes
  addNavigationStateListener(callback) {
    if (typeof callback === 'function') {
      this.navigationListeners.push(callback);
    }
  }
  
  // Update navigation state and notify listeners
  updateNavigationState() {
    if (!this._initialized || !this.webview) return;
    
    try {
      // Safely get state properties
      let canGoBack = false;
      let canGoForward = false;
      let currentUrl = '';
      
      try { canGoBack = typeof this.webview.canGoBack === 'function' && this.webview.canGoBack(); } 
      catch (e) { console.error('Error checking canGoBack:', e); }
      
      try { canGoForward = typeof this.webview.canGoForward === 'function' && this.webview.canGoForward(); } 
      catch (e) { console.error('Error checking canGoForward:', e); }
      
      try { currentUrl = typeof this.webview.getURL === 'function' ? this.webview.getURL() : ''; } 
      catch (e) { console.error('Error getting URL:', e); }
      
      const navigationState = {
        canGoBack,
        canGoForward,
        isLoading: this.isLoading,
        currentUrl
      };
      
      // Notify all listeners with error handling
      this.navigationListeners.forEach(listener => {
        try {
          listener(navigationState);
        } catch (error) {
          console.error('Error in navigation state listener:', error);
        }
      });
    } catch (error) {
      console.error('Error updating navigation state:', error);
    }
  }
  
  setupWebviewPrintCapture() {
    try {
      if (!this.webview || !this.webview.getWebContentsId) {
        console.warn('Webview not ready for print capture setup');
        return;
      }

      // Inject script to capture print events
      const script = `
        (function() {
          // Check if already installed
          if (window._printCaptureInstalled) {
            return true;
          }
          
          // Mark as installed
          window._printCaptureInstalled = true;
          
          // Override the print function
          const originalPrint = window.print;
          window.print = function() {
            console.log('Print request intercepted');
            try {
              window.top.postMessage({ type: 'print-requested', source: 'print-fn' }, '*');
            } catch (e) {
              console.error('Failed to post message', e);
            }
          };

          // Setup listeners for all print buttons
          function setupPrintButtonListeners() {
            // Find all buttons with print-related attributes or text
            const printButtons = [
              ...document.querySelectorAll('button[id*="print" i]'),
              ...document.querySelectorAll('button[class*="print" i]'),
              ...document.querySelectorAll('button[name*="print" i]'),
              ...document.querySelectorAll('a[id*="print" i]'),
              ...document.querySelectorAll('a[class*="print" i]'),
              ...document.querySelectorAll('input[type="button"][value*="print" i]')
            ];
            
            // Add any buttons with print text content
            document.querySelectorAll('button, a').forEach(el => {
              if (el.innerText && el.innerText.toLowerCase().includes('print')) {
                printButtons.push(el);
              }
            });
            
            // Add click handlers to all print buttons
            printButtons.forEach(btn => {
              if (!btn._printHandlerAttached) {
                btn._printHandlerAttached = true;
                btn.addEventListener('click', function(e) {
                  console.log('Print button clicked');
                  try {
                    window.top.postMessage({ type: 'print-requested', source: 'button' }, '*');
                  } catch (err) {
                    console.error('Failed to post print message:', err);
                  }
                }, true);
              }
            });
            
            // Listen for our custom print event
            document.addEventListener('cash-browser-print-requested', function() {
              console.log('Cash browser print event detected');
              try {
                window.top.postMessage({ type: 'print-requested', source: 'custom-event' }, '*');
              } catch (e) {
                console.error('Failed to post message on event', e);
              }
            });
            
            // Setup MutationObserver to handle dynamically added print buttons
            function setupMutationObserver() {
              const observer = new MutationObserver(function(mutations) {
                // The DOM has changed, re-attach our listeners
                setupPrintButtonListeners();
              });
              
              // Observe the document for added nodes
              observer.observe(document.body, {
                childList: true,
                subtree: true
              });
            }
            
            // Initialize our listeners
            setupPrintButtonListeners();
            setupMutationObserver();
            
            console.log('Enhanced print capture script installed successfully');
            return true;
          }
        })();
      `;
      
      // Inject the script
      this.webview.executeJavaScript(script)
        .then(() => console.log('Print capture script injected successfully'))
        .catch(err => console.error('Failed to inject print capture script:', err));
      
      // Listen for print message from the webview (via IPC)
      this.webview.addEventListener('ipc-message', (event) => {
        if (event.channel === 'print-requested') {
          console.log('Print requested via IPC');
          this.handlePrintRequest();
        }
      });
    } catch (error) {
      console.error('Error injecting print capture script:', error);
    }
  }
  
  // Improved message handler with better logging
  handleWebviewMessage(event) {
    console.log('Message received:', event.data ? event.data.type : 'no data');
    
    if (event.data && event.data.type === 'print-requested') {
      console.log('Print requested from webview via postMessage:', event.data.source || 'unknown');
      this.handlePrintRequest();
    }
  }
  
  // Centralized print request handler
  handlePrintRequest() {
    console.log('Handling print request');
    if (typeof this.printHandler === 'function' && this.webview && this.webview.getWebContentsId) {
      try {
        const webContentsId = this.webview.getWebContentsId();
        console.log('Triggering print handler with webContentsId:', webContentsId);
        this.printHandler(webContentsId);
      } catch (error) {
        console.error('Error getting webContentsId or calling print handler:', error);
        
        // Fallback if we can't get the webContentsId
        if (typeof this.printHandler === 'function') {
          console.log('Using fallback print handling without webContentsId');
          this.printHandler();
        }
      }
    } else {
      console.error('Print handler not available or missing webContentsId');
    }
  }
  
  // Register a handler for print requests
  setPrintHandler(callback) {
    this.printHandler = callback;
  }
  
  // Manually trigger print with our custom dialog
  printCurrentPage() {
    this.handlePrintRequest();
  }
}
