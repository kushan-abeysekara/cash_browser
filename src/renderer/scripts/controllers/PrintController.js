export class PrintController {
  constructor(notification) {
    this.notification = notification;
    this.printModal = null;
    this.printForm = null;
    this.printersList = null;
    this.paperSizeSelect = null;
    this.webContentsId = null;
    this.selectedPrinter = null;
    this.printerCapabilities = {};
    this.savedSettings = {};
    this.customPaperSizes = ['Letter', 'A4', 'B5', 'Legal']; // Standard paper sizes we want to ensure are available
    this.previousSettings = null;
    this.previewFrame = null;
    this.previewDocument = null;
  }

  async initialize() {
    this.printModal = document.getElementById('print-modal');
    this.printForm = document.getElementById('print-form');
    this.printersList = document.getElementById('printers-list');
    this.paperSizeSelect = document.getElementById('paper-size');
    this.previewFrame = document.getElementById('print-preview-frame');
    
    // Add null checks before accessing elements
    if (!this.printModal) {
      console.error('Print modal element not found');
      return;
    }
    
    const cancelButton = document.getElementById('cancel-print');
    const printButton = document.getElementById('print-button');
    const closeButton = this.printModal.querySelector('.close-button');
    const pageSelection = document.getElementsByName('pageSelection');
    const pageRanges = document.getElementById('page-ranges');
    
    // Set up event listeners with null checks
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        this.closePrintModal();
      });
    }
    
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closePrintModal();
      });
    }
    
    if (printButton) {
      printButton.addEventListener('click', () => {
        this.executePrint();
      });
    }
    
    // Handle page range input toggle
    if (pageSelection && pageSelection.length > 0) {
      for (const radio of pageSelection) {
        radio.addEventListener('change', (e) => {
          if (pageRanges) {
            pageRanges.disabled = e.target.value !== 'custom';
          }
        });
      }
    }
    
    // Handle printer selection change
    if (this.printersList) {
      this.printersList.addEventListener('change', async () => {
        await this.onPrinterChanged();
      });
    }
    
    // Load saved print settings
    await this.loadSavedSettings();
    
    // Fetch available printers
    await this.loadPrinters();
  }
  
  async loadSavedSettings() {
    try {
      if (!window.api || !window.api.print) {
        throw new Error('Print API not available');
      }
      
      const result = await window.api.print.getSettings();
      if (result && result.success) {
        this.savedSettings = result.settings || {};
        this.previousSettings = { ...this.savedSettings };
        console.log('Loaded saved print settings:', this.savedSettings);
      }
    } catch (error) {
      console.error('Error loading print settings:', error);
    }
  }
  
  async loadPrinters() {
    try {
      if (!window.api || !window.api.print) {
        throw new Error('Print API not available');
      }
      
      const result = await window.api.print.getPrinters();
      
      if (result && result.success && this.printersList) {
        // Clear existing options
        this.printersList.innerHTML = '';
        
        // Add printers to dropdown
        result.printers.forEach(printer => {
          const option = document.createElement('option');
          option.value = printer.name;
          option.textContent = printer.name;
          option.selected = 
            printer.isDefault || 
            (this.savedSettings.printer === printer.name);
          
          this.printersList.appendChild(option);
        });
        
        // Store capabilities for each printer
        this.printerCapabilities = result.capabilities || {};
        
        // Handle initial printer selection
        await this.onPrinterChanged();
      }
    } catch (error) {
      console.error('Error loading printers:', error);
      this.notification.show('Print Error', 'Failed to load printers', 'error');
    }
  }
  
  async onPrinterChanged() {
    if (!this.printersList || !this.paperSizeSelect) return;
    
    const selectedPrinter = this.printersList.value;
    this.selectedPrinter = selectedPrinter;
    
    // Get capabilities for this printer
    const capabilities = this.printerCapabilities[selectedPrinter] || {};
    
    // Get paper sizes
    const paperSizes = capabilities.paperSizes || [];
    
    // Clear paper size dropdown
    this.paperSizeSelect.innerHTML = '';
    
    // Track added paper sizes to avoid duplicates
    const addedPaperSizes = new Set();
    
    // First add printer's available paper sizes
    if (paperSizes.length > 0) {
      for (const paperSize of paperSizes) {
        const option = document.createElement('option');
        option.value = paperSize.name;
        option.textContent = paperSize.name;
        this.paperSizeSelect.appendChild(option);
        addedPaperSizes.add(paperSize.name.toLowerCase());
      }
    }
    
    // Then add our custom paper sizes if they're not already present
    for (const customSize of this.customPaperSizes) {
      if (!addedPaperSizes.has(customSize.toLowerCase())) {
        const option = document.createElement('option');
        option.value = customSize;
        option.textContent = customSize;
        this.paperSizeSelect.appendChild(option);
      }
    }
    
    // Set selected paper size based on saved settings or printer default
    const savedPaperSize = this.savedSettings.paperSize;
    const printerDefaultSize = capabilities.defaultPaperSize;
    
    if (savedPaperSize && this.findOption(this.paperSizeSelect, savedPaperSize)) {
      this.paperSizeSelect.value = savedPaperSize;
    } else if (printerDefaultSize && this.findOption(this.paperSizeSelect, printerDefaultSize)) {
      this.paperSizeSelect.value = printerDefaultSize;
    }
    
    // Apply other saved settings if available
    this.applyPrintSettings();
  }
  
  findOption(selectElement, value) {
    for (const option of selectElement.options) {
      if (option.value === value) {
        return true;
      }
    }
    return false;
  }
  
  applyPrintSettings() {
    if (!this.printForm) return;
    
    // Apply saved settings to form elements
    const settings = this.savedSettings;
    
    // Copies
    const copiesInput = document.getElementById('copies');
    if (copiesInput && settings.copies) {
      copiesInput.value = settings.copies;
    }
    
    // Collate
    const collateCheckbox = document.getElementById('collate');
    if (collateCheckbox && settings.collate !== undefined) {
      collateCheckbox.checked = settings.collate;
    }
    
    // Page selection
    if (settings.pageSelection) {
      const pageSelectionRadio = document.querySelector(`input[name="pageSelection"][value="${settings.pageSelection}"]`);
      if (pageSelectionRadio) {
        pageSelectionRadio.checked = true;
      }
      
      // Page ranges
      const pageRangesInput = document.getElementById('page-ranges');
      if (pageRangesInput && settings.pageRanges) {
        pageRangesInput.value = settings.pageRanges;
        pageRangesInput.disabled = settings.pageSelection !== 'custom';
      }
    }
    
    // Orientation
    if (settings.orientation) {
      const orientationRadio = document.querySelector(`input[name="orientation"][value="${settings.orientation}"]`);
      if (orientationRadio) {
        orientationRadio.checked = true;
      }
    }
    
    // Color
    if (settings.color) {
      const colorRadio = document.querySelector(`input[name="color"][value="${settings.color}"]`);
      if (colorRadio) {
        colorRadio.checked = true;
      }
    }
    
    // Margins
    const marginsSelect = document.getElementById('margins');
    if (marginsSelect && settings.margins !== undefined) {
      marginsSelect.value = settings.margins;
    }
  }
  
  showPrintModal(webContentsId) {
    this.webContentsId = webContentsId;
    
    if (this.printModal) {
      this.printModal.style.display = 'flex';
      
      // Generate preview - capture this async operation
      setTimeout(() => this.updatePreview(), 300);
    }
  }
  
  closePrintModal() {
    if (this.printModal) {
      this.printModal.style.display = 'none';
      
      // Clear the preview when closing
      if (this.previewFrame) {
        try {
          this.previewFrame.srcdoc = '';
        } catch (error) {
          console.error('Error clearing preview:', error);
        }
      }
    }
  }
  
  async updatePreview() {
    try {
      if (!this.previewFrame || !this.webContentsId) {
        console.error('Preview frame or webContentsId not available');
        return;
      }
      
      // Get the webview element with current content
      const webview = document.getElementById('web-view');
      if (!webview) {
        console.error('Webview element not found');
        return;
      }
      
      // Capture the current webview content using the print to PDF API
      const result = await window.api.print.capturePreview({
        webContentsId: this.webContentsId,
        format: 'html'
      });
      
      if (!result || !result.success) {
        console.error('Failed to capture preview:', result?.error || 'Unknown error');
        return;
      }
      
      // Generate a complete HTML document with necessary styling
      const previewHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            
            body {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
              background: white;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            }
            
            img, svg {
              max-width: 100%;
            }
            
            /* Apply paper size from settings */
            @page {
              size: ${this.savedSettings.paperSize || 'auto'};
              margin: ${this.getMarginValue(this.savedSettings.margins)};
            }
            
            .print-content {
              padding: 10px;
            }
          </style>
        </head>
        <body>
          <div class="print-content">${result.content}</div>
        </body>
        </html>
      `;
      
      // Apply the HTML content to the preview iframe
      this.previewFrame.srcdoc = previewHtml;
      
      // Set up the iframe onload handler to access document
      this.previewFrame.onload = () => {
        try {
          this.previewDocument = this.previewFrame.contentDocument;
          
          // Apply orientation
          const orientation = this.savedSettings.orientation || 'portrait';
          if (this.previewDocument && orientation === 'landscape') {
            const style = this.previewDocument.createElement('style');
            style.textContent = '@page { size: landscape; }';
            this.previewDocument.head.appendChild(style);
          }
        } catch (error) {
          console.error('Error setting up preview document:', error);
        }
      };
    } catch (error) {
      console.error('Error updating preview:', error);
      this.notification.show('Preview Error', 'Failed to generate print preview', 'error');
    }
  }
  
  getMarginValue(marginType) {
    switch(marginType) {
      case 1: return '0mm'; // None
      case 2: return '5mm'; // Minimum
      default: return '15mm'; // Default
    }
  }
  
  async savePrintSettings() {
    try {
      if (!window.api || !window.api.print || !this.printForm) {
        return;
      }
      
      const formData = new FormData(this.printForm);
      const settings = {
        printer: this.printersList ? this.printersList.value : '',
        copies: parseInt(formData.get('copies') || '1', 10),
        collate: !!formData.get('collate'),
        pageSelection: formData.get('pageSelection') || 'all',
        pageRanges: formData.get('pageRanges') || '',
        orientation: formData.get('orientation') || 'portrait',
        color: formData.get('color') || 'color',
        paperSize: formData.get('paperSize') || 'A4',
        margins: parseInt(formData.get('margins') || '0', 10)
      };
      
      // Only save settings if they've changed
      if (JSON.stringify(settings) !== JSON.stringify(this.previousSettings)) {
        this.savedSettings = settings;
        this.previousSettings = { ...settings };
        await window.api.print.saveSettings(settings);
        console.log('Print settings saved:', settings);
      }
    } catch (error) {
      console.error('Error saving print settings:', error);
    }
  }
  
  async executePrint() {
    try {
      if (!window.api || !window.api.print || !this.printForm || !this.webContentsId) {
        throw new Error('Print API not available or missing required data');
      }
      
      // Save current settings
      await this.savePrintSettings();
      
      const formData = new FormData(this.printForm);
      
      // Build print options
      const printOptions = {
        webContentsId: this.webContentsId,
        printer: formData.get('printer'),
        copies: parseInt(formData.get('copies') || '1', 10),
        collate: !!formData.get('collate'),
        pageRanges: formData.get('pageSelection') === 'custom' ? 
          formData.get('pageRanges') : undefined,
        landscape: formData.get('orientation') === 'landscape',
        color: formData.get('color') === 'color',
        paperSize: formData.get('paperSize'),
        margins: parseInt(formData.get('margins'), 10)
      };
      
      const result = await window.api.print.print(printOptions);
      
      if (result && result.success) {
        this.notification.show('Print', 'Document sent to printer', 'success');
        this.closePrintModal();
      } else {
        this.notification.show('Print Error', result.error || 'Failed to print', 'error');
      }
    } catch (error) {
      console.error('Print error:', error);
      this.notification.show('Print Error', error.message || 'Failed to print', 'error');
    }
  }
}
