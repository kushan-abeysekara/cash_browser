export class NotificationService {
  constructor() {
    this.notificationElement = null;
    this.timeout = null;
    this.initialize();
  }
  
  initialize() {
    // Create notification element if it doesn't exist
    if (!this.notificationElement) {
      this.notificationElement = document.createElement('div');
      this.notificationElement.className = 'notification';
      
      const title = document.createElement('div');
      title.className = 'notification-title';
      this.notificationElement.appendChild(title);
      
      const message = document.createElement('div');
      message.className = 'notification-message';
      this.notificationElement.appendChild(message);
      
      document.body.appendChild(this.notificationElement);
    }
  }
  
  show(title, message, type = 'info', duration = 3000) {
    // Clear any existing timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    
    // Update notification content
    this.notificationElement.querySelector('.notification-title').textContent = title;
    this.notificationElement.querySelector('.notification-message').textContent = message;
    
    // Update notification type
    this.notificationElement.className = 'notification';
    this.notificationElement.classList.add(type);
    
    // Show the notification
    setTimeout(() => {
      this.notificationElement.classList.add('show');
    }, 10);
    
    // Set timeout to hide the notification
    this.timeout = setTimeout(() => {
      this.notificationElement.classList.remove('show');
    }, duration);
  }
}
