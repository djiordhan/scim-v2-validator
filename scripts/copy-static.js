const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'frontend', 'out');
const dest = path.join(__dirname, '..', 'backend', 'dist', 'public');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (!fs.existsSync(src)) {
  console.error('Error: frontend/out not found. Run the frontend build first.');
  process.exit(1);
}

copyDir(src, dest);
console.log(`Static files copied: frontend/out -> backend/dist/public`);
