const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 AI Phone Screen Documentation - Build & Copy');
console.log('=' .repeat(50));

const webappPublicDir = path.join(__dirname, '../webapp/public');
const docsOutputDir = path.join(webappPublicDir, 'documentation');
const buildDir = path.join(__dirname, 'build');

// Check if webapp exists (graceful handling for isolation)
if (!fs.existsSync(webappPublicDir)) {
  console.log('❌ Webapp public directory not found');
  console.log('   Expected:', webappPublicDir);
  console.log('   Skipping copy - documentation can still be built independently');
  process.exit(0);
}

try {
  console.log('📦 Building Docusaurus documentation...');
  execSync('npm run build', { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  
  console.log('✅ Documentation build complete!');
  
  console.log('📁 Copying files to webapp...');
  
  // Remove existing docs in webapp (if any)
  if (fs.existsSync(docsOutputDir)) {
    console.log('   Removing existing documentation...');
    fs.rmSync(docsOutputDir, { recursive: true });
  }
  
  // Create documentation directory
  fs.mkdirSync(docsOutputDir, { recursive: true });
  
  // Copy all built files
  console.log('   Copying build files...');
  copyDirectory(buildDir, docsOutputDir);
  
  console.log('✅ Documentation successfully copied to webapp!');
  console.log('');
  console.log('📍 Documentation available at:');
  console.log('   Development: http://localhost:3000/documentation/');
  console.log('   Production:  https://phone-screen.acedit.ai/documentation/');
  console.log('');
  console.log('🎉 Ready for webapp deployment!');
  
} catch (error) {
  console.error('❌ Build failed:', error.message);
  console.log('');
  console.log('💡 Troubleshooting:');
  console.log('   1. Make sure you\'re in the documentation directory');
  console.log('   2. Run "npm install" if dependencies are missing');
  console.log('   3. Check for broken links in documentation');
  process.exit(1);
}

/**
 * Recursively copy directory contents
 */
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
} 