#!/usr/bin/env node

/**
 * Kill Zombie MCP Servers Tool
 * 
 * Finds and kills zombie Figma MCP server processes that may be left running
 * after improper shutdown or crashes.
 */

import { execSync, spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// Colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getPackageInfo() {
  try {
    const packagePath = join(projectRoot, 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
    return {
      name: packageJson.name || 'figma-mcp-write-server',
      version: packageJson.version || 'unknown'
    };
  } catch (error) {
    return {
      name: 'figma-mcp-write-server',
      version: 'unknown'
    };
  }
}

function findZombieProcesses() {
  try {
    // Find processes related to this MCP server
    const psOutput = execSync('ps aux | grep -E "(figma.*mcp|mcp.*figma|dist/index\\.js)" | grep -v grep', { encoding: 'utf8' });
    
    const processes = psOutput.trim().split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[1];
        const command = parts.slice(10).join(' ');
        
        return {
          pid: parseInt(pid),
          command,
          user: parts[0],
          cpu: parts[2],
          mem: parts[3],
          vsz: parts[4],
          rss: parts[5],
          tt: parts[6],
          stat: parts[7],
          started: parts[8],
          time: parts[9]
        };
      })
      .filter(proc => {
        // Filter for actual MCP server processes
        return proc.command.includes('dist/index.js') || 
               proc.command.includes('figma-mcp-write-server') ||
               (proc.command.includes('node') && proc.command.includes('mcp'));
      });

    return processes;
  } catch (error) {
    // No processes found or command failed
    return [];
  }
}

function findWebSocketPorts() {
  try {
    // Check for processes listening on common MCP ports (8765, 8766, etc.)
    const lsofOutput = execSync('lsof -i :8765 -i :8766 -i :8767 -i :8768 2>/dev/null || true', { encoding: 'utf8' });
    
    const listeners = lsofOutput.trim().split('\n')
      .filter(line => line.trim() !== '' && !line.startsWith('COMMAND'))
      .map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 9) {
          return {
            command: parts[0],
            pid: parseInt(parts[1]),
            user: parts[2],
            type: parts[4],
            device: parts[5],
            node: parts[8]
          };
        }
        return null;
      })
      .filter(proc => proc !== null);

    return listeners;
  } catch (error) {
    return [];
  }
}

function killProcess(pid, signal = 'TERM') {
  try {
    process.kill(pid, signal);
    return true;
  } catch (error) {
    return false;
  }
}

function waitForProcessDeath(pid, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    function check() {
      try {
        // Sending signal 0 checks if process exists without killing it
        process.kill(pid, 0);
        
        if (Date.now() - startTime > timeoutMs) {
          resolve(false); // Timeout
        } else {
          setTimeout(check, 100);
        }
      } catch (error) {
        resolve(true); // Process is dead
      }
    }
    
    check();
  });
}

