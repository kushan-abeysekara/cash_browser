const { BrowserWindow, app, dialog } = require('electron');
const ElectronStore = require('electron-store');
const path = require('path');
const fs = require('fs');

class PrintService {
  constructor() {
    this.store = new ElectronStore({
      name: 'print-settings',
      cwd: app ? app.getPath('userData') : null
    });
    
    this.settings = {
      printer: '',
      copies: 1,
      collate: true,
      pageSelection: 'all',
      pageRanges: '',
      orientation: 'portrait',
      color: 'color',
      paperSize: 'A4',
      margins: 0
    };
    
    this.printerCapabilities = {};
  }

  initialize() {
    // Load stored settings
    const savedSettings = this.store.get('settings');
    if (savedSettings) {
      this.settings = { ...this.settings, ...savedSettings };
    }
    
    // We'll pre-fetch printer capabilities when the service initializes
    this.updatePrinterCapabilities();
  }

  async updatePrinterCapabilities() {
    try {
      const printers = await this.getAvailablePrinters();
      const capabilities = {};
      
      for (const printer of printers) {
        capabilities[printer.name] = await this.getPrinterCapabilities(printer.name);
      }
      
      this.printerCapabilities = capabilities;
    } catch (error) {
      console.error('Error updating printer capabilities:', error);
    }
  }

  async getAvailablePrinters() {
    return new Promise((resolve) => {
      if (!BrowserWindow.getAllWindows()[0]) {
        resolve([]);
        return;
      }
      
      const printers = BrowserWindow.getAllWindows()[0].webContents.getPrinters();
      resolve(printers);
    });
  }

  async getPrinterCapabilities(printerName) {
    try {
      // In a real implementation, we would query the printer's capabilities
      // For now we'll return a basic set of capabilities
      const printers = await this.getAvailablePrinters();
      const printer = printers.find(p => p.name === printerName);
      
      if (!printer) {
        return {
          paperSizes: [],
          defaultPaperSize: 'A4',
          colorModes: ['color', 'bw'],
          defaultColorMode: 'color',
          duplex: true
        };
      }
      
      // Extract paper sizes from the printer capabilities
      const paperSizes = [];
      const mediaSize = printer.options && printer.options['media-size'];
      
      if (mediaSize && Array.isArray(mediaSize)) {
        for (const size of mediaSize) {
          if (size.option) {
            paperSizes.push({
              name: size.option,
              width: size['width-microns'],
              height: size['height-microns']
            });
          }
        }
      }
      
      // If no paper sizes are available, add standard ones
      if (paperSizes.length === 0) {
        paperSizes.push(
          { name: 'A4', width: 210000, height: 297000 },
          { name: 'Letter', width: 215900, height: 279400 },
          { name: 'Legal', width: 215900, height: 355600 },
          { name: 'B5', width: 176000, height: 250000 }
        );
      }
      
      // Determine default paper size from printer
      let defaultPaperSize = 'A4';
      const defaultMedia = printer.options && printer.options['media-default'];
      if (defaultMedia) {
        defaultPaperSize = defaultMedia;
      }
      
      return {
        paperSizes,
        defaultPaperSize,
        colorModes: ['color', 'bw'],
        defaultColorMode: 'color',
        duplex: true
      };
    } catch (error) {
      console.error('Error getting printer capabilities:', error);
      return {
        paperSizes: [
          { name: 'A4', width: 210000, height: 297000 },
          { name: 'Letter', width: 215900, height: 279400 },
          { name: 'Legal', width: 215900, height: 355600 },
          { name: 'B5', width: 176000, height: 250000 }
        ],
        defaultPaperSize: 'A4',
        colorModes: ['color', 'bw'],
        defaultColorMode: 'color',
        duplex: true
      };
    }
  }

  async getPrinters() {
    try {
      const printers = await this.getAvailablePrinters();
      
      // Update capabilities
      await this.updatePrinterCapabilities();
      
      return { 
        success: true, 
        printers,
        capabilities: this.printerCapabilities
      };
    } catch (error) {
      console.error('Error getting printers:', error);
      return { success: false, error: error.message };
    }
  }

