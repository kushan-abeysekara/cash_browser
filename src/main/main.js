const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const CacheManager = require('../services/CacheManager');
const AuthService = require('../services/AuthService');
const ResourceInterceptor = require('../services/ResourceInterceptor');
const DashboardService = require('../services/DashboardService');

// Services initialization
const cacheManager = new CacheManager();
const authService = new AuthService();
const resourceInterceptor = new ResourceInterceptor(cacheManager);
const dashboardService = new DashboardService(authService);

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
ipcMain.handle('cache:fetch-url', async (event, url) => {
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

ipcMain.handle('cache:toggle-interception', async (event, enabled) => {
  try {
    resourceInterceptor.setEnabled(enabled);
    return { success: true, enabled };
  } catch (error) {
    console.error('Error toggling interception:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:login', async (event, credentials) => {
  try {
    return await authService.login(credentials);
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:check-session', async (event, url) => {
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

// Dashboard IPC handlers
ipcMain.handle('dashboard:connect-realtime', async (event, dashboardUrl) => {
  try {
    return await dashboardService.connectToDashboard(dashboardUrl);
  } catch (error) {
    console.error('Dashboard connection error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('dashboard:disconnect-realtime', async (event, dashboardUrl) => {
  try {
    return await dashboardService.disconnectFromDashboard(dashboardUrl);
  } catch (error) {
    console.error('Dashboard disconnect error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('dashboard:fetch-data', async (event, { url, endpoint }) => {
  try {
    return await dashboardService.fetchDashboardData(url, endpoint);
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('dashboard:start-polling', async (event, { url, endpoint, interval }) => {
  try {
    return await dashboardService.startPolling(url, endpoint, interval);
  } catch (error) {
    console.error('Dashboard polling start error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('dashboard:stop-polling', async (event, { url, endpoint }) => {
  try {
    return await dashboardService.stopPolling(url, endpoint);
  } catch (error) {
    console.error('Dashboard polling stop error:', error);
    return { success: false, error: error.message };
  }
});

// Add a new IPC handler for logging from the renderer process
ipcMain.handle('log', (event, message) => {
  console.log('Renderer log:', message);
  return { success: true };
});
