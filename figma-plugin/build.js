#!/usr/bin/env node

import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const config = {
  entryPoint: join(__dirname, 'src/main.ts'),
  outfile: join(__dirname, 'code.js'),
  distDir: join(__dirname, 'dist'),
  tempFile: join(__dirname, 'dist/bundled.js'),
  uiTemplate: join(__dirname, 'ui.template.html'),
  uiOutput: join(__dirname, 'ui.html'),
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production'
};

// Ensure dist directory exists
if (!existsSync(config.distDir)) {
  mkdirSync(config.distDir, { recursive: true });
}

// Figma plugin preamble for runtime checks
const figmaPreamble = `
// Plugin environment setup
if (typeof figma === 'undefined') {
  throw new Error('This code must run in the Figma plugin environment');
}
`.trim();

// Get version and port from package.json and config
function getBuildInfo() {
  const packageJsonPath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
  
  // Load port from config file if available
  let port = 8765; // Default
  try {
    const os = require('os');
    const yaml = require('js-yaml');
    const configFile = join(os.homedir(), 'Library', 'Application Support', 'figma-mcp-write-server', 'config.yaml');
    const configContent = readFileSync(configFile, 'utf-8');
    const config = yaml.load(configContent);
    if (config.port) {
      port = config.port;
    }
  } catch (error) {
    // Config file doesn't exist or can't be read, use default
    console.log('⚠️ Using default port 8765 (config file not found)');
  }
  
  return {
    version: packageJson.version,
    port: port
  };
}

// Process UI template
function processUITemplate(buildInfo) {
  console.log('🎨 Processing UI template...');
  
  const template = readFileSync(config.uiTemplate, 'utf-8');
  const processed = template
    .replace(/\{\{VERSION\}\}/g, buildInfo.version)
    .replace(/\{\{PORT\}\}/g, buildInfo.port);
  
  writeFileSync(config.uiOutput, processed, 'utf-8');
  console.log(`✅ UI template processed: ${config.uiOutput}`);
  console.log(`📡 WebSocket port: ${buildInfo.port}`);
}

async function build() {
  console.log('🏗️  Building Figma plugin...');
  
  try {
    // Step 0: Get build info and process UI template
    const buildInfo = getBuildInfo();
    processUITemplate(buildInfo);
    
    // Step 1: Bundle TypeScript modules
    console.log('📦 Bundling TypeScript modules...');
    await esbuild.build({
      entryPoints: [config.entryPoint],
      bundle: true,
      outfile: config.tempFile,
      format: 'iife',
      target: 'es2015',
      platform: 'browser',
      minify: config.minify,
      sourcemap: config.sourcemap,
      treeShaking: true,
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        'PLUGIN_VERSION': JSON.stringify(buildInfo.version)
      },
      banner: {
        js: '// Figma MCP Plugin - Generated Bundle\n'
      },
      footer: {
        js: '\n// End of bundle'
      },
      logLevel: 'info',
      color: true
    });

    // Step 2: Read the bundled file
    console.log('📝 Processing bundle...');
    let bundledCode = readFileSync(config.tempFile, 'utf-8');

    // Step 3: Add Figma-specific optimizations
    const optimizedCode = `
${figmaPreamble}

${bundledCode}
`.trim();

    // Step 4: Write final code.js
    writeFileSync(config.outfile, optimizedCode, 'utf-8');
    
    // Step 5: Calculate file sizes
    const originalSize = bundledCode.length;
    const finalSize = optimizedCode.length;
    const compressionRatio = ((originalSize - finalSize) / originalSize * 100).toFixed(1);
    
    console.log('✅ Build completed successfully!');
    console.log(`📊 Bundle size: ${(finalSize / 1024).toFixed(1)}KB`);
    console.log(`🎯 Output: ${config.outfile}`);
    
    if (config.minify) {
      console.log('🗜️  Minification: enabled');
    }
    
    if (config.sourcemap) {
      console.log('🗺️  Source maps: enabled');
    }

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// CLI handling
const args = process.argv.slice(2);

if (args.includes('--watch') || args.includes('-w')) {
  console.log('👀 Watching for changes...');
  
  // Process UI template initially
  const buildInfo = getBuildInfo();
  processUITemplate(buildInfo);
  
  const context = await esbuild.context({
    entryPoints: [config.entryPoint],
    bundle: true,
    outfile: config.tempFile,
    format: 'iife',
    target: 'es2015',
    platform: 'browser',
    minify: false,
    sourcemap: true,
    treeShaking: true,
    plugins: [{
      name: 'figma-post-process',
      setup(build) {
        build.onEnd(async (result) => {
          if (result.errors.length === 0) {
            try {
              let bundledCode = readFileSync(config.tempFile, 'utf-8');
              
              const optimizedCode = `${figmaPreamble}\n\n${bundledCode}`;
              writeFileSync(config.outfile, optimizedCode, 'utf-8');
              console.log('🔄 Plugin rebuilt');
            } catch (error) {
              console.error('❌ Post-process failed:', error.message);
            }
          }
        });
      }
    }]
  });

  await context.watch();
  console.log('🚀 Watching... Press Ctrl+C to stop');
  
  // Keep process alive
  process.on('SIGINT', async () => {
    console.log('\n⏹️  Stopping watch mode...');
    await context.dispose();
    process.exit(0);
  });

} else {
  // Single build
  await build();
}