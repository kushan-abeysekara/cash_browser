export class DashboardController {
  constructor(authController, notification) {
    this.authController = authController;
    this.notification = notification;
    this.dashboardsListElement = null;
    this.addDashboardButton = null;
    this.dashboardModal = null;
    this.dashboardForm = null;
    this.dashboards = [];
  }

  initialize() {
    this.dashboardsListElement = document.getElementById('dashboards-list');
    this.addDashboardButton = document.getElementById('add-dashboard');
    this.dashboardModal = document.getElementById('dashboard-modal');
    this.dashboardForm = document.getElementById('dashboard-form');
    
    // Set up event listeners
    if (this.addDashboardButton) {
      this.addDashboardButton.addEventListener('click', () => {
        this.showDashboardModal();
      });
    }
    
    if (this.dashboardForm) {
      this.dashboardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleDashboardAdd();
      });
    }
    
    const cancelButton = document.getElementById('cancel-dashboard');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        this.closeDashboardModal();
      });
    }
    
    const closeButton = this.dashboardModal?.querySelector('.close-button');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closeDashboardModal();
      });
    }
    
    // Load stored dashboards
    this.loadDashboards();
  }

  loadDashboards() {
    try {
      // Load from localStorage for now
      const storedDashboards = localStorage.getItem('dashboards');
      if (storedDashboards) {
        this.dashboards = JSON.parse(storedDashboards);
        this.renderDashboards();
      } else {
        this.showEmptyState();
      }
    } catch (error) {
      console.error('Error loading dashboards:', error);
      this.showEmptyState(`Error: ${error.message}`);
    }
  }
  
  saveDashboards() {
    try {
      localStorage.setItem('dashboards', JSON.stringify(this.dashboards));
    } catch (error) {
      console.error('Error saving dashboards:', error);
      this.notification.show('Dashboard Error', `Failed to save dashboards: ${error.message}`, 'error');
    }
  }
  
  renderDashboards() {
    if (!this.dashboardsListElement) return;
    
    // Clear current list
    this.dashboardsListElement.innerHTML = '';
    
    if (this.dashboards.length === 0) {
      this.showEmptyState();
      return;
    }
    
    // Add items to the list
    this.dashboards.forEach((dashboard, index) => {
      const card = document.createElement('div');
      card.className = 'dashboard-card';
      
      const title = document.createElement('h3');
      title.className = 'dashboard-title';
      title.textContent = dashboard.name;
      card.appendChild(title);
      
      const url = document.createElement('div');
      url.className = 'dashboard-url';
      url.textContent = dashboard.url;
      card.appendChild(url);
      
      const footer = document.createElement('div');
      footer.className = 'dashboard-footer';
      
      const openButton = document.createElement('button');
      openButton.className = 'secondary-button';
      openButton.textContent = 'Open';
      openButton.addEventListener('click', () => {
        document.getElementById('browser-tab').click();
        document.getElementById('url-input').value = dashboard.url;
        document.getElementById('go-button').click();
      });
      footer.appendChild(openButton);
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'secondary-button';
      deleteButton.textContent = 'Remove';
      deleteButton.addEventListener('click', () => {
        this.removeDashboard(index);
      });
      footer.appendChild(deleteButton);
      
      card.appendChild(footer);
      
      this.dashboardsListElement.appendChild(card);
    });
  }
  
  showEmptyState(message = 'No dashboards added yet. Click "Add Dashboard" to get started.') {
    if (!this.dashboardsListElement) return;
    
    this.dashboardsListElement.innerHTML = '';
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = message;
    this.dashboardsListElement.appendChild(emptyState);
  }
  
  showDashboardModal() {
    if (this.dashboardModal) {
      this.dashboardModal.style.display = 'flex';
    }
  }
  
  closeDashboardModal() {
    if (this.dashboardModal) {
      this.dashboardModal.style.display = 'none';
    }
    
    // Reset form
    if (this.dashboardForm) {
      this.dashboardForm.reset();
    }
  }
  
  handleDashboardAdd() {
    try {
      const formData = new FormData(this.dashboardForm);
      const dashboard = {
        name: formData.get('name'),
        url: formData.get('url'),
        interval: parseInt(formData.get('interval') || '30', 10) * 1000
      };
      
      // Validate URL
      if (!dashboard.url.startsWith('http://') && !dashboard.url.startsWith('https://')) {
        dashboard.url = 'https://' + dashboard.url;
      }
      
      // Add to dashboards array
      this.dashboards.push(dashboard);
      
      // Save dashboards
      this.saveDashboards();
      
      // Render updated list
      this.renderDashboards();
      
      // Close modal
      this.closeDashboardModal();
      
      // Show notification
      this.notification.show('Dashboard', `Dashboard "${dashboard.name}" added successfully`, 'success');
      
      // Try to connect to dashboard in real-time
      this.connectToDashboard(dashboard);
    } catch (error) {
      console.error('Error adding dashboard:', error);
      this.notification.show('Dashboard Error', `Failed to add dashboard: ${error.message}`, 'error');
    }
  }
  
  removeDashboard(index) {
    try {
      const dashboard = this.dashboards[index];
      
      // Remove from array
      this.dashboards.splice(index, 1);
      
      // Save dashboards
      this.saveDashboards();
      
      // Render updated list
      this.renderDashboards();
      
      // Show notification
      this.notification.show('Dashboard', `Dashboard "${dashboard.name}" removed successfully`, 'success');
      
      // Disconnect from dashboard
      this.disconnectFromDashboard(dashboard);
    } catch (error) {
      console.error('Error removing dashboard:', error);
      this.notification.show('Dashboard Error', `Failed to remove dashboard: ${error.message}`, 'error');
    }
  }
  
  async connectToDashboard(dashboard) {
    try {
      if (!window.api || !window.api.dashboard) {
        throw new Error('Dashboard API not available');
      }
      
      const result = await window.api.dashboard.connectRealtime(dashboard.url);
      
      if (!result || !result.success) {
        console.warn('Failed to connect to dashboard:', result?.message);
      }
    } catch (error) {
      console.error('Error connecting to dashboard:', error);
    }
  }
  
  async disconnectFromDashboard(dashboard) {
    try {
      if (!window.api || !window.api.dashboard) {
        throw new Error('Dashboard API not available');
      }
      
      const result = await window.api.dashboard.disconnectRealtime(dashboard.url);
      
      if (!result || !result.success) {
        console.warn('Failed to disconnect from dashboard:', result?.message);
      }
    } catch (error) {
      console.error('Error disconnecting from dashboard:', error);
    }
  }
  
  handleDashboardUpdate(data) {
    // Handle dashboard updates from the main process
    console.log('Dashboard update received:', data);
    
    // Find matching dashboard and update it
    const dashboard = this.dashboards.find(d => d.url === data.url);
    if (dashboard) {
      dashboard.lastUpdate = new Date().toISOString();
      dashboard.data = data.data;
      
      // Save dashboards
      this.saveDashboards();
      
      // Re-render if we're on the dashboard tab
      if (document.getElementById('dashboard-tab').classList.contains('active')) {
        this.renderDashboards();
      }
      
      // Show notification
      this.notification.show('Dashboard Update', `Dashboard "${dashboard.name}" updated`, 'info');
    }
  }
}
