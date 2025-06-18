export class TabController {
  constructor() {
    this.tabs = [
      { id: 'browser-tab', contentId: 'browser-content' },
      { id: 'cache-tab', contentId: 'cache-content' },
      { id: 'dashboard-tab', contentId: 'dashboard-content' },
      { id: 'settings-tab', contentId: 'settings-content' } // Add settings tab if needed
    ];
    this.activeTab = 'browser-tab';
    this._initialized = false;
  }

  initialize() {
    if (this._initialized) return;
    
    this.tabs.forEach(tab => {
      const tabElement = document.getElementById(tab.id);
      if (tabElement) {
        // Use more robust click handling
        tabElement.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          console.log(`Tab clicked: ${tab.id}`);
          this.activateTab(tab.id);
        });
      } else {
        console.error(`Tab element with id "${tab.id}" not found`);
      }
    });
    
    // Activate the initial tab
    this.activateTab(this.activeTab);
    this._initialized = true;
  }

  activateTab(tabId) {
    console.log(`Activating tab: ${tabId}`);
    
    // Deactivate all tabs with null checks
    this.tabs.forEach(tab => {
      const tabElement = document.getElementById(tab.id);
      const contentElement = document.getElementById(tab.contentId);
      
      if (tabElement) tabElement.classList.remove('active');
      if (contentElement) contentElement.classList.remove('active');
    });

    // Activate the selected tab with null checks
    const tabElement = document.getElementById(tabId);
    if (!tabElement) {
      console.error(`Tab element with id "${tabId}" not found`);
      return;
    }
    
    tabElement.classList.add('active');
    
    const contentId = this.tabs.find(tab => tab.id === tabId)?.contentId;
    if (!contentId) {
      console.error(`Content ID not found for tab "${tabId}"`);
      return;
    }
    
    const contentElement = document.getElementById(contentId);
    if (!contentElement) {
      console.error(`Content element with id "${contentId}" not found`);
      return;
    }
    
    contentElement.classList.add('active');
    this.activeTab = tabId;

    // Dispatch event for other components to react
    try {
      const event = new CustomEvent('tabchanged', { 
        detail: { tabId, contentId },
        bubbles: true
      });
      document.dispatchEvent(event);
      console.log(`Tab change event dispatched for ${tabId}`);
    } catch (error) {
      console.error('Error dispatching tab change event:', error);
    }
  }

  getActiveTab() {
    return this.activeTab;
  }
}
