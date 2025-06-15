const { BrowserWindow, app, webContents } = require('electron');
const path = require('path');
const fs = require('fs');
const ElectronStore = require('electron-store');

class PrintService {
  constructor() {
    this.printWindow = null;
    this.printRequestQueue = [];
    this.currentPrintJob = null;
    this.store = new ElectronStore({
      name: 'print-settings',
      cwd: app.getPath('userData')
    });
  }

  initialize() {
    // Create or load print settings
    if (!this.store.has('printerSettings')) {
      this.store.set('printerSettings', {
        lastUsedPrinter: null,
        defaultOptions: {
          copies: 1, 
          collate: true,
          color: true,
          landscape: false,
          scaleFactor: 100,
          margins: {
            marginType: 0 // 0 = default, 1 = none, 2 = minimum
          },
          pageSize: 'A4'
        }
      });
    }
  }

  async getPrinters() {
    try {
      // Get list of available printers from Electron
      const printers = await this.createTemporaryWindow().webContents.getPrintersAsync();
      this.closeTemporaryWindow();
      
      // Add last used printer info
      const printerSettings = this.store.get('printerSettings');
      return {
        success: true,
        printers,
        lastUsedPrinter: printerSettings.lastUsedPrinter,
        defaultOptions: printerSettings.defaultOptions
      };
    } catch (error) {
      console.error('Error getting printers:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  createTemporaryWindow() {
    // Create a hidden browser window to access printer info
    if (this.tempWindow) {
      return this.tempWindow;
    }
    
    this.tempWindow = new BrowserWindow({
      width: 1,
      height: 1,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    
    // Load blank page
    this.tempWindow.loadURL('about:blank');
    
    return this.tempWindow;
  }

  closeTemporaryWindow() {
    if (this.tempWindow) {
      this.tempWindow.close();
      this.tempWindow = null;
    }
  }

  async print(options) {
    try {
      // Find source contents
      const sourceWebContents = webContents.fromId(options.sourceId);
      if (!sourceWebContents) {
        throw new Error('Source content not found');
      }
      
      // Save the selected printer as last used
      if (options.deviceName) {
        const printerSettings = this.store.get('printerSettings');
        printerSettings.lastUsedPrinter = options.deviceName;
        this.store.set('printerSettings', printerSettings);
      }
      
      // Trigger print with options
      const data = await sourceWebContents.print(options, true);
      
      return {
        success: true,
        message: 'Print job sent to printer'
      };
    } catch (error) {
      console.error('Print error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async printToPDF(options) {
    try {
      // Find source contents
      const sourceWebContents = webContents.fromId(options.sourceId);
      if (!sourceWebContents) {
        throw new Error('Source content not found');
      }
      
      // Generate PDF data
      const data = await sourceWebContents.printToPDF(options);
      
      // Create temp file path
      const pdfPath = path.join(app.getPath('temp'), `print-${Date.now()}.pdf`);
      
      // Write PDF to temp file
      fs.writeFileSync(pdfPath, data);
      
      return {
        success: true,
        path: pdfPath
      };
    } catch (error) {
      console.error('PDF generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  saveSettings(settings) {
    try {
      this.store.set('printerSettings', settings);
      return {
        success: true,
        settings
      };
    } catch (error) {
      console.error('Error saving print settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getSettings() {
    try {
      const settings = this.store.get('printerSettings');
      return {
        success: true,
        settings
      };
    } catch (error) {
      console.error('Error getting print settings:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = PrintService;
