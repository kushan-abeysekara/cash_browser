// Main application script
import { TabController } from './controllers/TabController.js';
import { BrowserController } from './controllers/BrowserController.js';
import { CacheController } from './controllers/CacheController.js';
import { DashboardController } from './controllers/DashboardController.js';
import { AuthController } from './controllers/AuthController.js';
import { SettingsController } from './controllers/SettingsController.js';
import { PrintController } from './controllers/PrintController.js';
import { NotificationService } from './services/NotificationService.js';
import { ZoomController } from './controllers/ZoomController.js';

// Initialize services
const notification = new NotificationService();

// Initialize controllers
const tabController = new TabController();
let authController, browserController, cacheController, dashboardController, zoomController, settingsController, printController;

// Helper function to log to both console and main process
function log(message) {
  console.log(message);
  if (window.api && window.api.log) {
    window.api.log(message);
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  log('DOM loaded, initializing application...');
  
  try {
    // Initialize controllers with proper error handling
    try {
      authController = new AuthController(notification);
      authController.initialize();
      log('AuthController initialized');
    } catch (error) {
      log(`Error initializing AuthController: ${error.message}`);
      console.error('AuthController init error:', error);
    }
    
    try {
      browserController = new BrowserController(authController, notification);
      browserController.initialize();
      log('BrowserController initialized');
    } catch (error) {
      log(`Error initializing BrowserController: ${error.message}`);
      console.error('BrowserController init error:', error);
    }
    
    try {
      cacheController = new CacheController(notification);
      cacheController.initialize();
      log('CacheController initialized');
    } catch (error) {
      log(`Error initializing CacheController: ${error.message}`);
      console.error('CacheController init error:', error);
    }
    
    try {
      dashboardController = new DashboardController(authController, notification);
      dashboardController.initialize();
      log('DashboardController initialized');
    } catch (error) {
      log(`Error initializing DashboardController: ${error.message}`);
      console.error('DashboardController init error:', error);
    }
    
    try {
      zoomController = new ZoomController();
      zoomController.initialize();
      log('ZoomController initialized');
    } catch (error) {
      log(`Error initializing ZoomController: ${error.message}`);
      console.error('ZoomController init error:', error);
    }
    
    try {
      settingsController = new SettingsController(notification);
      await settingsController.initialize();
      log('SettingsController initialized');
    } catch (error) {
      log(`Error initializing SettingsController: ${error.message}`);
      console.error('SettingsController init error:', error);
    }
    
    try {
      tabController.initialize();
      log('TabController initialized');
    } catch (error) {
      log(`Error initializing TabController: ${error.message}`);
      console.error('TabController init error:', error);
    }
    
    // Initialize print controller last to avoid conflicts with browser controller
    try {
      printController = new PrintController(notification);
      await printController.initialize();
      log('PrintController initialized');
    } catch (error) {
      log(`Error initializing PrintController: ${error.message}`);
      console.error('PrintController init error:', error);
    }
    
    // Elements
    const urlInput = document.getElementById('url-input');
    const goButton = document.getElementById('go-button');
    const backButton = document.getElementById('back-button');
    const forwardButton = document.getElementById('forward-button');
    const refreshButton = document.getElementById('refresh-button');
    const printButton = document.getElementById('print-button');
    const menuButton = document.getElementById('menu-button');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const webview = document.getElementById('web-view');

    // Check if required elements exist
    if (!webview) {
      log('ERROR: webview element not found in DOM');
    }

    // Menu item elements
    const menuBrowser = document.getElementById('menu-browser');
    const menuCache = document.getElementById('menu-cache');
    const menuDashboard = document.getElementById('menu-dashboard');
    const menuSettings = document.getElementById('menu-settings');
    const zoomIn = document.getElementById('zoom-in');
    const zoomOut = document.getElementById('zoom-out');
    const zoomReset = document.getElementById('zoom-reset');
    const toggleInterception = document.getElementById('toggle-interception');
    const clearCacheMenu = document.getElementById('clear-cache-menu');
    const printMenuItem = document.getElementById('menu-print');
    
    // Add navigation state listener to update UI buttons
    if (browserController) {
      browserController.addNavigationStateListener((state) => {
        // Update button states based on navigation state
        if (backButton) backButton.disabled = !state.canGoBack;
        if (forwardButton) forwardButton.disabled = !state.canGoForward;
        
        // Update refresh button icon based on loading state
        if (refreshButton) {
          const icon = refreshButton.querySelector('.material-icons');
          if (icon) {
            icon.textContent = state.isLoading ? 'close' : 'refresh';
          }
        }
        
        // Update URL input if it's not currently focused
        if (urlInput && document.activeElement !== urlInput) {
          urlInput.value = state.currentUrl;
        }
      });
    }
    
    // Setup dropdown menu toggle with direct DOM manipulation for reliability
    if (menuButton && dropdownMenu) {
      menuButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Direct DOM manipulation for toggle
        if (dropdownMenu.style.display === 'block') {
          dropdownMenu.style.display = 'none';
        } else {
          dropdownMenu.style.display = 'block';
        }
      });
    
      // Close the dropdown when clicking elsewhere
      document.addEventListener('click', () => {
        if (dropdownMenu) {
          dropdownMenu.style.display = 'none';
        }
      });
    
      // Prevent clicks inside dropdown from closing it
      if (dropdownMenu) {
        dropdownMenu.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    }
    
    // Setup menu item handlers with direct navigation
    if (menuBrowser) {
      menuBrowser.addEventListener('click', () => {
        if (tabController) {
          tabController.activateTab('browser-tab');
        }
        if (dropdownMenu) dropdownMenu.style.display = 'none';
      });
    }
    
    if (menuCache) {
      menuCache.addEventListener('click', () => {
        if (tabController) {
          tabController.activateTab('cache-tab');
        }
        if (dropdownMenu) dropdownMenu.style.display = 'none';
      });
    }
    
    if (menuDashboard) {
      menuDashboard.addEventListener('click', () => {
        if (tabController) {
          tabController.activateTab('dashboard-tab');
        }
        if (dropdownMenu) dropdownMenu.style.display = 'none';
      });
    }
    
    // Zoom controls with direct function calls
    if (zoomIn) {
      zoomIn.addEventListener('click', () => {
        if (zoomController) {
          zoomController.zoomIn();
        }
        if (dropdownMenu) dropdownMenu.style.display = 'none';
      });
    }
    
    if (zoomOut) {
      zoomOut.addEventListener('click', () => {
        if (zoomController) {
          zoomController.zoomOut();
        }
        if (dropdownMenu) dropdownMenu.style.display = 'none';
      });
    }
    
    if (zoomReset) {
      zoomReset.addEventListener('click', () => {
        if (zoomController) {
          zoomController.zoomReset();
        }
        if (dropdownMenu) dropdownMenu.style.display = 'none';
      });
    }
    
    // Toggle cache interception with simplified logic
    if (toggleInterception) {
      toggleInterception.addEventListener('click', async () => {
        if (window.api && window.api.cache) {
          try {
            const isEnabled = toggleInterception.getAttribute('data-enabled') === 'true';
            const newState = !isEnabled;
            
            const result = await window.api.cache.toggleInterception(newState);
            if (result && result.success) {
              toggleInterception.setAttribute('data-enabled', String(newState));
              toggleInterception.textContent = newState ? 
                'Disable Cache Interception' : 
                'Enable Cache Interception';
              notification.show(
                'Cache Interception', 
                `Cache interception ${newState ? 'enabled' : 'disabled'}`,
                'info'
              );
            }
          } catch (error) {
            log(`Error toggling cache interception: ${error.message}`);
          }
        }
        if (dropdownMenu) dropdownMenu.style.display = 'none';
      });
    }
    
    // Clear cache with direct function call
    if (clearCacheMenu) {
      clearCacheMenu.addEventListener('click', async () => {
        if (cacheController && typeof cacheController.clearCache === 'function') {
          try {
            await cacheController.clearCache();
          } catch (error) {
            log(`Error clearing cache: ${error.message}`);
          }
        }
        if (dropdownMenu) dropdownMenu.style.display = 'none';
      });
    }
    
    // Settings menu handler
    if (menuSettings) {
      menuSettings.addEventListener('click', () => {
        if (settingsController && typeof settingsController.showSettingsModal === 'function') {
          try {
            settingsController.showSettingsModal();
          } catch (error) {
            log(`Error showing settings modal: ${error.message}`);
          }
        }
        if (dropdownMenu) dropdownMenu.style.display = 'none';
      });
    }
    
    // Connect print controller to browser controller
    if (browserController && printController && typeof browserController.setPrintHandler === 'function') {
      try {
        browserController.setPrintHandler((webContentsId) => {
          if (printController && typeof printController.showPrintModal === 'function') {
            try {
              printController.showPrintModal(webContentsId);
            } catch (error) {
              log(`Error showing print modal: ${error.message}`);
            }
          }
        });
        log('Print handler connected to browser controller');
      } catch (error) {
        log(`Error setting print handler: ${error.message}`);
      }
    }
    
    // Print button in toolbar
    if (printButton) {
      printButton.addEventListener('click', () => {
        if (browserController && typeof browserController.printCurrentPage === 'function') {
          try {
            browserController.printCurrentPage();
          } catch (error) {
            log(`Error printing current page: ${error.message}`);
          }
        }
      });
    }
    
    // Print menu item handler
    if (printMenuItem) {
      printMenuItem.addEventListener('click', () => {
        if (browserController && typeof browserController.printCurrentPage === 'function') {
          try {
            browserController.printCurrentPage();
          } catch (error) {
            log(`Error printing from menu: ${error.message}`);
          }
        }
        if (dropdownMenu) dropdownMenu.style.display = 'none';
      });
    }
    
    // URL input handling with direct function calls
    if (goButton && urlInput && browserController) {
      goButton.addEventListener('click', () => {
        try {
          const url = urlInput.value.trim();
          if (url) {
            log(`Go button clicked, loading URL: ${url}`);
            browserController.loadUrl(url);
          }
        } catch (error) {
          log(`Error handling go button click: ${error.message}`);
        }
      });
    }
    
    if (urlInput && browserController) {
      urlInput.addEventListener('keydown', (e) => {
        try {
          if (e.key === 'Enter') {
            e.preventDefault();
            const url = urlInput.value.trim();
            if (url) {
              log(`Enter pressed in URL input, loading: ${url}`);
              browserController.loadUrl(url);
            }
          }
        } catch (error) {
          log(`Error handling URL input keydown: ${error.message}`);
        }
      });
    }
    
    // Navigation buttons with direct function calls
    if (backButton && browserController) {
      backButton.addEventListener('click', () => {
        try {
          log('Back button clicked');
          browserController.goBack();
        } catch (error) {
          log(`Error handling back button: ${error.message}`);
        }
      });
    }
    
    if (forwardButton && browserController) {
      forwardButton.addEventListener('click', () => {
        try {
          log('Forward button clicked');
          browserController.goForward();
        } catch (error) {
          log(`Error handling forward button: ${error.message}`);
        }
      });
    }
    
    if (refreshButton && browserController) {
      refreshButton.addEventListener('click', () => {
        try {
          const icon = refreshButton.querySelector('.material-icons');
          if (icon && icon.textContent === 'close') {
            log('Stop button clicked');
            browserController.stop();
          } else {
            log('Refresh button clicked');
            browserController.refresh();
          }
        } catch (error) {
          log(`Error handling refresh button: ${error.message}`);
        }
      });
    }
    
    // Apply settings and load default URL
    try {
      if (settingsController && browserController && window.api && window.api.settings) {
        const response = await window.api.settings.getAll();
        if (response && response.success) {
          const settings = response.settings;
          
          // Apply search engine setting
          if (settings.searchEngine && browserController.setSearchEngine) {
            browserController.setSearchEngine(settings.searchEngine);
            log(`Applied search engine from settings: ${settings.searchEngine}`);
          }
          
          // Load default URL if available
          const defaultUrl = settings.defaultUrl;
          if (defaultUrl && defaultUrl !== 'about:blank') {
            log(`Loading default URL from settings: ${defaultUrl}`);
            if (urlInput) {
              urlInput.value = defaultUrl;
            }
            browserController.loadUrl(defaultUrl);
          }
        }
      }
    } catch (error) {
      log(`Error applying settings: ${error.message}`);
    }
    
    // Make sure webview is initialized
    if (webview && (!webview.src || webview.src === '')) {
      try {
        webview.src = 'about:blank';
        log('Initialized webview with about:blank');
      } catch (error) {
        log(`ERROR initializing webview: ${error.message}`);
      }
    }
    
    // Set up IPC listeners for print requests from the main process
    if (window.api && window.api.on && printController) {
      window.api.on('show-custom-print', (webContentsId) => {
        log(`Show custom print request received for webContentsId: ${webContentsId}`);
        if (printController && typeof printController.showPrintModal === 'function') {
          printController.showPrintModal(webContentsId);
        }
      });
    }
    
    // Register webview for print handling if it's ready
    if (webview) {
      webview.addEventListener('dom-ready', () => {
        if (window.api && window.api.print) {
          window.api.print.registerWebviewForPrint(webview.getWebContentsId())
            .then(result => {
              if (result.success) {
                log('Webview registered for print handling');
              } else {
                log(`Failed to register webview: ${result.error}`);
              }
            })
            .catch(error => {
              log(`Error registering webview: ${error.message}`);
            });
        }
      });
    }
    
    log('Application initialization completed');
  } catch (error) {
    log(`ERROR initializing application: ${error.message}`);
    console.error('Initialization error:', error);
    notification.show('Error', `Application initialization failed: ${error.message}`, 'error');
  }
});

// Added proper error boundary - this replaces the problematic code block that had syntax errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  if (window.notification) {
    window.notification.show('Application Error', 'An unexpected error occurred. Please report this issue.', 'error');
  }
  
  // Prevent the error from propagating
  event.preventDefault();
  
  // Log to main process if API is available
  if (window.api && window.api.log) {
    window.api.log(`Unhandled error: ${event.error?.message || 'Unknown error'}`);
    window.api.log(`Stack trace: ${event.error?.stack || 'No stack trace available'}`);
  }
  
  return true;
});

