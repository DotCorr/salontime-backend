# SalonTime Backend Scripts

This directory contains utility scripts for database migrations, testing, and maintenance.

## Directory Structure

```
scripts/
├── migrations/        # Database migration scripts
├── utilities/         # One-off utility scripts (can be deleted after use)
└── README.md         # This file
```

## Script Categories

### Migrations (`migrations/`)
**Keep these - they're part of the project history**

- `run-migration.js` - Run country field migration
- `run-role-migration.js` - Ensure role column exists

**How to run:**
```bash
cd scripts/migrations
node run-role-migration.js
```

### Utilities (`utilities/`)
**Can be deleted after use - these are one-off scripts**

- `add-coordinates.js` - Add lat/lng to existing salons
- `add-services-to-salons.js` - Seed services data
- `check-env.js` - Verify environment variables
- `check-status.js` - Check system status
- `fix-user-profile.js` - Fix user profile issues
- `seed-sample-data.js` - Populate database with sample data
- `setup-webhook.js` - Set up Stripe webhooks
- `test-webhook.js` - Test webhook endpoints
- `trigger-webhook.js` - Manually trigger webhooks

## Cleanup Policy

### ✅ Keep Forever
- Migration scripts in `migrations/` folder
- Scripts that are part of deployment process

### 🗑️ Safe to Delete After Use
- Scripts in `utilities/` folder (one-time fixes)
- Scripts with specific dates in commit messages
- Scripts named like `fix-*`, `add-*`, `seed-*`

### Auto-Cleanup
Scripts in `utilities/` folder that haven't been modified in 90+ days can be archived or deleted.

## Creating New Scripts

### For Migrations
```bash
# Create in migrations folder
touch scripts/migrations/your-migration-name.js
```

### For Utilities (temporary)
```bash
# Create in utilities folder
touch scripts/utilities/your-utility-name.js
# Add a comment at top: "// DELETE AFTER: YYYY-MM-DD"
```

## Running Scripts

All scripts should be run from their directory:

```bash
# Migration
cd scripts/migrations
node run-role-migration.js

# Utility
cd scripts/utilities
node seed-sample-data.js
```

## Environment Variables

Most scripts require:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Make sure `.env` file exists in project root.

## Best Practices

1. **Add deletion date** to temporary scripts
2. **Document what the script does** in comments
3. **Move to `utilities/`** if it's a one-time fix
4. **Keep in `migrations/`** if it changes database schema
5. **Delete after successful use** if marked as temporary

## Archiving Old Scripts

Before deleting, you can archive to a separate branch:

```bash
git checkout -b archive/old-scripts-2025-10
git add scripts/utilities/old-script.js
git commit -m "Archive: Old utility scripts from October 2025"
git push origin archive/old-scripts-2025-10
```

Then delete from main:
```bash
git checkout main
git rm scripts/utilities/old-script.js
git commit -m "Clean up old utility scripts"
```

