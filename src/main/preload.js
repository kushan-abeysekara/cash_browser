const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Cache operations
  cache: {
    fetchUrl: (url) => ipcRenderer.invoke('cache:fetch-url', url),
    clearCache: () => ipcRenderer.invoke('cache:clear'),
    getCacheStatus: () => ipcRenderer.invoke('cache:status'),
    toggleInterception: (enabled) => ipcRenderer.invoke('cache:toggle-interception', enabled),
  },
  
  // Authentication operations
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    checkSession: (url) => ipcRenderer.invoke('auth:check-session', url),
  },
  
  // Dashboard operations
  dashboard: {
    connectRealtime: (dashboardUrl) => ipcRenderer.invoke('dashboard:connect-realtime', dashboardUrl),
    disconnectRealtime: (dashboardUrl) => ipcRenderer.invoke('dashboard:disconnect-realtime', dashboardUrl),
    fetchData: (params) => ipcRenderer.invoke('dashboard:fetch-data', params),
    startPolling: (params) => ipcRenderer.invoke('dashboard:start-polling', params),
    stopPolling: (params) => ipcRenderer.invoke('dashboard:stop-polling', params),
  },
  
  // Settings operations
  settings: {
    getAll: () => ipcRenderer.invoke('settings:get-all'),
    get: (key) => ipcRenderer.invoke('settings:get', key),
    update: (key, value) => ipcRenderer.invoke('settings:update', { key, value }),
    updateAll: (settings) => ipcRenderer.invoke('settings:update-all', settings),
    getDefaultUrl: () => ipcRenderer.invoke('settings:get-default-url'),
  },
  
  // Print operations
  print: {
    execute: (options) => ipcRenderer.invoke('print:execute', options),
    toPdf: (options) => ipcRenderer.invoke('print:to-pdf', options),
    preview: (options) => ipcRenderer.invoke('print:preview', options),
    registerWebview: (webContentsId) => ipcRenderer.invoke('print:register-webview', webContentsId),
    unregisterWebview: (webContentsId) => ipcRenderer.invoke('print:unregister-webview', webContentsId),
  },
  
  // Shell operations
  shell: {
    openPath: (path) => ipcRenderer.invoke('shell:open-path', path),
    openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  },
  
  // Logging
  log: (message) => ipcRenderer.invoke('log', message),
  
  // Event listeners
  on: (channel, callback) => {
    // Whitelist channels
    const validChannels = [
      'cache:updated', 
      'auth:state-changed', 
      'dashboard:data-update',
      'show-custom-print',
      'settings:updated'
    ];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender` 
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      
      // Return a function to remove this event listener
      return () => ipcRenderer.removeListener(channel, subscription);
    }
    return null;
  }
});

// Log that preload is completed
console.log('Preload script executed successfully');
console.log('Preload script executed successfully');
