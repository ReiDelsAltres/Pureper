# Pureper - Color Palette Application

Pureper is a Single Page Application (SPA) for managing and viewing color palettes. Built with vanilla JavaScript and Web Components.

## Features

- 🎨 Color palette management
- 📱 Responsive design with Material Design 3
- 🚀 SPA routing with GitHub Pages support
- 🎯 Web Components architecture
- 🔧 Modular component system

## Project Structure

```
├── components/          # Web Components
│   ├── ColorPalette.*   # Color palette component
│   ├── NavigationDrawer.*  # Navigation drawer component
│   └── PageLayout.*     # Page layout component
├── pages/               # Application pages
│   ├── MainPage.html    # Home page
│   ├── AboutPage.html   # About page
│   └── PalettePage.*    # Palette management page
├── src/foundation/      # Core framework
│   ├── Component.js     # Base component class
│   ├── Page.js          # Base page class
│   └── theme/           # Theme system
├── spa-router.js        # SPA routing system
├── index.html           # Main entry point
├── 404.html             # GitHub Pages SPA support
└── serve.js             # Local development server
```

## Local Development

1. Clone the repository
2. Install Node.js (if not already installed)
3. Run the local server:

```bash
npm start
# or
node serve.js
```

4. Open http://localhost:3000 in your browser

## GitHub Pages Deployment

The application is automatically deployed to GitHub Pages when changes are pushed to the main branch. The deployment is handled by GitHub Actions workflow in `.github/workflows/deploy.yml`.

## Component Architecture

### Base Component Class
All components extend the `Component` class which provides:
- Shadow DOM encapsulation
- Automatic HTML/CSS loading
- Attribute change observing
- Lifecycle hooks

### Page System
Pages use the `Page` class for:
- Dynamic content loading
- Lifecycle management (preLoadJS, render, postLoadJS)
- SPA navigation integration

### Routing
The SPA router handles:
- Client-side navigation
- GitHub Pages compatibility
- History API integration
- Fallback to index.html for unknown routes

## Theme System

The application uses a flexible theme system with:
- CSS custom properties
- Multiple color palettes
- Dynamic palette switching
- Material Design 3 principles

## Browser Support

- Modern browsers with ES6+ support
- Web Components support (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License
