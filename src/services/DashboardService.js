const { io } = require('socket.io-client');
const { ipcMain } = require('electron');
const axios = require('axios');

class DashboardService {
  constructor(authService) {
    this.authService = authService;
    this.activeSockets = new Map();
    this.pollingIntervals = new Map();
  }

  initialize() {
    // IPC handlers are registered in main.js, no need to duplicate them here
    console.log('DashboardService initialized');
  }

  async connectToDashboard(dashboardUrl) {
    try {
      // Check if we already have a connection
      if (this.activeSockets.has(dashboardUrl)) {
        return { success: true, message: 'Already connected to dashboard' };
      }
      
      // Check if we have a valid session for this URL
      const sessionCheck = await this.authService.checkSession(dashboardUrl);
      if (!sessionCheck.valid) {
        return { success: false, message: 'No valid session for this dashboard' };
      }
      
      // Try to determine socket.io endpoint
      const socketEndpoint = `${dashboardUrl}/socket.io`;
      
      // Create socket connection with auth token
      const socket = io(socketEndpoint, {
        extraHeaders: {
          Authorization: `Bearer ${sessionCheck.session.token}`
        },
        reconnection: true,
        reconnectionAttempts: 5
      });
      
      // Set up event listeners
      socket.on('connect', () => {
        console.log(`Connected to dashboard at ${dashboardUrl}`);
      });
      
      socket.on('dashboardUpdate', (data) => {
        // Forward dashboard updates to renderer process
        ipcMain.emit('dashboard:data-update', { url: dashboardUrl, data });
      });
      
      socket.on('error', (error) => {
        console.error(`Dashboard socket error for ${dashboardUrl}:`, error);
      });
      
      socket.on('disconnect', () => {
        console.log(`Disconnected from dashboard at ${dashboardUrl}`);
      });
      
      // Store the socket connection
      this.activeSockets.set(dashboardUrl, socket);
      
      return { success: true, message: 'Connected to dashboard' };
    } catch (error) {
      console.error(`Error connecting to dashboard ${dashboardUrl}:`, error);
      return { success: false, error: error.message };
    }
  }

  async disconnectFromDashboard(dashboardUrl) {
    try {
      if (!this.activeSockets.has(dashboardUrl)) {
        return { success: false, message: 'Not connected to this dashboard' };
      }
      
      const socket = this.activeSockets.get(dashboardUrl);
      socket.disconnect();
      this.activeSockets.delete(dashboardUrl);
      
      // Also stop any polling for this dashboard
      for (const [key, interval] of this.pollingIntervals.entries()) {
        if (key.startsWith(dashboardUrl)) {
          clearInterval(interval);
          this.pollingIntervals.delete(key);
        }
      }
      
      return { success: true, message: 'Disconnected from dashboard' };
    } catch (error) {
      console.error(`Error disconnecting from dashboard ${dashboardUrl}:`, error);
      return { success: false, error: error.message };
    }
  }

  async fetchDashboardData(url, endpoint) {
    try {
      // Check if we have a valid session for this URL
      const sessionCheck = await this.authService.checkSession(url);
      if (!sessionCheck.valid) {
        return { success: false, message: 'No valid session for this dashboard' };
      }
      
      // Make API request with auth token
      const response = await axios.get(`${url}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${sessionCheck.session.token}`
        }
      });
      
      return { 
        success: true, 
        data: response.data 
      };
    } catch (error) {
      console.error(`Error fetching dashboard data from ${url}${endpoint}:`, error);
      return { success: false, error: error.message };
    }
  }

  async startPolling(url, endpoint, interval = 30000) {
    try {
      const key = this.getPollingKey(url, endpoint);
      
      // Stop existing polling if any
      if (this.pollingIntervals[key]) {
        clearInterval(this.pollingIntervals[key]);
      }
      
      console.log(`Starting polling for ${url}${endpoint ? ' ' + endpoint : ''} every ${interval}ms`);
      
      const intervalId = setInterval(async () => {
        const data = await this.fetchDashboardData(url, endpoint);
        if (data.success) {
          // Send data to renderer
          const { BrowserWindow } = require('electron');
          const mainWindow = BrowserWindow.getFocusedWindow();
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
      
      this.pollingIntervals[key] = intervalId;
      
      return { success: true };
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

  getPollingKey(url, endpoint) {
    return `${url}${endpoint || ''}`;
  }
}

module.exports = DashboardService;
