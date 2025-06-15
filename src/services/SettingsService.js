const ElectronStore = require('electron-store');
const path = require('path');
const { app } = require('electron');

class SettingsService {
  constructor() {
    this.store = new ElectronStore({
      name: 'settings',
      cwd: app ? app.getPath('userData') : null
    });
    
    // Default settings
    this.defaultSettings = {
      defaultUrl: 'about:blank',
      cacheEnabled: true,
      cacheDuration: 24, // hours
      autoLogin: false,
      theme: 'light'
    };
  }

  initialize() {
    // Check if settings exist, if not set defaults
    if (!this.store.has('settings')) {
      this.store.set('settings', this.defaultSettings);
    }
  }

  getAllSettings() {
    return this.store.get('settings', this.defaultSettings);
  }

  getSetting(key) {
    const settings = this.getAllSettings();
    return settings[key] !== undefined ? settings[key] : this.defaultSettings[key];
  }

  updateSetting(key, value) {
    const settings = this.getAllSettings();
    settings[key] = value;
    this.store.set('settings', settings);
    return settings;
  }

  updateSettings(newSettings) {
    const settings = this.getAllSettings();
    const updatedSettings = { ...settings, ...newSettings };
    this.store.set('settings', updatedSettings);
    return updatedSettings;
  }

  resetSettings() {
    this.store.set('settings', this.defaultSettings);
    return this.defaultSettings;
  }

  getDefaultUrl() {
    return this.getSetting('defaultUrl');
  }

  setDefaultUrl(url) {
    return this.updateSetting('defaultUrl', url);
  }
}

module.exports = SettingsService;
