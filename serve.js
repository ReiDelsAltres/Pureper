// Simple local development server
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Remove query string and decode URL
  let pathname = decodeURIComponent(req.url.split('?')[0]);
  
  // Serve index.html for SPA routes
  if (pathname === '/' || (!path.extname(pathname) && pathname !== '/404.html')) {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);

  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File not found, serve 404.html if it exists, otherwise serve index.html for SPA
      const notFoundPath = path.join(__dirname, '404.html');
      fs.access(notFoundPath, fs.constants.F_OK, (notFoundErr) => {
        if (notFoundErr) {
          // No 404.html, serve index.html for SPA
          serveFile(path.join(__dirname, 'index.html'), res);
        } else {
          serveFile(notFoundPath, res, 404);
        }
      });
      return;
    }

    // Serve the file
    serveFile(filePath, res);
  });
});

function serveFile(filePath, res, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end(`Error loading file: ${err.message}`);
      return;
    }

    res.writeHead(statusCode, { 'Content-Type': mimeType });
    res.end(content, 'utf-8');
  });
}

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
