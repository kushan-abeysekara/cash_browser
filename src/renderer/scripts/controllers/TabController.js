export class TabController {
  constructor() {
    this.tabs = [
      { id: 'browser-tab', contentId: 'browser-content' },
      { id: 'cache-tab', contentId: 'cache-content' },
      { id: 'dashboard-tab', contentId: 'dashboard-content' }
    ];
    this.activeTab = 'browser-tab';
  }

  initialize() {
    this.tabs.forEach(tab => {
      const tabElement = document.getElementById(tab.id);
      if (tabElement) { // Add null check
        tabElement.addEventListener('click', () => {
          this.activateTab(tab.id);
        });
      } else {
        console.error(`Tab element with id "${tab.id}" not found`);
      }
    });
  }

  activateTab(tabId) {
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
    const event = new CustomEvent('tabchanged', { detail: { tabId, contentId } });
    document.dispatchEvent(event);
  }

  getActiveTab() {
    return this.activeTab;
  }
}
