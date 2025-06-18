const { BrowserWindow, ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

/**
 * PrintService handles all print-related functionality
 * including custom print dialogs and PDF generation
 */
class PrintService {
  constructor() {
    this.printWindows = new Map();
    this.registeredWebviews = new Map();
    this.printDirectory = path.join(app.getPath('userData'), 'prints');
    
    // Ensure print directory exists
    if (!fs.existsSync(this.printDirectory)) {
      fs.mkdirSync(this.printDirectory, { recursive: true });
    }
    
    this.defaultPrintOptions = {
      silent: false,
      printBackground: true,
      color: true,
      margin: {
        marginType: 'default'
      },
      landscape: false,
      pagesPerSheet: 1,
      collate: false,
      copies: 1,
      header: 'Cash Browser Print',
      footer: 'Page %p of %n'
    };
    
    this.settings = {
      // Default print settings can be added here
    };
  }

  initialize() {
    this.setupIpcHandlers();
  }

  setupIpcHandlers() {
    // Print to PDF handler
    ipcMain.handle('print:to-pdf', async (_event, { webContentsId, options }) => {
      try {
        const webContents = this.getWebContentsById(webContentsId);
        if (!webContents) {
          throw new Error(`WebContents with ID ${webContentsId} not found`);
        }
        
        const mergedOptions = { ...this.defaultPrintOptions, ...options };
        const pdfPath = path.join(this.printDirectory, `print-${Date.now()}.pdf`);
        
        const data = await webContents.printToPDF(mergedOptions);
        fs.writeFileSync(pdfPath, data);
        
        return {
          success: true,
          pdfPath: pdfPath
        };
      } catch (error) {
        console.error('Error printing to PDF:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Print handler
    ipcMain.handle('print:execute', async (_event, { webContentsId, options }) => {
      try {
        const webContents = this.getWebContentsById(webContentsId);
        if (!webContents) {
          throw new Error(`WebContents with ID ${webContentsId} not found`);
        }
        
        const mergedOptions = { ...this.defaultPrintOptions, ...options };
        await webContents.print(mergedOptions);
        
        return {
          success: true
        };
      } catch (error) {
        console.error('Error printing:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });

    // Preview print handler
    ipcMain.handle('print:preview', async (_event, { webContentsId, options }) => {
      try {
        const webContents = this.getWebContentsById(webContentsId);
        if (!webContents) {
          throw new Error(`WebContents with ID ${webContentsId} not found`);
        }
        
        const printWindow = await this.createPrintPreviewWindow(webContents, options);
        return {
          success: true,
          windowId: printWindow.id
        };
      } catch (error) {
        console.error('Error creating print preview:', error);
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    // Register webview for printing
    ipcMain.handle('print:register-webview', (_event, webContentsId) => {
      try {
        this.registerWebview(webContentsId);
        return { success: true };
      } catch (error) {
        console.error('Error registering webview for printing:', error);
        return { success: false, error: error.message };
      }
    });
    
    // Unregister webview
    ipcMain.handle('print:unregister-webview', (_event, webContentsId) => {
      try {
        this.unregisterWebview(webContentsId);
        return { success: true };
      } catch (error) {
        console.error('Error unregistering webview:', error);
        return { success: false, error: error.message };
      }
    });
    
    // Add missing handlers that were in main.js
    ipcMain.handle('print:get-printers', async () => {
      try {
        const { webContents } = require('electron');
        const printers = await webContents.getPrinters();
        return { success: true, printers };
      } catch (error) {
        console.error('Error getting printers:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('print:get-settings', async () => {
      return this.getSettings();
    });

    ipcMain.handle('print:save-settings', async (_event, settings) => {
      return this.saveSettings(settings);
    });

    ipcMain.handle('print:generate-preview', async (_event, webContentsId) => {
      return await this.capturePreview(webContentsId);
    });
  }

  async createPrintPreviewWindow(webContents, options = {}) {
    const printWindowId = uuidv4();
    
    const printWindow = new BrowserWindow({
      width: 800,
      height: 600,
      parent: BrowserWindow.getFocusedWindow() || undefined,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../main/print-preload.js')
      }
    });
    
    this.printWindows.set(printWindowId, printWindow);
    
    printWindow.on('closed', () => {
      this.printWindows.delete(printWindowId);
    });

    // First capture the page as PDF
    const printOptions = { ...this.defaultPrintOptions, ...options };
    const pdfData = await webContents.printToPDF(printOptions);
    
    // Save temporary PDF file
    const tempPdfPath = path.join(os.tmpdir(), `print-${printWindowId}.pdf`);
    fs.writeFileSync(tempPdfPath, pdfData);
    
    // Load the print preview HTML
    await printWindow.loadFile(path.join(__dirname, '../renderer/print-preview.html'));
    
    // Pass the PDF path to the renderer
    printWindow.webContents.send('pdf-ready', {
      pdfPath: tempPdfPath,
      options: printOptions
    });
    
    // Show the window when ready
    printWindow.once('ready-to-show', () => {
      printWindow.show();
    });
    
    return {
      id: printWindowId,
      window: printWindow
    };
  }

  registerWebview(webContentsId) {
    if (!webContentsId) {
      throw new Error('WebContents ID is required');
    }
    
    const webContents = this.getWebContentsById(webContentsId);
    if (!webContents) {
      throw new Error(`WebContents with ID ${webContentsId} not found`);
    }
    
    this.registeredWebviews.set(webContentsId, webContents);
  }

  unregisterWebview(webContentsId) {
    if (this.registeredWebviews.has(webContentsId)) {
      this.registeredWebviews.delete(webContentsId);
    }
  }

  getWebContentsById(webContentsId) {
    // First check our registered webviews
    if (this.registeredWebviews.has(webContentsId)) {
      return this.registeredWebviews.get(webContentsId);
    }
    
    // If not found, try to find in all Electron webContents
    if (webContentsId) {
      return require('electron').webContents.fromId(webContentsId);
    }
    
    return null;
  }
  
  printToPDF(webContentsId, options = {}) {
    return new Promise(async (resolve, reject) => {
      try {
        const webContents = this.getWebContentsById(webContentsId);
        if (!webContents) {
          return reject(new Error(`WebContents with ID ${webContentsId} not found`));
        }
        
        const printOptions = { ...this.defaultPrintOptions, ...options };
        const pdfData = await webContents.printToPDF(printOptions);
        
        const pdfPath = path.join(this.printDirectory, `print-${Date.now()}.pdf`);
        fs.writeFileSync(pdfPath, pdfData);
        
        resolve({ 
          success: true,
          pdfPath
        });
      } catch (error) {
        console.error('Error printing to PDF:', error);
        reject(error);
      }
    });
  }
  
  async capturePreview(webContentsId, format = 'html') {
    try {
      const webContents = this.getWebContentsById(webContentsId);
      if (!webContents) {
        throw new Error(`WebContents with ID ${webContentsId} not found`);
      }
      
      if (format === 'html') {
        // Capture as HTML content
        const content = await webContents.executeJavaScript(
          (function() {
            const getStyles = () => {
              try {
                let styles = '';
                
                // Get stylesheet rules
                Array.from(document.styleSheets).forEach(sheet => {
                  try {
                    if (!sheet.href || sheet.href.startsWith(window.location.origin)) {
                      const rules = Array.from(sheet.cssRules || []);
                      styles += rules.map(rule => rule.cssText).join('\\n');
                    }
                  } catch (e) {
                    console.warn('Error accessing CSS rules:', e);
                  }
                });
                
                // Add inline styles
                const inlineStyles = Array.from(document.querySelectorAll('style'));
                inlineStyles.forEach(style => {
                  styles += style.innerHTML;
                });
                
                return styles;
              } catch (e) {
                console.error('Error getting styles:', e);
                return '';
              }
            };
            
            const getBaseTag = () => {
              const baseUrl = document.baseURI || window.location.href;
              return `<base href="${baseUrl}" />`;
            };
            
            // Get computed styles for body
            const computedStyles = window.getComputedStyle(document.body);
            const bodyStyles = `
              body {
                color: ${computedStyles.color};
                background-color: ${computedStyles.backgroundColor};
                font-family: ${computedStyles.fontFamily};
                font-size: ${computedStyles.fontSize};
                line-height: ${computedStyles.lineHeight};
              }
            `;
            
            // Create the style block
            const styleBlock = getStyles();
            const styleElement = styleBlock ? 
              '<style>' + bodyStyles + styleBlock + '</style>' : 
              '<style>' + bodyStyles + '</style>';
              
            const baseTag = getBaseTag();
            
            // Get meta tags (especially charset)
            const metaTags = Array.from(document.querySelectorAll('meta'))
              .map(meta => meta.outerHTML)
              .join('\\n');
              
            const head = `
              <head>
                ${metaTags}
                ${baseTag}
                ${styleElement}
              </head>
            `;
              
            // Get the body content
            const body = document.body.innerHTML;
            
            return {
              head,
              body,
            };
          })()
        );
        
        console.log('Successfully captured HTML content');
        
        // Return HTML content in a format that can be used directly
        return { 
          success: true, 
          content: content.body,
          head: content.head 
        };
      } else if (format === 'image') {
        // Capture as PNG image
        const image = await webContents.capturePage();
        const dataUrl = image.toDataURL();
        
        return {
          success: true,
          content: `<img src="${dataUrl}" style="width:100%;" />`
        };
      } else {
        throw new Error(`Unsupported preview format: ${format}`);
      }
    } catch (error) {
      console.error('Error capturing preview:', error);
      return { success: false, error: error.message };
    }
  }

  getSettings() {
    return { success: true, settings: this.settings };
  }

  saveSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      if (this.store) {
        this.store.set('settings', this.settings);
      }
      return { success: true, settings: this.settings };
    } catch (error) {
      console.error('Error saving print settings:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PrintService;
