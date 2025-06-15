const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const CacheManager = require('../services/CacheManager');
const AuthService = require('../services/AuthService');
const ResourceInterceptor = require('../services/ResourceInterceptor');

// Services initialization
const cacheManager = new CacheManager();
const authService = new AuthService();
const resourceInterceptor = new ResourceInterceptor(cacheManager);

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
      preload: path.join(__dirname, 'preload.js')
    }
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
  await resourceInterceptor.setup(session.defaultSession);
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
    throw error;
  }
});

ipcMain.handle('auth:login', async (event, credentials) => {
  try {
    return await authService.login(credentials);
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
});

ipcMain.handle('cache:clear', async () => {
  try {
    return await cacheManager.clearCache();
  } catch (error) {
    console.error('Error clearing cache:', error);
    throw error;
  }
});
