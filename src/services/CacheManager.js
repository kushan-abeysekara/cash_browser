const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const { app } = require('electron');
const mime = require('mime-types');
const URL = require('url').URL;

class CacheManager {
  constructor() {
    this.cacheDir = path.join(app.getPath('userData'), 'cache');
    this.cacheManifest = {};
    this.manifestPath = path.join(this.cacheDir, 'manifest.json');
    this.maxAge = 24 * 60 * 60 * 1000; // 24 hours default
  }

  async initialize() {
    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    // Load cache manifest
    if (fs.existsSync(this.manifestPath)) {
      try {
        this.cacheManifest = JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
      } catch (error) {
        console.error('Error loading cache manifest:', error);
        this.cacheManifest = {};
      }
    }
  }

  async saveManifest() {
    try {
      fs.writeFileSync(this.manifestPath, JSON.stringify(this.cacheManifest, null, 2));
    } catch (error) {
      console.error('Error saving cache manifest:', error);
    }
  }

  async fetchAndCache(url) {
    try {
      // Fetch main URL content
      const response = await axios.get(url);
      
      // Generate a hash for the URL to use as directory name
      const urlHash = crypto.createHash('md5').update(url).digest('hex');
      const urlCacheDir = path.join(this.cacheDir, urlHash);
      
      if (!fs.existsSync(urlCacheDir)) {
        fs.mkdirSync(urlCacheDir, { recursive: true });
      }
      
      // Save the main HTML file
      const htmlPath = path.join(urlCacheDir, 'index.html');
      fs.writeFileSync(htmlPath, response.data);
      
      // Parse HTML to extract assets
      const $ = cheerio.load(response.data);
      const baseUrl = new URL(url);
      
      // Process CSS
      const cssPromises = [];
      $('link[rel="stylesheet"]').each((i, el) => {
        const cssUrl = new URL($(el).attr('href'), baseUrl.href).href;
        cssPromises.push(this.cacheResource(cssUrl, urlCacheDir));
      });
      
      // Process JS
      const jsPromises = [];
      $('script[src]').each((i, el) => {
        const jsUrl = new URL($(el).attr('src'), baseUrl.href).href;
        jsPromises.push(this.cacheResource(jsUrl, urlCacheDir));
      });
      
      // Process images
      const imgPromises = [];
      $('img[src]').each((i, el) => {
        const imgUrl = new URL($(el).attr('src'), baseUrl.href).href;
        imgPromises.push(this.cacheResource(imgUrl, urlCacheDir));
      });
      
      // Wait for all resources to be cached
      await Promise.all([...cssPromises, ...jsPromises, ...imgPromises]);
      
      // Update cache manifest
      this.cacheManifest[url] = {
        cacheDir: urlHash,
        timestamp: Date.now(),
        lastChecked: Date.now(),
      };
      
      await this.saveManifest();
      
      return {
        success: true,
        cachePath: htmlPath,
        message: `Successfully cached ${url}`
      };
    } catch (error) {
      console.error(`Error caching URL ${url}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cacheResource(url, cacheDir) {
    try {
      const resourceHash = crypto.createHash('md5').update(url).digest('hex');
      const parsedUrl = new URL(url);
      const extension = path.extname(parsedUrl.pathname) || this.getExtensionFromContentType(url);
      const resourcePath = path.join(cacheDir, `${resourceHash}${extension}`);
      
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
      });
      
      fs.writeFileSync(resourcePath, response.data);
      
      return {
        success: true,
        originalUrl: url,
        cachedPath: resourcePath
      };
    } catch (error) {
      console.error(`Error caching resource ${url}:`, error);
      return {
        success: false,
        originalUrl: url,
        error: error.message
      };
    }
  }

  async getExtensionFromContentType(url) {
    try {
      const response = await axios.head(url);
      const contentType = response.headers['content-type'];
      return mime.extension(contentType) ? `.${mime.extension(contentType)}` : '';
    } catch (error) {
      console.error('Error determining content type:', error);
      return '';
    }
  }

  async clearCache() {
    try {
      // Delete all cache files
      if (fs.existsSync(this.cacheDir)) {
        fs.rmSync(this.cacheDir, { recursive: true, force: true });
      }
      
      // Recreate empty cache directory
      fs.mkdirSync(this.cacheDir, { recursive: true });
      
      // Reset cache manifest
      this.cacheManifest = {};
      await this.saveManifest();
      
      return { success: true, message: 'Cache cleared successfully' };
    } catch (error) {
      console.error('Error clearing cache:', error);
      return { success: false, error: error.message };
    }
  }

  isCached(url) {
    return url in this.cacheManifest;
  }

  isCacheValid(url) {
    if (!this.isCached(url)) return false;
    
    const cache = this.cacheManifest[url];
    const now = Date.now();
    
    return (now - cache.timestamp) < this.maxAge;
  }

  getCachedPath(url) {
    if (!this.isCached(url)) return null;
    
    const urlHash = this.cacheManifest[url].cacheDir;
    return path.join(this.cacheDir, urlHash, 'index.html');
  }
}

module.exports = CacheManager;
