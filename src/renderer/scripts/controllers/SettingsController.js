export class SettingsController {
  constructor(notification) {
    this.notification = notification;
    this.settingsModal = null;
    this.settingsForm = null;
    this.currentSettings = {};
    this.isInitialized = false;
  }

  async initialize() {
    this.settingsModal = document.getElementById('settings-modal');
    this.settingsForm = document.getElementById('settings-form');
    
    // Add null checks before accessing elements
    if (!this.settingsModal) {
      console.error('Settings modal element not found');
      return;
    }
    
    const cancelButton = document.getElementById('cancel-settings');
    const closeButton = this.settingsModal.querySelector('.close-button');
    
    // Set up event listeners with null checks
    if (this.settingsForm) {
      this.settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.saveSettings();
      });
    }
    
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        this.closeSettingsModal();
      });
    }
    
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closeSettingsModal();
      });
    }
    
    // Add menu item click handler
    const settingsMenuItem = document.getElementById('menu-settings');
    if (settingsMenuItem) {
      settingsMenuItem.addEventListener('click', () => {
        this.showSettingsModal();
      });
    }
    
    // Load current settings
    await this.loadSettings();
    
    this.isInitialized = true;
  }
  
  async loadSettings() {
    try {
      if (!window.api || !window.api.settings) {
        throw new Error('Settings API not available');
      }
      
      const response = await window.api.settings.getAll();
      if (response && response.success) {
        this.currentSettings = response.settings;
        this.populateSettingsForm();
      } else {
        this.notification.show('Settings Error', 'Failed to load settings', 'error');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.notification.show('Settings Error', error.message || 'Failed to load settings', 'error');
    }
  }
  
  populateSettingsForm() {
    if (!this.settingsForm) return;
    
    // Populate default URL
    const defaultUrlInput = this.settingsForm.querySelector('#default-url');
    if (defaultUrlInput) {
      defaultUrlInput.value = this.currentSettings.defaultUrl || '';
    }
    
    // Populate other settings as they are added in the future
    const cacheEnabledInput = this.settingsForm.querySelector('#cache-enabled');
    if (cacheEnabledInput) {
      cacheEnabledInput.checked = !!this.currentSettings.cacheEnabled;
    }
    
    const cacheDurationInput = this.settingsForm.querySelector('#cache-duration');
    if (cacheDurationInput) {
      cacheDurationInput.value = this.currentSettings.cacheDuration || 24;
    }
  }
  
  async saveSettings() {
    try {
      if (!window.api || !window.api.settings) {
        throw new Error('Settings API not available');
      }
      
      const formData = new FormData(this.settingsForm);
      const newSettings = {
        defaultUrl: formData.get('defaultUrl') || 'about:blank'
      };
      
      // Add cache settings if they exist
      const cacheEnabledInput = this.settingsForm.querySelector('#cache-enabled');
      if (cacheEnabledInput) {
        newSettings.cacheEnabled = cacheEnabledInput.checked;
      }
      
      const cacheDurationInput = this.settingsForm.querySelector('#cache-duration');
      if (cacheDurationInput) {
        newSettings.cacheDuration = parseInt(cacheDurationInput.value, 10) || 24;
      }
      
      const response = await window.api.settings.updateAll(newSettings);
      
      if (response && response.success) {
        this.currentSettings = response.settings;
        this.notification.show('Settings', 'Settings saved successfully', 'success');
        this.closeSettingsModal();
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('settings:updated', { 
          detail: { settings: this.currentSettings } 
        }));
      } else {
        this.notification.show('Settings Error', 'Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      this.notification.show('Settings Error', error.message || 'Failed to save settings', 'error');
    }
  }
  
  showSettingsModal() {
    if (this.settingsModal) {
      this.loadSettings(); // Refresh settings before showing modal
      this.settingsModal.style.display = 'flex';
    }
  }
  
  closeSettingsModal() {
    if (this.settingsModal) {
      this.settingsModal.style.display = 'none';
    }
  }
  
  async getDefaultUrl() {
    try {
      if (!window.api || !window.api.settings) {
        throw new Error('Settings API not available');
      }
      
      const response = await window.api.settings.getDefaultUrl();
      return response && response.success ? response.url : 'about:blank';
    } catch (error) {
      console.error('Error getting default URL:', error);
      return 'about:blank';
    }
  }
}
