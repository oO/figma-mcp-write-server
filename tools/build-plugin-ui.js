#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { getDefaultPaths } from '../dist/config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function getConfigPaths() {
    // Use cross-platform path utilities
    return getDefaultPaths();
}

async function loadConfig() {
    const paths = getConfigPaths();
    
    // Default configuration
    const defaultConfig = {
        port: 8765,
        host: 'localhost'
    };
    
    try {
        // Try to read config file using cross-platform path
        const configContent = await fs.readFile(paths.configFile, 'utf8');
        const config = yaml.load(configContent);
        return { ...defaultConfig, ...config };
    } catch (error) {
        // If config file doesn't exist or can't be read, use defaults
        console.log('⚠️ Using default configuration (config file not found or unreadable)');
        return defaultConfig;
    }
}

async function injectConfigAndVersion() {
    try {
        // Read package.json for version
        const packageJson = JSON.parse(
            await fs.readFile(path.join(rootDir, 'package.json'), 'utf8')
        );
        const version = packageJson.version;

        // Load configuration
        const config = await loadConfig();

        // Read template file
        const template = await fs.readFile(
            path.join(rootDir, 'figma-plugin', 'ui.template.html'),
            'utf8'
        );

        // Replace placeholders
        const output = template
            .replace(/{{VERSION}}/g, version)
            .replace(/{{PORT}}/g, config.port)
            .replace(/{{HOST}}/g, config.host);

        // Write to final UI file
        await fs.writeFile(
            path.join(rootDir, 'figma-plugin', 'ui.html'),
            output,
            'utf8'
        );

        console.log(`✅ Successfully injected version ${version} and config (port: ${config.port}) into plugin UI`);
    } catch (error) {
        console.error('❌ Error building plugin UI:', error);
        process.exit(1);
    }
}

injectConfigAndVersion();