export class PrintController {
  constructor(notification) {
    this.notification = notification;
    this.printModal = null;
    this.printForm = null;
    this.printersList = null;
    this.previewFrame = null;
    this.currentWebContentsId = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      this.printModal = document.getElementById('print-modal');
      this.printForm = document.getElementById('print-form');
      this.printersList = document.getElementById('printer-select');
      this.previewFrame = document.getElementById('print-preview');
      
      // Check if we have the required elements
      if (!this.printModal) {
        console.error('Print modal element not found');
        return;
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Initialize printers list
      await this.loadPrinters();
      
      this.isInitialized = true;
      console.log('PrintController initialized');
    } catch (error) {
      console.error('Error initializing PrintController:', error);
    }
  }
  
  setupEventListeners() {
    try {
      // Print form submission
      if (this.printForm) {
        this.printForm.addEventListener('submit', this.handlePrintSubmit.bind(this));
      }
      
      // Close button
      const closeButton = this.printModal?.querySelector('.close-button');
      if (closeButton) {
        closeButton.addEventListener('click', this.closePrintModal.bind(this));
      }
      
      // Cancel button
      const cancelButton = document.getElementById('cancel-print');
      if (cancelButton) {
        cancelButton.addEventListener('click', this.closePrintModal.bind(this));
      }
      
      // PDF button
      const pdfButton = document.getElementById('save-pdf');
      if (pdfButton) {
        pdfButton.addEventListener('click', this.handleSavePDF.bind(this));
      }
    } catch (error) {
      console.error('Error setting up print event listeners:', error);
    }
  }
  
  async loadPrinters() {
    try {
      if (!window.api || !window.api.print || !this.printersList) return;
      
      const response = await window.api.print.getPrinters();
      if (response.success && Array.isArray(response.printers)) {
        // Clear existing options
        this.printersList.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.value = 'default';
        defaultOption.textContent = 'Default Printer';
        this.printersList.appendChild(defaultOption);
        
        // Add available printers
        response.printers.forEach(printer => {
          const option = document.createElement('option');
          option.value = printer.name;
          option.textContent = printer.name;
          if (printer.isDefault) {
            option.selected = true;
          }
          this.printersList.appendChild(option);
        });
      } else {
        console.error('Failed to load printers:', response.error);
      }
    } catch (error) {
      console.error('Error loading printers:', error);
    }
  }
  
  async showPrintModal(webContentsId) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      if (!this.printModal) {
        console.error('Print modal not initialized');
        return;
      }
      
      // Store current webContentsId
      this.currentWebContentsId = webContentsId;
      
      // Reset the form
      if (this.printForm) {
        this.printForm.reset();
      }
      
      // Load print preview
      await this.loadPrintPreview(webContentsId);
      