async function main() {
  const packageInfo = getPackageInfo();
  
  log('🔍 Zombie MCP Server Hunter', 'bold');
  log(`📦 Project: ${packageInfo.name} v${packageInfo.version}`, 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');

  // Check command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const forceKill = args.includes('--force') || args.includes('-f');
  const verbose = args.includes('--verbose') || args.includes('-v');

  if (args.includes('--help') || args.includes('-h')) {
    log('Usage: node kill-zombie-mcp.js [options]', 'green');
    log('');
    log('Options:', 'yellow');
    log('  --dry-run, -d     Show what would be killed without actually killing', 'yellow');
    log('  --force, -f       Use SIGKILL instead of SIGTERM', 'yellow');
    log('  --verbose, -v     Show detailed process information', 'yellow');
    log('  --help, -h        Show this help message', 'yellow');
    return;
  }

  if (dryRun) {
    log('🔍 DRY RUN MODE - No processes will be killed', 'yellow');
  }

  // Find zombie MCP processes
  log('🔍 Searching for zombie MCP server processes...', 'blue');
  const zombieProcesses = findZombieProcesses();

  // Find processes listening on WebSocket ports
  log('🔍 Checking for processes on WebSocket ports...', 'blue');
  const portListeners = findWebSocketPorts();

  // Combine and deduplicate by PID
  const allProcesses = new Map();
  
  zombieProcesses.forEach(proc => {
    allProcesses.set(proc.pid, { ...proc, source: 'process' });
  });
  
  portListeners.forEach(proc => {
    if (allProcesses.has(proc.pid)) {
      allProcesses.get(proc.pid).source = 'both';
    } else {
      allProcesses.set(proc.pid, { ...proc, source: 'port' });
    }
  });

  const processesToKill = Array.from(allProcesses.values());

  if (processesToKill.length === 0) {
    log('✅ No zombie MCP server processes found!', 'green');
    return;
  }

  log(`\n📋 Found ${processesToKill.length} potential zombie process(es):`, 'magenta');
  
  processesToKill.forEach((proc, index) => {
    log(`\n${index + 1}. PID: ${proc.pid}`, 'yellow');
    if (verbose) {
      log(`   User: ${proc.user || 'unknown'}`, 'cyan');
      log(`   Command: ${proc.command || proc.name || 'unknown'}`, 'cyan');
      if (proc.cpu) log(`   CPU: ${proc.cpu}%`, 'cyan');
      if (proc.mem) log(`   Memory: ${proc.mem}%`, 'cyan');
      if (proc.node) log(`   Listening on: ${proc.node}`, 'cyan');
      log(`   Source: ${proc.source}`, 'cyan');
    } else {
      const shortCommand = (proc.command || proc.name || 'unknown').substring(0, 80);
      log(`   ${shortCommand}`, 'cyan');
    }
  });

  if (dryRun) {
    log('\n🔍 DRY RUN - Would kill these processes with:', 'yellow');
    log(`   Signal: ${forceKill ? 'SIGKILL' : 'SIGTERM'}`, 'yellow');
    return;
  }

  log(`\n💀 Killing processes with ${forceKill ? 'SIGKILL' : 'SIGTERM'}...`, 'red');

  let killedCount = 0;
  let failedCount = 0;

  for (const proc of processesToKill) {
    try {
      const signal = forceKill ? 'KILL' : 'TERM';
      const killed = killProcess(proc.pid, signal);
      
      if (killed) {
        log(`✅ Sent ${signal} to PID ${proc.pid}`, 'green');
        
        if (!forceKill) {
          // Wait for graceful shutdown
          const died = await waitForProcessDeath(proc.pid, 3000);
          if (!died) {
            log(`⚠️  PID ${proc.pid} didn't die gracefully, force killing...`, 'yellow');
            killProcess(proc.pid, 'KILL');
            await waitForProcessDeath(proc.pid, 2000);
          }
        }
        
        killedCount++;
      } else {
        log(`❌ Failed to kill PID ${proc.pid} (may already be dead)`, 'red');
        failedCount++;
      }
    } catch (error) {
      log(`❌ Error killing PID ${proc.pid}: ${error.message}`, 'red');
      failedCount++;
    }
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
  log(`📊 Summary:`, 'bold');
  log(`   Killed: ${killedCount}`, killedCount > 0 ? 'green' : 'cyan');
  log(`   Failed: ${failedCount}`, failedCount > 0 ? 'red' : 'cyan');
  log(`   Total:  ${processesToKill.length}`, 'cyan');

  if (killedCount > 0) {
    log('✅ Zombie cleanup complete!', 'green');
  } else if (failedCount > 0) {
    log('⚠️  Some processes could not be killed', 'yellow');
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n\n⚠️  Interrupted by user', 'yellow');
  process.exit(0);
});

// Run the main function
main().catch(error => {
  log(`\n💥 Fatal error: ${error.message}`, 'red');
  if (process.argv.includes('--verbose')) {
    console.error(error);
  }
  process.exit(1);
});