ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR(255); ALTER TABLE salons ADD COLUMN IF NOT EXISTS stripe_account_status VARCHAR(20) DEFAULT 'pending';
