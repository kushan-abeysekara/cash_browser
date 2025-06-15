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
      tabElement.addEventListener('click', () => {
        this.activateTab(tab.id);
      });
    });
  }

  activateTab(tabId) {
    // Deactivate all tabs
    this.tabs.forEach(tab => {
      document.getElementById(tab.id).classList.remove('active');
      document.getElementById(tab.contentId).classList.remove('active');
    });

    // Activate the selected tab
    document.getElementById(tabId).classList.add('active');
    const contentId = this.tabs.find(tab => tab.id === tabId).contentId;
    document.getElementById(contentId).classList.add('active');
    this.activeTab = tabId;

    // Dispatch event for other components to react
    const event = new CustomEvent('tabchanged', { detail: { tabId, contentId } });
    document.dispatchEvent(event);
  }

  getActiveTab() {
    return this.activeTab;
  }
}
