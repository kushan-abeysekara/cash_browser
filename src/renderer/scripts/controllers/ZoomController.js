export class ZoomController {
  constructor() {
    this.webview = null;
    this.currentZoom = 1.0;
    this.maxZoom = 3.0;
    this.minZoom = 0.3;
    this.zoomStep = 0.1;
  }

  initialize() {
    this.webview = document.getElementById('web-view');
    if (!this.webview) {
      console.error('Webview element not found');
      return;
    }
    
    // Initialize with default zoom
    this.setZoom(this.currentZoom);
    
    // Add keyboard shortcuts for zooming
    document.addEventListener('keydown', (e) => {
      // Check if Ctrl key is pressed
      if (e.ctrlKey) {
        // Ctrl + Plus: Zoom in
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          this.zoomIn();
        }
        // Ctrl + Minus: Zoom out
        else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          this.zoomOut();
        }
        // Ctrl + 0: Reset zoom
        else if (e.key === '0') {
          e.preventDefault();
          this.zoomReset();
        }
      }
    });
    
    console.log('ZoomController initialized');
  }

  zoomIn() {
    if (this.currentZoom >= this.maxZoom) return;
    
    this.currentZoom = Math.min(this.currentZoom + this.zoomStep, this.maxZoom);
    this.setZoom(this.currentZoom);
    this.notifyZoomChange();
  }

  zoomOut() {
    if (this.currentZoom <= this.minZoom) return;
    
    this.currentZoom = Math.max(this.currentZoom - this.zoomStep, this.minZoom);
    this.setZoom(this.currentZoom);
    this.notifyZoomChange();
  }

  zoomReset() {
    this.currentZoom = 1.0;
    this.setZoom(this.currentZoom);
    this.notifyZoomChange();
  }

  setZoom(zoomFactor) {
    if (!this.webview) return;
    
    try {
      this.webview.setZoomFactor(zoomFactor);
    } catch (error) {
      console.error('Error setting zoom factor:', error);
    }
  }

  notifyZoomChange() {
    console.log(`Zoom changed: ${Math.round(this.currentZoom * 100)}%`);
    
    // Dispatch custom event
    const event = new CustomEvent('zoom-changed', {
      detail: {
        zoomFactor: this.currentZoom,
        zoomPercent: Math.round(this.currentZoom * 100)
      }
    });
    document.dispatchEvent(event);
  }

  getCurrentZoom() {
    return this.currentZoom;
  }
}
