const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  // Cache operations
  cache: {
    fetchUrl: (url) => ipcRenderer.invoke('cache:fetch-url', url),
    clearCache: () => ipcRenderer.invoke('cache:clear'),
    getCacheStatus: () => ipcRenderer.invoke('cache:status'),
  },
  
  // Authentication operations
  auth: {
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    logout: () => ipcRenderer.invoke('auth:logout'),
    checkSession: () => ipcRenderer.invoke('auth:check-session'),
  },
  
  // Dashboard operations
  dashboard: {
    connectRealtime: (dashboardUrl) => ipcRenderer.invoke('dashboard:connect-realtime', dashboardUrl),
    disconnectRealtime: () => ipcRenderer.invoke('dashboard:disconnect-realtime'),
  },
  
  // Event listeners
  on: (channel, callback) => {
    // Whitelist channels
    const validChannels = ['cache:updated', 'auth:state-changed', 'dashboard:data-update'];
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
