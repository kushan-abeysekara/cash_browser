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
});
