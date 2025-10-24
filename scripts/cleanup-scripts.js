#!/usr/bin/env node

/**
 * Script Cleanup Utility
 * 
 * This script helps identify and optionally delete old utility scripts
 * that are no longer needed.
 * 
 * Usage:
 *   node cleanup-scripts.js --list          # List old scripts
 *   node cleanup-scripts.js --archive       # Archive then delete
 *   node cleanup-scripts.js --delete-old    # Delete scripts older than 90 days
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const UTILITIES_DIR = path.join(__dirname, 'utilities');
const DAYS_OLD_THRESHOLD = 90;

function getDaysOld(filePath) {
  const stats = fs.statSync(filePath);
  const now = new Date();
  const modified = new Date(stats.mtime);
  const diffTime = Math.abs(now - modified);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function listOldScripts() {
  console.log('\n📋 Analyzing utility scripts...\n');
  
  if (!fs.existsSync(UTILITIES_DIR)) {
    console.log('❌ Utilities directory not found');
    return [];
  }

  const files = fs.readdirSync(UTILITIES_DIR).filter(f => f.endsWith('.js'));
  const oldScripts = [];

  files.forEach(file => {
    const filePath = path.join(UTILITIES_DIR, file);
    const daysOld = getDaysOld(filePath);
    
    console.log(`📄 ${file}`);
    console.log(`   Last modified: ${daysOld} days ago`);
    
    if (daysOld > DAYS_OLD_THRESHOLD) {
      console.log(`   ⚠️  OLD - Can be cleaned up`);
      oldScripts.push({ file, daysOld, filePath });
    } else {
      console.log(`   ✅ Recent - Keep for now`);
    }
    console.log('');
  });

  return oldScripts;
}

function archiveScripts(scripts) {
  if (scripts.length === 0) {
    console.log('✅ No old scripts to archive');
    return;
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const branchName = `archive/scripts-${timestamp}`;

  console.log(`\n📦 Creating archive branch: ${branchName}\n`);

  try {
    // Create and switch to archive branch
    execSync(`git checkout -b ${branchName}`, { stdio: 'inherit' });

    // Add scripts to archive
    scripts.forEach(({ file, filePath }) => {
      console.log(`   Adding ${file} to archive`);
      execSync(`git add ${filePath}`, { stdio: 'inherit' });
    });

    // Commit archive
    const filesList = scripts.map(s => s.file).join(', ');
    execSync(`git commit -m "Archive: Old utility scripts (${filesList})"`, { stdio: 'inherit' });

    // Push archive branch
    execSync(`git push origin ${branchName}`, { stdio: 'inherit' });

    // Switch back to main
    execSync('git checkout main', { stdio: 'inherit' });

    console.log(`\n✅ Scripts archived to branch: ${branchName}`);
    console.log('   You can now delete them from main branch\n');

  } catch (error) {
    console.error('❌ Failed to archive scripts:', error.message);
    execSync('git checkout main', { stdio: 'inherit' }); // Ensure we're back on main
  }
}

function deleteOldScripts(scripts) {
  if (scripts.length === 0) {
    console.log('✅ No old scripts to delete');
    return;
  }

  console.log(`\n🗑️  Deleting ${scripts.length} old script(s)...\n`);

  scripts.forEach(({ file, filePath }) => {
    try {
      fs.unlinkSync(filePath);
      console.log(`   ✅ Deleted: ${file}`);
    } catch (error) {
      console.error(`   ❌ Failed to delete ${file}:`, error.message);
    }
  });

  console.log('\n✅ Cleanup complete!');
  console.log('   Remember to commit these changes:\n');
  console.log('   git add scripts/utilities/');
  console.log('   git commit -m "Clean up old utility scripts"');
  console.log('   git push origin main\n');
}

function showHelp() {
  console.log(`
📚 Script Cleanup Utility

Usage:
  node cleanup-scripts.js [option]

Options:
  --list          List all utility scripts and their age
  --archive       Archive old scripts to a git branch, then delete
  --delete-old    Delete scripts older than ${DAYS_OLD_THRESHOLD} days (without archiving)
  --help          Show this help message

Examples:
  # See what would be cleaned up
  node cleanup-scripts.js --list

  # Archive then delete (recommended)
  node cleanup-scripts.js --archive

  # Just delete without archiving
  node cleanup-scripts.js --delete-old
`);
}

// Main execution
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case '--list':
    listOldScripts();
    break;

  case '--archive':
    const scriptsToArchive = listOldScripts();
    if (scriptsToArchive.length > 0) {
      console.log('\n⚠️  This will archive and delete old scripts.');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      setTimeout(() => {
        archiveScripts(scriptsToArchive);
        deleteOldScripts(scriptsToArchive);
      }, 5000);
    }
    break;

  case '--delete-old':
    const scriptsToDelete = listOldScripts();
    if (scriptsToDelete.length > 0) {
      console.log('\n⚠️  This will DELETE old scripts without archiving!');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      setTimeout(() => {
        deleteOldScripts(scriptsToDelete);
      }, 5000);
    }
    break;

  case '--help':
  default:
    showHelp();
    break;
}

