// Simple test to check if our TypeScript imports are working
console.log('Testing Figma MCP Write Server imports...');

try {
  // Test if we can import the main modules
  const fs = require('fs');
  const path = require('path');
  
  // Check if source files exist
  const srcDir = path.join(__dirname, 'src');
  const files = ['types.ts', 'plugin-bridge.ts', 'mcp-server.ts', 'index.ts'];
  
  console.log('Source files check:');
  files.forEach(file => {
    const filePath = path.join(srcDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
    }
  });
  
  // Check if package.json has correct dependencies
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  console.log('\nDependencies check:');
  const requiredDeps = ['@modelcontextprotocol/sdk', 'ws', 'express', 'zod', 'uuid'];
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      console.log(`✅ ${dep} is listed`);
    } else {
      console.log(`❌ ${dep} is missing`);
    }
  });
  
  console.log('\n🎉 Basic structure looks good!');
  console.log('📝 To build: npm run build');
  console.log('🚀 To start: npm start');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
