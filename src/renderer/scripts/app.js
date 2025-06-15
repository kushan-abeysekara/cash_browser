// Main application script
import { TabController } from './controllers/TabController.js';
import { BrowserController } from './controllers/BrowserController.js';
import { CacheController } from './controllers/CacheController.js';
import { DashboardController } from './controllers/DashboardController.js';
import { AuthController } from './controllers/AuthController.js';
import { NotificationService } from './services/NotificationService.js';

// Initialize services
const notification = new NotificationService();

// Initialize controllers
const tabController = new TabController();
let authController, browserController, cacheController, dashboardController;

// Helper function to log to both console and main process
function log(message) {
  console.log(message);
  if (window.api && window.api.log) {
    window.api.log(message);
  }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  log('DOM loaded, initializing application...');
  
  try {
    // Initialize controllers
    authController = new AuthController(notification);
    browserController = new BrowserController(authController, notification);
    cacheController = new CacheController(notification);
    dashboardController = new DashboardController(authController, notification);
    
    // Setup tab navigation
    tabController.initialize();
    log('TabController initialized');
    
    // Initialize controllers
    browserController.initialize();
    log('BrowserController initialized');
    
    cacheController.initialize();
    log('CacheController initialized');
    
    dashboardController.initialize();
    log('DashboardController initialized');
    
    authController.initialize();
    log('AuthController initialized');
    
    // Elements
    const urlInput = document.getElementById('url-input');
    const goButton = document.getElementById('go-button');
    const backButton = document.getElementById('back-button');
    const forwardButton = document.getElementById('forward-button');
    const refreshButton = document.getElementById('refresh-button');
    const settingsButton = document.getElementById('settings-button');
    
    // Setup URL input handling
    goButton.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (url) {
        log(`Go button clicked, loading URL: ${url}`);
        browserController.loadUrl(url);
      }
    });
    
    urlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const url = urlInput.value.trim();
        if (url) {
          log(`Enter pressed in URL input, loading: ${url}`);
          browserController.loadUrl(url);
        }
      }
    });
    
    // Setup navigation buttons
    backButton.addEventListener('click', () => {
      log('Back button clicked');
      browserController.goBack();
    });
    
    forwardButton.addEventListener('click', () => {
      log('Forward button clicked');
      browserController.goForward();
    });
    
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
    
    // Setup settings button
    settingsButton.addEventListener('click', () => {
      // Open settings modal or panel
      notification.show('Notice', 'Settings feature coming soon', 'info');
    });
    
    // Listen for webview events to update UI
    const webview = document.getElementById('web-view');
    if (webview) {
      webview.addEventListener('did-start-loading', () => {
        log('Webview started loading');
        const icon = refreshButton.querySelector('.material-icons');
        if (icon) icon.textContent = 'close';
      });
      
      webview.addEventListener('did-stop-loading', () => {
        log('Webview stopped loading');
        const icon = refreshButton.querySelector('.material-icons');
        if (icon) icon.textContent = 'refresh';
        updateNavigationButtons();
      });
      
      webview.addEventListener('did-navigate', (event) => {
        log(`Webview navigated to: ${event.url}`);
        urlInput.value = event.url;
        updateNavigationButtons();
      });
      
      webview.addEventListener('did-navigate-in-page', () => {
        log('Webview navigated in page');
        updateNavigationButtons();
      });
    } else {
      log('ERROR: Webview element not found!');
    }
    
    // Listen for cache updates
    if (window.api && window.api.on) {
      window.api.on('cache:updated', (data) => {
        log('Cache updated event received');
        cacheController.refreshCacheList();
      });
      
      // Listen for dashboard updates
      window.api.on('dashboard:data-update', (data) => {
        log('Dashboard data update received');
        dashboardController.handleDashboardUpdate(data);
      });
    } else {
      log('ERROR: API not available or on method not found');
    }
    
    // Update navigation button states
    function updateNavigationButtons() {
      if (webview) {
        backButton.disabled = !webview.canGoBack();
        forwardButton.disabled = !webview.canGoForward();
      }
    }
    
    // Check if there's a stored session
    if (authController && typeof authController.checkStoredSessions === 'function') {
      authController.checkStoredSessions();
    }
    
    // Initialize webview with about:blank
    if (webview && webview.src !== 'about:blank') {
      webview.src = 'about:blank';
    }
    
    log('Application initialization completed');
  } catch (error) {
    log(`ERROR initializing application: ${error.message}`);
    console.error('Initialization error:', error);
  }
});

