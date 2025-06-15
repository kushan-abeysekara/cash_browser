# Cash Browser

An Electron-based application that accelerates web applications by locally caching CSS, UI interfaces, and assets, dramatically reducing load times and enabling offline-like experiences.

## Features

- **Resource Caching**: Automatically downloads and stores CSS, JavaScript, images, and other static assets locally
- **Session Management**: Supports login sessions and authentication flows
- **Real-time Dashboard Support**: Special handling for real-time data dashboards
- **MVC + MVVM Architecture**: Hybrid design pattern for clean separation of concerns
- **Automatic Cache Invalidation**: Smart detection of resource changes
- **Laravel Application Support**: Optimized for Laravel and similar web frameworks

## Development

This project includes a `.gitignore` file configured for Electron.js applications to prevent unnecessary files from being tracked in the Git repository.

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cash_browser.git

# Navigate to the project directory
cd cash_browser

# Install dependencies
npm install
```

### Running the Application

```bash
# Start in development mode
npm start

# Build the application
npm run build
```

### Project Structure

```
cash_browser/
├── src/
│   ├── main/           # Main process (Electron)
│   ├── renderer/       # Renderer process (UI)
│   ├── models/         # Data models
│   ├── controllers/    # Controllers
│   ├── services/       # Services for caching, auth, etc.
│   └── utils/          # Utility functions
├── resources/          # Static resources
├── cache/              # Default cache directory
└── dist/               # Build output
```

## License

MIT
