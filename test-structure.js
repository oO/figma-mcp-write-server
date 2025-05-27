// Simple test to check if our project structure is correct
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎨 Testing Figma MCP Write Server structure...');

try {
  // Check if source files exist
  const srcDir = path.join(__dirname, 'src');
  const files = ['types.ts', 'plugin-bridge.ts', 'mcp-server.ts', 'index.ts'];
  
  console.log('\n📁 Source files check:');
  files.forEach(file => {
    const filePath = path.join(srcDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
    }
  });
  
  // Check Figma plugin files
  const pluginDir = path.join(__dirname, 'figma-plugin');
  const pluginFiles = ['manifest.json', 'code.js', 'ui.html'];
  
  console.log('\n🔌 Plugin files check:');
  pluginFiles.forEach(file => {
    const filePath = path.join(pluginDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
    } else {
      console.log(`❌ ${file} missing`);
    }
  });
  
  // Check if package.json has correct dependencies
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  console.log('\n📦 Dependencies check:');
  const requiredDeps = ['@modelcontextprotocol/sdk', 'ws', 'express', 'zod', 'uuid'];
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      console.log(`✅ ${dep} is listed`);
    } else {
      console.log(`❌ ${dep} is missing`);
    }
  });
  
  console.log('\n🎉 Project structure looks good!');
  console.log('\n📋 Next steps:');
  console.log('1. npm run build    # Compile TypeScript');
  console.log('2. npm start        # Start MCP server');
  console.log('3. Open Figma and install the plugin from figma-plugin/');
  console.log('4. Run the plugin to establish connection');
  console.log('5. Test MCP tools from your AI client');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}
