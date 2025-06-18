const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const CacheManager = require('../services/CacheManager');
const AuthService = require('../services/AuthService');
const ResourceInterceptor = require('../services/ResourceInterceptor');
const DashboardService = require('../services/DashboardService');
const SettingsService = require('../services/SettingsService');
const PrintService = require('../services/PrintService');

// Services initialization
const cacheManager = new CacheManager();
const authService = new AuthService();
const resourceInterceptor = new ResourceInterceptor(cacheManager);
const dashboardService = new DashboardService(authService);
const settingsService = new SettingsService();
const printService = new PrintService();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

async function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true, // Explicitly enable webview tag
      sandbox: false // Required for webview to work properly
    },
    title: 'Cash Browser'
  });

  // Load the app's UI
  await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Disable webview security warnings
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1';

  // Initialize cache directory if it doesn't exist
  const cacheDir = path.join(app.getPath('userData'), 'cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  await cacheManager.initialize();
  
  // Initialize services
  settingsService.initialize();
  printService.initialize();
  
  // Initially disable resource interception for regular browsing
  resourceInterceptor.setEnabled(false);
  await resourceInterceptor.setup(session.defaultSession);
  
  // Initialize dashboard service
  dashboardService.initialize();
  
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) createWindow();
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handlers for renderer process communication
ipcMain.handle('cache:fetch-url', async (_event, url) => {
  try {
    return await cacheManager.fetchAndCache(url);
  } catch (error) {
    console.error('Error fetching URL:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache:status', async () => {
  try {
    // Return a count of cached pages and their total size
    return { success: true, data: cacheManager.cacheManifest };
  } catch (error) {
    console.error('Error getting cache status:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache:toggle-interception', async (_event, enabled) => {
  try {
    resourceInterceptor.setEnabled(enabled);
    return { success: true, enabled };
  } catch (error) {
    console.error('Error toggling interception:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:login', async (_event, credentials) => {
  try {
    return await authService.login(credentials);
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:check-session', async (_event, url) => {
  try {
    return await authService.checkSession(url || '');
  } catch (error) {
    console.error('Session check error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:logout', async () => {
  try {
    return await authService.logout();
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache:clear', async () => {
  try {
    return await cacheManager.clearCache();
  } catch (error) {
    console.error('Error clearing cache:', error);
    return { success: false, error: error.message };
  }
});

// Dashboard API handlers
ipcMain.handle('dashboard:fetch-data', async (_event, { url, endpoint }) => {
  try {
    return await dashboardService.fetchDashboardData(url, endpoint);
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('dashboard:start-polling', async (_event, { url, endpoint, interval }) => {
  try {
    return await dashboardService.startPolling(url, endpoint, interval);
  } catch (error) {
    console.error('Dashboard polling start error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('dashboard:stop-polling', async (_event, { url, endpoint }) => {
  try {
    return await dashboardService.stopPolling(url, endpoint);
  } catch (error) {
    console.error('Dashboard polling stop error:', error);
    return { success: false, error: error.message };
  }
});

// Add settings IPC handlers
ipcMain.handle('settings:get-all', async () => {
  try {
    return { 
      success: true, 
      settings: settingsService.getAllSettings() 
    };
  } catch (error) {
    console.error('Error getting settings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:get', async (_event, key) => {
  try {
    return { 
      success: true, 
      value: settingsService.getSetting(key) 
    };
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:update', async (_event, { key, value }) => {
  try {
    const settings = settingsService.updateSetting(key, value);
    return { success: true, settings };
  } catch (error) {
    console.error(`Error updating setting ${key}:`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('settings:update-all', async (_event, settings) => {
  try {
    const updatedSettings = settingsService.updateSettings(settings);
    return { success: true, settings: updatedSettings };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { success: false, error: error.message };
  }
});

// Get default URL
ipcMain.handle('settings:get-default-url', async () => {
  try {
    return { 
      success: true, 
      url: settingsService.getDefaultUrl() 
    };
  } catch (error) {
    console.error('Error getting default URL:', error);
    return { success: false, error: error.message };
  }
});

// Register webview for print handling
ipcMain.handle('register-webview-for-print', async (event, webContentsId) => {
  try {
    console.log('Registering webview for print capture:', webContentsId);
    
    const allWebContents = require('electron').webContents.getAllWebContents();
    const webContents = allWebContents.find(wc => wc.id === webContentsId);
    
    if (!webContents) {
      console.error('WebContents not found for ID:', webContentsId);
      return { success: false, error: 'WebContents not found' };
    }
    
    // Block print dialog
    webContents.on('print', (printEvent) => {
      printEvent.preventDefault();
      console.log('Print event intercepted from webContentsId:', webContentsId);
      
      // Send message to renderer to show custom print dialog
      event.sender.send('show-custom-print', webContentsId);
    });
    
    // Also handle Ctrl+P
    webContents.on('before-input-event', (inputEvent, input) => {
      if (input.control && input.key.toLowerCase() === 'p' && input.type === 'keyDown') {
        inputEvent.preventDefault();
        console.log('Ctrl+P intercepted from webContentsId:', webContentsId);
        
        // Send message to renderer to show custom print dialog
        event.sender.send('show-custom-print', webContentsId);
      }
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error registering webview for print:', error);
    return { success: false, error: error.message };
  }
});

// Add a new IPC handler for logging from the renderer process
ipcMain.handle('log', (_event, message) => {
  console.log('Renderer log:', message);
  return { success: true };
});

// Dashboard WebSocket connection handler (if needed)
function setupDashboardSocket(dashboardUrl) {
  // This would be implemented if WebSocket functionality is needed
  // socket.on('dashboardUpdate', (data) => {
  //   if (mainWindow) {
  //     mainWindow.webContents.send('dashboard:data-update', { url: dashboardUrl, data });
  //   }
  // });
}
// ...existing code...

      const intervalId = setInterval(async () => {
        const data = await this.fetchDashboardData(url, endpoint);
        if (data.success) {
          // Send data to renderer
          if (mainWindow) {
            mainWindow.webContents.send('dashboard:data-update', { 
              url, 
              endpoint, 
              data: data.data,
              polled: true
            });
          }
        }
      }, interval);
    } catch (error) {
      console.error('Error starting dashboard polling:', error);
      return { success: false, error: error.message };
    }
  }
  
  async stopPolling(url, endpoint) {
    try {
      const key = this.getPollingKey(url, endpoint);
      const intervalId = this.pollingIntervals[key];
      
      if (intervalId) {
        clearInterval(intervalId);
        delete this.pollingIntervals[key];
        
        console.log(`Stopped polling for ${url}${endpoint ? ' ' + endpoint : ''}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error stopping dashboard polling:', error);
      return { success: false, error: error.message };
    }
  }
}
