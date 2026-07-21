const fs = require('fs');

// Create a simple SVG gradient
const svg = `<svg width="800" height="120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#79C7A8;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="800" height="120" fill="url(#grad)" />
</svg>`;

fs.writeFileSync('voice-button-gradient.svg', svg);
console.log('SVG gradient created successfully');
