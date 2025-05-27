# AI Phone Screen Documentation

This directory contains the Docusaurus documentation site for the AI Phone Screen project.

## 🔗 Complete Isolation

This documentation folder is **completely independent** and can be removed without affecting the main webapp.

## Development

```bash
cd documentation
npm install
npm start
```

The documentation site will be available at `http://localhost:3001`

## Configuration

The site is configured for **subpath hosting** at `/documentation/`:

- **Base URL**: `/documentation/`
- **Production URL**: `https://phone-screen.acedit.ai/documentation/`
- **Blog**: Disabled (as requested)
- **Docs Route**: Served at root of `/documentation/` (not `/documentation/docs/`)

## Scripts

- `npm start` - Start development server on port 3001
- `npm run build` - Build static files for production (configured for `/documentation/` subpath)
- **`npm run build-and-copy`** - Build docs and copy to webapp's public folder
- `npm run serve` - Serve built files locally to test production build
- `npm run clear` - Clear Docusaurus cache

## Build & Copy Process

1. **`npm run build-and-copy`** - Automatically builds and copies documentation to webapp
2. Static files are placed in `webapp/public/documentation/`
3. Next.js serves them at `http://localhost:3000/documentation/`

### Graceful Fallbacks

- If `webapp/` directory doesn't exist, the script gracefully skips copying
- Documentation can always be built and served independently
- Perfect for contributors who only want to work on docs

## Removal Instructions

To completely remove documentation from this project:

1. Delete this entire `/documentation` directory
2. Remove documentation routes from `webapp/next.config.mjs`:
   ```javascript
   // Remove all /documentation routes from rewrites and redirects
   ```
3. Remove documentation link from `webapp/components/top-bar.tsx`:
   ```jsx
   // Remove the "Docs" link and BookOpen icon
   ```
