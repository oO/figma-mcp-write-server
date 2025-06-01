#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function injectVersion() {
    try {
        // Read package.json
        const packageJson = JSON.parse(
            await fs.readFile(path.join(rootDir, 'package.json'), 'utf8')
        );
        const version = packageJson.version;

        // Read template file
        const template = await fs.readFile(
            path.join(rootDir, 'figma-plugin', 'ui.template.html'),
            'utf8'
        );

        // Replace version placeholder
        const output = template.replace('{{VERSION}}', version);

        // Write to final UI file
        await fs.writeFile(
            path.join(rootDir, 'figma-plugin', 'ui.html'),
            output,
            'utf8'
        );

        console.log(`✅ Successfully injected version ${version} into plugin UI`);
    } catch (error) {
        console.error('❌ Error building plugin UI:', error);
        process.exit(1);
    }
}

injectVersion();