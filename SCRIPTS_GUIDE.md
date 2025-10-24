# Quick Script Management Guide

## 🎯 Quick Commands

```bash
# List all utility scripts and their age
npm run scripts:list

# Archive and delete old scripts (safe)
npm run scripts:cleanup

# Run role migration
npm run migration:role

# Run country migration
npm run migration:country
```

## 📁 Where Scripts Go

### Keep Forever → `scripts/migrations/`
- Database migrations
- Schema changes
- Critical setup scripts

### Temporary → `scripts/utilities/`
- One-time fixes
- Data seeding
- Testing utilities
- **Delete after 90 days or when done**

### Quick Temp → `scripts/temp/` (git ignored)
- Quick test scripts
- Personal experiments
- Auto-ignored by git

## 🗑️ Deleting Old Scripts

### Automatic (Recommended)
```bash
npm run scripts:cleanup
# Archives to git branch, then deletes
```

### Manual
```bash
# List old scripts first
npm run scripts:list

# Delete manually
rm scripts/utilities/old-script.js
```

## ✨ Creating New Scripts

### Migration Script
```bash
# Create new migration
touch scripts/migrations/my-migration.js

# Add this template:
#!/usr/bin/env node
require('dotenv').config();
// Your migration code
```

### Temporary Utility
```bash
# Create in utilities (will be cleaned up later)
touch scripts/utilities/fix-something.js

# Add deletion reminder at top:
// DELETE AFTER: 2025-11-01
```

### Quick Test Script (auto-ignored)
```bash
mkdir -p scripts/temp
touch scripts/temp/test.js
# Won't be committed to git
```

## 📊 Current Scripts

### Migrations (Keep)
- `run-role-migration.js` - Ensure role column exists
- `run-migration.js` - Add country field to salons

### Utilities (Clean up when done)
- `add-coordinates.js` - Add lat/lng to salons
- `add-services-to-salons.js` - Seed services
- `check-env.js` - Verify environment
- `check-status.js` - System status
- `fix-user-profile.js` - Fix profile issues
- `seed-sample-data.js` - Sample data
- `setup-webhook.js` - Stripe webhooks
- `test-webhook.js` - Test webhooks
- `trigger-webhook.js` - Manual webhook trigger

## 🔧 Cleanup Policy

**Auto-delete after:**
- 90 days without modification
- Task is completed
- No longer needed

**Before deleting:**
1. Run `npm run scripts:cleanup` (archives first)
2. Or manually archive to git branch
3. Then delete from main

## 💡 Pro Tips

1. **Add deletion dates** to temp scripts
2. **Use descriptive names** like `fix-user-roles-2025-10.js`
3. **Document what it does** in comments
4. **Run cleanup monthly** to keep repo clean
5. **Keep migrations forever** - they're project history

## 📝 Script Template

```javascript
#!/usr/bin/env node

/**
 * Script: [Purpose]
 * Created: 2025-10-24
 * DELETE AFTER: 2025-11-24 (or when task is done)
 * 
 * What it does:
 * - [Brief description]
 * 
 * How to run:
 * cd scripts/utilities
 * node script-name.js
 */

require('dotenv').config();

async function main() {
  try {
    console.log('Starting...');
    // Your code here
    console.log('✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
```

