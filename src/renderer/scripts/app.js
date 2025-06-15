// Main application script
import { TabController } from './controllers/TabController.js';
import { BrowserController } from './controllers/BrowserController.js';
import { CacheController } from './controllers/CacheController.js';
import { DashboardController } from './controllers/DashboardController.js';
import { AuthController } from './controllers/AuthController.js';
import { SettingsController } from './controllers/SettingsController.js';
import { PrintController } from './controllers/PrintController.js'; // Add this import
import { NotificationService } from './services/NotificationService.js';
import { ZoomController } from './controllers/ZoomController.js'; // New import

// Initialize services
const notification = new NotificationService();

// Initialize controllers
const tabController = new TabController();
let authController, browserController, cacheController, dashboardController, zoomController, settingsController, printController; // Add printController

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
      printController = new PrintController(notification);
      await printController.initialize();
      log('PrintController initialized');
    } catch (error) {
      log(`Error initializing PrintController: ${error.message}`);
      console.error('PrintController init error:', error);
    }
    
    try {
      tabController.initialize();
      log('TabController initialized');
    } catch (error) {
      log(`Error initializing TabController: ${error.message}`);
      console.error('TabController init error:', error);
    }
    
    // Elements
    const urlInput = document.getElementById('url-input');
    const goButton = document.getElementById('go-button');
    const backButton = document.getElementById('back-button');
    const forwardButton = document.getElementById('forward-button');
    const refreshButton = document.getElementById('refresh-button');
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
    
    // Setup dropdown menu toggle
    if (menuButton && dropdownMenu) {
      menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
      });
    
      // Close the dropdown when clicking elsewhere
      document.addEventListener('click', () => {
        if (dropdownMenu) {  // Added null check
          dropdownMenu.classList.remove('show');
        }
      });
    
      // Prevent clicks inside dropdown from closing it
      if (dropdownMenu) {  // Added null check
        dropdownMenu.addEventListener('click', (e) => {
          e.stopPropagation();
        });
      }
    }
    
    // Setup menu item handlers
    if (menuBrowser && dropdownMenu) {
      menuBrowser.addEventListener('click', () => {
        tabController.activateTab('browser-tab');
        dropdownMenu.classList.remove('show');
      });
    }
    
    if (menuCache && dropdownMenu) {
      menuCache.addEventListener('click', () => {
        tabController.activateTab('cache-tab');
        dropdownMenu.classList.remove('show');
      });
    }
    
    if (menuDashboard && dropdownMenu) {
      menuDashboard.addEventListener('click', () => {
        tabController.activateTab('dashboard-tab');
        dropdownMenu.classList.remove('show');
      });
    }
    
    // Zoom controls
    if (zoomIn && dropdownMenu) {
      zoomIn.addEventListener('click', () => {
        zoomController.zoomIn();
        dropdownMenu.classList.remove('show');
      });
    }
    
    if (zoomOut && dropdownMenu) {
      zoomOut.addEventListener('click', () => {
        zoomController.zoomOut();
        dropdownMenu.classList.remove('show');
      });
    }
    
    if (zoomReset && dropdownMenu) {
      zoomReset.addEventListener('click', () => {
        zoomController.zoomReset();
        dropdownMenu.classList.remove('show');
      });
    }
    
    // Toggle cache interception
    if (toggleInterception && dropdownMenu) {
      toggleInterception.addEventListener('click', async () => {
        if (window.api && window.api.cache) {
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
        }
        dropdownMenu.classList.remove('show');
      });
    }
    
    // Clear cache from menu
    if (clearCacheMenu && dropdownMenu) {
      clearCacheMenu.addEventListener('click', async () => {
        await cacheController.clearCache();
        dropdownMenu.classList.remove('show');
      });
    }
    
    // Print menu item handler
    if (printMenuItem && dropdownMenu) {
      printMenuItem.addEventListener('click', () => {
        if (browserController && browserController.webview) {
          dropdownMenu.classList.remove('show');
          // Show print dialog with webview ID for printing
          printController.showPrintModal(browserController.webview.getWebContentsId());
        }
      });
    }
    
    // Print shortcut listener
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'p') {
        e.preventDefault(); // Prevent default print dialog
        if (browserController && browserController.webview) {
          // Show print dialog with webview ID for printing
          printController.showPrintModal(browserController.webview.getWebContentsId());
        }
      }
    });

    // Setup URL input handling
    if (goButton && urlInput) {
      goButton.addEventListener('click', () => {
        const url = urlInput.value.trim();
        if (url) {
          log(`Go button clicked, loading URL: ${url}`);
          browserController.loadUrl(url);
        }
      });
    }
    
    if (urlInput) {
      urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault(); // Prevent default form submission
          const url = urlInput.value.trim();
          if (url) {
            log(`Enter pressed in URL input, loading: ${url}`);
            browserController.loadUrl(url);
          }
        }
      });
    }
    
    // Setup navigation buttons
    if (backButton) {
      backButton.addEventListener('click', () => {
        log('Back button clicked');
        browserController.goBack();
      });
    }
    
    if (forwardButton) {
      forwardButton.addEventListener('click', () => {
        log('Forward button clicked');
        browserController.goForward();
      });
    }
    
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        const icon = refreshButton.querySelector('.material-icons');
        if (icon && icon.textContent === 'close') {
          log('Stop button clicked');
          browserController.stop();
        } else {
          log('Refresh button clicked');
          browserController.refresh();
        }
      });
    }

    // Set up listener for dashboard data updates
    if (window.api && window.api.on) {
      window.api.on('dashboard-update', (data) => {
        log('Dashboard data update received');
        dashboardController.handleDashboardUpdate(data);
      });
    } else {
      log('ERROR: API not available or on method not found');
    }
    
    // Update navigation button states
    function updateNavigationButtons() {
      if (webview) {
        if (backButton) backButton.disabled = !webview.canGoBack();
        if (forwardButton) forwardButton.disabled = !webview.canGoForward();
      }
    }
    
    // Check if there's a stored session
    if (authController && typeof authController.checkStoredSessions === 'function') {
      authController.checkStoredSessions();
    }

    try {
      // Fix webview load issues by ensuring proper initialization
      // Initial load of about:blank if webview is empty
      if (webview && (!webview.src || webview.src === '')) {
        webview.src = 'about:blank';
        log('Initialized webview with about:blank');
      }
      
      // Initialize cache interception state
      if (toggleInterception) {
        toggleInterception.setAttribute('data-enabled', 'false');
      }
    } catch (error) {
      log(`ERROR initializing webview: ${error.message}`);
    }
    
    // Handle loadUrl events directly to ensure the webview loads URLs correctly
    try {
      if (window.api && webview) {
        // Set up proper error handling for webview
        webview.addEventListener('did-fail-load', (e) => {
          if (e.errorCode !== -3) { // Ignore ERR_ABORTED as it's usually just navigation changes
            log(`Page load failed: ${e.errorDescription}`);
          }
        });

        webview.addEventListener('dom-ready', () => {
          log('Webview DOM ready');
        });
      }
      
      log('Application initialization completed');
    } catch (error) {
      log(`ERROR initializing application: ${error.message}`);
      console.error('Initialization error:', error);
      notification.show('Error', `Application initialization failed: ${error.message}`, 'error');
    }
  } catch (error) {
    log(`ERROR initializing application: ${error.message}`);
    console.error('Initialization error:', error);
    notification.show('Error', `Application initialization failed: ${error.message}`, 'error');
  }
});