      // Show the modal
      this.printModal.style.display = 'flex';
    } catch (error) {
      console.error('Error showing print modal:', error);
      this.notification?.show('Print Error', `Failed to open print dialog: ${error.message}`, 'error');
    }
  }
  
  closePrintModal() {
    try {
      if (this.printModal) {
        this.printModal.style.display = 'none';
      }
      
      // Clear preview
      if (this.previewFrame) {
        this.previewFrame.src = 'about:blank';
      }
      
      this.currentWebContentsId = null;
    } catch (error) {
      console.error('Error closing print modal:', error);
    }
  }
  
  async loadPrintPreview(webContentsId) {
    try {
      if (!webContentsId || !this.previewFrame) return;
      
      // Show loading state
      this.previewFrame.src = 'about:blank';
      
      // Generate PDF preview
      if (window.api && window.api.print) {
        const response = await window.api.print.generatePreview(webContentsId);
        
        if (response.success && response.previewUrl) {
          this.previewFrame.src = response.previewUrl;
        } else {
          console.error('Failed to generate print preview:', response.error);
          this.notification?.show('Print Preview', `Failed to generate preview: ${response.error}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error loading print preview:', error);
      this.notification?.show('Print Preview', `Failed to load preview: ${error.message}`, 'error');
    }
  }
  
  async handlePrintSubmit(event) {
    try {
      event.preventDefault();
      
      if (!this.currentWebContentsId) {
        throw new Error('No web contents to print');
      }
      
      const formData = new FormData(this.printForm);
      const printOptions = {
        printer: formData.get('printer'),
        copies: parseInt(formData.get('copies'), 10) || 1,
        color: formData.get('color') === 'color',
        landscape: formData.get('orientation') === 'landscape',
        scale: parseFloat(formData.get('scale')) || 1.0
      };
      
      if (window.api && window.api.print) {
        const response = await window.api.print.execute({
          webContentsId: this.currentWebContentsId,
          options: printOptions
        });
        
        if (response.success) {
          this.notification?.show('Print', 'Sent to printer successfully', 'success');
          this.closePrintModal();
        } else {
          this.notification?.show('Print Error', `Failed to print: ${response.error}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error handling print submit:', error);
      this.notification?.show('Print Error', `Failed to print: ${error.message}`, 'error');
    }
  }
  
  async handleSavePDF() {
    try {
      if (!this.currentWebContentsId) {
        throw new Error('No web contents to save as PDF');
      }
      
      const formData = new FormData(this.printForm);
      const pdfOptions = {
        landscape: formData.get('orientation') === 'landscape',
        scale: parseFloat(formData.get('scale')) || 1.0,
        pageSize: formData.get('paper-size') || 'A4'
      };
      
      if (window.api && window.api.print) {
        this.notification?.show('PDF Export', 'Generating PDF...', 'info');
        
        const response = await window.api.print.toPdf({
          webContentsId: this.currentWebContentsId,
          options: pdfOptions
        });
        
        if (response.success) {
          this.notification?.show('PDF Export', `PDF saved to: ${response.pdfPath}`, 'success');
          this.closePrintModal();
          
          // Open the PDF file
          if (window.api.shell) {
            window.api.shell.openPath(response.pdfPath);
          }
        } else {
          this.notification?.show('PDF Error', `Failed to generate PDF: ${response.error}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error saving as PDF:', error);
      this.notification?.show('PDF Error', `Failed to save as PDF: ${error.message}`, 'error');
    }
  }
}
  
  showPrintModal(webContentsId) {
    console.log('Showing print modal for webContentsId:', webContentsId);
    this.webContentsId = webContentsId;
    this.printPreviewLoaded = false;
    
    if (this.printModal) {
      this.printModal.style.display = 'flex';
      
      // Clear any existing preview content
      if (this.previewFrame) {
        try {
          this.previewFrame.srcdoc = '<html><body><div style="display:flex;align-items:center;justify-content:center;height:100%;"><p>Loading preview...</p></div></body></html>';
        } catch (error) {
          console.error('Error clearing preview:', error);
        }
      }
      
      // Generate preview with a slight delay to ensure modal is visible
      setTimeout(() => {
        console.log('Updating print preview');
        this.updatePreview();
      }, 300);
    } else {
      console.error('Print modal element not found');
      this.useNativePrint();
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
      if (!this.previewFrame) {
        console.error('Preview frame not available');
        return;
      }
      
      if (!this.webContentsId) {
        console.error('WebContentsId not available for preview');
        return;
      }
      
      console.log('Capturing preview for webContentsId:', this.webContentsId);
      
      // Show loading state
      this.previewFrame.srcdoc = `
        <html><body>
          <div style="display:flex;align-items:center;justify-content:center;height:100%;">
            <p>Loading preview...</p>
          </div>
        </body></html>
      `;
      
      // Capture the current webview content
      const result = await window.api.print.capturePreview({
        webContentsId: this.webContentsId,
        format: 'html'
      });
      
      if (!result || !result.success) {
        console.error('Failed to capture preview:', result?.error || 'Unknown error');
        this.previewFrame.srcdoc = `
          <html><body>
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:red;">
              <p>Error loading preview: ${result?.error || 'Unknown error'}</p>
            </div>
          </body></html>
        `;
        return;
      }
      
      console.log('Preview content captured successfully');
      
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
          <script>
            // Let parent know we've loaded
            window.onload = function() {
              try {
                window.parent.postMessage({ type: 'preview-loaded' }, '*');
                console.log('Preview loaded notification sent');
              } catch (e) {
                console.error('Error notifying parent window:', e);
              }
            };
          </script>
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
          console.log('Preview iframe loaded');
          this.printPreviewLoaded = true;
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
      
      // Show error in preview frame
      if (this.previewFrame) {
        this.previewFrame.srcdoc = `
          <html><body>
            <div style="display:flex;align-items:center;justify-content:center;height:100%;color:red;">
              <p>Error: ${error.message || 'Failed to generate print preview'}</p>
            </div>
          </body></html>
        `;
      }
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
      if (!window.api || !window.api.print) {
        throw new Error('Print API not available');
      }
      
      if (!this.printForm) {
        throw new Error('Print form not found');
      }
      
      if (!this.webContentsId) {
        throw new Error('No web content available for printing');
      }
      
      console.log('Executing print for webContentsId:', this.webContentsId);
      
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
      
      console.log('Print options:', printOptions);
      
      // Show printing notification
      this.notification.show('Print', 'Sending to printer...', 'info');
      
      const result = await window.api.print.print(printOptions);
      
      if (result && result.success) {
        this.notification.show('Print', 'Document sent to printer', 'success');
        this.closePrintModal();
      } else {
        console.error('Print error:', result?.error);
        this.notification.show('Print Error', result?.error || 'Failed to print', 'error');
      }
    } catch (error) {
      console.error('Print error:', error);
      this.notification.show('Print Error', error.message || 'Failed to print', 'error');
    }
  }
  
  useNativePrint() {
    try {
      if (window.print) {
        window.print();
      }
    } catch (error) {
      console.error('Native print error:', error);
    }
  }
  
  updatePrintPreview() {
    try {
      // Get current options from the form
      const options = this.getCurrentPrintOptions();
      
      // Disable custom page ranges if "All pages" is selected
      const pageRangesInput = document.getElementById('page-ranges');
      if (pageRangesInput) {
        const isCustomPages = document.getElementById('custom-pages').checked;
        pageRangesInput.disabled = !isCustomPages;
      }
      
      // Request a preview with current settings
      this.requestPreview(options);
    } catch (error) {
      console.error('Error updating print preview:', error);
      this.notification.show('Print Error', 'Failed to update preview: ' + error.message, 'error');
    }
  }
  
  async requestPreview(options) {
    try {
      if (!options) {
        options = this.getCurrentPrintOptions();
      }
      
      // Get the webContentsId
      const webContentsId = this.currentWebContentsId;
      if (!webContentsId) {
        throw new Error('No active web content to print');
      }
      
      options.webContentsId = webContentsId;
      
      // Show loading indicator
      this.setPreviewLoading(true);
      
      // Request preview from main process
      const result = await window.api.print.capturePreview(options);
      
      if (result.success) {
        this.updatePreviewImage(result.path);
      } else {
        throw new Error(result.error || 'Failed to generate preview');
      }
    } catch (error) {
      console.error('Preview error:', error);
      this.notification.show('Preview Error', error.message, 'error');
    } finally {
      this.setPreviewLoading(false);
    }
  }
  
  setPreviewLoading(isLoading) {
    try {
      const previewContainer = document.getElementById('print-preview-container');
      const loadingIndicator = document.getElementById('preview-loading');
      
      if (previewContainer && loadingIndicator) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
        if (isLoading) {
          previewContainer.classList.add('loading');
        } else {
          previewContainer.classList.remove('loading');
        }
      }
    } catch (error) {
      console.error('Error setting preview loading state:', error);
    }
  }
}

async capturePreview(webContentsId, format = 'html') {
  try {
    const response = await window.ipc.invoke('print:capture-preview', {
      webContentsId,
      format
    });
    
    if (!response.success) {
      console.error('Failed to capture print preview:', response.error);
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('Error capturing print preview:', error);
    return null;
  }
}
