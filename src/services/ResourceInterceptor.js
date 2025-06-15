const { URL } = require('url');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

class ResourceInterceptor {
  constructor(cacheManager) {
    this.cacheManager = cacheManager;
    this.interceptedDomains = new Set();
  }

  async setup(session) {
    // Set up protocol interception
    session.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*'] },
      (details, callback) => {
        this.handleRequest(details, callback);
      }
    );
    
    console.log('Resource interceptor initialized');
  }

  async handleRequest(details, callback) {
    const url = details.url;
    const urlObj = new URL(url);
    
    // Skip interception for certain domains or conditions
    if (this.shouldSkipInterception(url)) {
      return callback({});
    }
    
    // Check if this resource is cached
    if (this.cacheManager.isCached(url)) {
      const cachedPath = this.cacheManager.getCachedPath(url);
      
      if (cachedPath && fs.existsSync(cachedPath)) {
        // Use cached version
        return callback({ 
          redirectURL: `file://${cachedPath}`
        });
      }
    }
    
    // If not cached or cache is not found, proceed with the request
    return callback({});
  }
  
  shouldSkipInterception(url) {
    const urlObj = new URL(url);
    
    // Skip common API endpoints that should not be cached
    if (url.includes('/api/') || url.includes('/socket.io/')) {
      return true;
    }
    
    // Skip for domains that are not to be intercepted
    if (!this.interceptedDomains.has(urlObj.hostname)) {
      return true;
    }
    
    return false;
  }
  
  addInterceptedDomain(domain) {
    this.interceptedDomains.add(domain);
  }
  
  removeInterceptedDomain(domain) {
    this.interceptedDomains.delete(domain);
  }
  
  clearInterceptedDomains() {
    this.interceptedDomains.clear();
  }
}

module.exports = ResourceInterceptor;
