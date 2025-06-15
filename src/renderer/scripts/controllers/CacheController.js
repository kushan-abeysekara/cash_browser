export class CacheController {
  constructor(notification) {
    this.notification = notification;
    this.cacheListElement = null;
    this.clearCacheButton = null;
  }

  initialize() {
    this.cacheListElement = document.getElementById('cache-list');
    this.clearCacheButton = document.getElementById('clear-cache');
    
    // Set up event listeners
    if (this.clearCacheButton) {
      this.clearCacheButton.addEventListener('click', () => {
        this.clearCache();
      });
    }
    
    // Initial cache list population
    this.refreshCacheList();
  }

  async refreshCacheList() {
    try {
      if (!window.api || !window.api.cache) {
        throw new Error('Cache API not available');
      }
      
      const result = await window.api.cache.getCacheStatus();
      
      if (result && result.success) {
        this.renderCacheList(result.data);
      } else {
        this.showEmptyState('Could not load cache data');
      }
    } catch (error) {
      console.error('Error refreshing cache list:', error);
      this.showEmptyState(`Error: ${error.message}`);
    }
  }
  
  renderCacheList(cacheData) {
    if (!this.cacheListElement) return;
    
    // Clear current list
    this.cacheListElement.innerHTML = '';
    
    const entries = Object.entries(cacheData);
    
    if (entries.length === 0) {
      this.showEmptyState('No cached resources found');
      return;
    }
    
    // Add items to the list
    entries.forEach(([url, data]) => {
      const item = document.createElement('div');
      item.className = 'cache-item';
      
      const info = document.createElement('div');
      info.className = 'cache-info';
      
      const urlElement = document.createElement('div');
      urlElement.className = 'cache-url';
      urlElement.textContent = url;
      info.appendChild(urlElement);
      
      const meta = document.createElement('div');
      meta.className = 'cache-meta';
      const date = new Date(data.timestamp);
      meta.textContent = `Cached on ${date.toLocaleString()}`;
      info.appendChild(meta);
      
      item.appendChild(info);
      
      // Add actions
      const actions = document.createElement('div');
      actions.className = 'cache-actions';
      
      const loadButton = document.createElement('button');
      loadButton.className = 'secondary-button';
      loadButton.textContent = 'Load';
      loadButton.addEventListener('click', () => {
        document.getElementById('browser-tab').click();
        document.getElementById('url-input').value = url;
        document.getElementById('go-button').click();
      });
      actions.appendChild(loadButton);
      
      const deleteButton = document.createElement('button');
      deleteButton.className = 'secondary-button';
      deleteButton.textContent = 'Remove';
      deleteButton.addEventListener('click', () => {
        // Remove item functionality
        this.notification.show('Feature not available', 'Individual cache removal not yet implemented', 'info');
      });
      actions.appendChild(deleteButton);
      
      item.appendChild(actions);
      
      this.cacheListElement.appendChild(item);
    });
  }
  
  showEmptyState(message = 'No cached resources found') {
    if (!this.cacheListElement) return;
    
    this.cacheListElement.innerHTML = '';
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = message;
    this.cacheListElement.appendChild(emptyState);
  }
  
  async clearCache() {
    try {
      if (!window.api || !window.api.cache) {
        throw new Error('Cache API not available');
      }
      
      this.notification.show('Cache', 'Clearing cache...', 'info');
      
      const result = await window.api.cache.clearCache();
      
      if (result && result.success) {
        this.notification.show('Cache', 'Cache cleared successfully', 'success');
        this.refreshCacheList();
      } else {
        this.notification.show('Cache Error', result.message || 'Failed to clear cache', 'error');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      this.notification.show('Cache Error', error.message || 'Failed to clear cache', 'error');
    }
  }
}
