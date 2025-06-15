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
const authController = new AuthController(notification);
const browserController = new BrowserController(authController, notification);
const cacheController = new CacheController(notification);
const dashboardController = new DashboardController(authController, notification);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Setup tab navigation
  tabController.initialize();
  
  // Initialize controllers
  browserController.initialize();
  cacheController.initialize();
  dashboardController.initialize();
  authController.initialize();
  
  // Setup URL input handling
  const urlInput = document.getElementById('url-input');
  const goButton = document.getElementById('go-button');
  
  goButton.addEventListener('click', () => {
    const url = urlInput.value.trim();
    if (url) {
      browserController.loadUrl(url);
    } else {
      notification.show('Error', 'Please enter a valid URL', 'error');
    }
  });
  
  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      goButton.click();
    }
  });
  
  // Setup settings button
  const settingsButton = document.getElementById('settings-button');
  settingsButton.addEventListener('click', () => {
    // Open settings modal or panel (to be implemented)
    notification.show('Notice', 'Settings feature coming soon', 'info');
  });
  
  // Listen for cache updates
  window.api.on('cache:updated', (data) => {
    cacheController.refreshCacheList();
  });
  
  // Listen for dashboard updates
  window.api.on('dashboard:data-update', (data) => {
    dashboardController.handleDashboardUpdate(data);
  });
  
  // Check if there's a stored session
  authController.checkStoredSessions();
  
  // Elements
  const webview = document.getElementById('web-view');
  const backButton = document.getElementById('back-button');
  const forwardButton = document.getElementById('forward-button');
  const refreshButton = document.getElementById('refresh-button');
  const browserTab = document.getElementById('browser-tab');
  const cacheTab = document.getElementById('cache-tab');
  const dashboardTab = document.getElementById('dashboard-tab');
  const browserContent = document.getElementById('browser-content');
  const cacheContent = document.getElementById('cache-content');
  const dashboardContent = document.getElementById('dashboard-content');

  // Tab navigation
  browserTab.addEventListener('click', () => switchTab('browser'));
  cacheTab.addEventListener('click', () => switchTab('cache'));
  dashboardTab.addEventListener('click', () => switchTab('dashboard'));

  function switchTab(tab) {
    // Remove active class from all tabs and content
    browserTab.classList.remove('active');
    cacheTab.classList.remove('active');
    dashboardTab.classList.remove('active');
    browserContent.classList.remove('active');
    cacheContent.classList.remove('active');
    dashboardContent.classList.remove('active');
    
    // Add active class to selected tab and content
    if (tab === 'browser') {
      browserTab.classList.add('active');
      browserContent.classList.add('active');
    } else if (tab === 'cache') {
      cacheTab.classList.add('active');
      cacheContent.classList.add('active');
    } else if (tab === 'dashboard') {
      dashboardTab.classList.add('active');
      dashboardContent.classList.add('active');
    }
  }

  // Browser navigation functions
  function loadURL(url) {
    // Check if the URL has a protocol, add https:// if not
    if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    
    if (url) {
      webview.src = url;
      urlInput.value = url;
    }
  }

  // Navigation button handlers
  goButton.addEventListener('click', () => {
    loadURL(urlInput.value);
  });

  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loadURL(urlInput.value);
    }
  });

  backButton.addEventListener('click', () => {
    if (webview.canGoBack()) {
      webview.goBack();
    }
  });

  forwardButton.addEventListener('click', () => {
    if (webview.canGoForward()) {
      webview.goForward();
    }
  });

  refreshButton.addEventListener('click', () => {
    webview.reload();
  });

  // Webview event listeners
  webview.addEventListener('did-start-loading', () => {
    refreshButton.querySelector('.material-icons').textContent = 'close';
  });

  webview.addEventListener('did-stop-loading', () => {
    refreshButton.querySelector('.material-icons').textContent = 'refresh';
    urlInput.value = webview.getURL();
    updateNavigationButtons();
  });

  webview.addEventListener('did-navigate', (event) => {
    urlInput.value = event.url;
    updateNavigationButtons();
  });

  webview.addEventListener('did-navigate-in-page', () => {
    updateNavigationButtons();
  });

  // Update navigation button states
  function updateNavigationButtons() {
    backButton.disabled = !webview.canGoBack();
    forwardButton.disabled = !webview.canGoForward();
  }

  // Initialize with about:blank
  webview.src = 'about:blank';
});