  async print(options) {
    try {
      const { webContentsId, ...printOptions } = options;
      
      // Find the WebContents instance with the given ID
      let webContents = null;
      for (const win of BrowserWindow.getAllWindows()) {
        if (win.webContents.id === webContentsId) {
          webContents = win.webContents;
          break;
        }
        
        // Search in webviews within this window
        const webviewWebContents = win.webContents.getWebContentsId && win.webContents.getWebContents();
        if (webviewWebContents) {
          for (const wc of webviewWebContents) {
            if (wc.id === webContentsId) {
              webContents = wc;
              break;
            }
          }
        }
      }
      
      if (!webContents) {
        // Try to find webview directly
        const allWebContents = require('electron').webContents.getAllWebContents();
        webContents = allWebContents.find(wc => wc.id === webContentsId);
      }
      
      if (!webContents) {
        throw new Error(`WebContents with ID ${webContentsId} not found`);
      }
      
      // Format print options for Electron
      const electronPrintOptions = {
        silent: true,
        printBackground: true,
        deviceName: printOptions.printer,
        color: printOptions.color !== false,
        copies: printOptions.copies || 1,
        collate: printOptions.collate !== false,
        pageRanges: printOptions.pageRanges ? this.parsePageRanges(printOptions.pageRanges) : undefined,
        landscape: !!printOptions.landscape,
        marginsType: printOptions.margins || 0,
        scaleFactor: 100,
        pageSize: printOptions.paperSize || undefined
      };
      
      // Print the document
      await webContents.print(electronPrintOptions);
      
      // If we got here without an exception, assume success
      return { success: true };
    } catch (error) {
      console.error('Print error:', error);
      return { success: false, error: error.message };
    }
  }

  parsePageRanges(pageRangesStr) {
    try {
      // Format: "1-5, 8, 11-13"
      const rangeStrings = pageRangesStr.split(',');
      const ranges = [];
      
      for (const rangeStr of rangeStrings) {
        const trimmed = rangeStr.trim();
        
        // Check if it's a single page
        if (/^\d+$/.test(trimmed)) {
          const page = parseInt(trimmed, 10);
          ranges.push({ from: page, to: page });
        } 
        // Check if it's a range (e.g., "1-5")
        else if (/^\d+-\d+$/.test(trimmed)) {
          const [from, to] = trimmed.split('-').map(p => parseInt(p.trim(), 10));
          ranges.push({ from, to });
        }
      }
      
      return ranges;
    } catch (error) {
      console.error('Error parsing page ranges:', error);
      return undefined;
    }
  }

  async printToPDF(options) {
    try {
      const { webContentsId, ...pdfOptions } = options;
      
      // Find the WebContents instance
      let webContents = null;
      for (const win of BrowserWindow.getAllWindows()) {
        if (win.webContents.id === webContentsId) {
          webContents = win.webContents;
          break;
        }
      }
      
      if (!webContents) {
        const allWebContents = require('electron').webContents.getAllWebContents();
        webContents = allWebContents.find(wc => wc.id === webContentsId);
      }
      
      if (!webContents) {
        throw new Error(`WebContents with ID ${webContentsId} not found`);
      }
      
      // Create PDF options
      const printOptions = {
        printBackground: true,
        landscape: !!pdfOptions.landscape,
        marginsType: pdfOptions.margins || 0,
        pageSize: pdfOptions.paperSize || 'A4'
      };
      
      // Generate PDF
      const data = await webContents.printToPDF(printOptions);
      
      // Prompt user to save PDF
      const defaultPath = path.join(app.getPath('downloads'), 'document.pdf');
      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath,
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });
      
      if (canceled || !filePath) {
        return { success: false, message: 'Save canceled by user' };
      }
      
      // Save PDF file
      fs.writeFileSync(filePath, data);
      
      return { success: true, filePath };
    } catch (error) {
      console.error('Error generating PDF:', error);
      return { success: false, error: error.message };
    }
  }

  async capturePreview(options) {
    try {
      const { webContentsId, format = 'html' } = options;
      
      // Find the WebContents instance
      let webContents = null;
      const allWebContents = require('electron').webContents.getAllWebContents();
      webContents = allWebContents.find(wc => wc.id === webContentsId);
      
      if (!webContents) {
        throw new Error(`WebContents with ID ${webContentsId} not found`);
      }
      
      if (format === 'html') {
        // Capture the HTML content
        const content = await webContents.executeJavaScript(`
          (function() {
            const styles = Array.from(document.styleSheets)
              .filter(sheet => !sheet.href || sheet.href.startsWith(window.location.origin))
              .map(sheet => {
                try {
                  return Array.from(sheet.cssRules)
                    .map(rule => rule.cssText)
                    .join('\\n');
                } catch (e) {
                  console.error('Error accessing CSS rules:', e);
                  return '';
                }
              })
              .filter(Boolean)
              .join('\\n');
              
            const styleElement = styles ? 
              '<style>' + styles + '</style>' : '';
              
            return styleElement + document.body.innerHTML;
          })()
        `);
        
        return { success: true, content };
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
      this.store.set('settings', this.settings);
      return { success: true, settings: this.settings };
    } catch (error) {
      console.error('Error saving print settings:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PrintService;
