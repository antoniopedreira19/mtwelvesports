
ALTER TABLE clients ADD COLUMN payer_name text;
ALTER TABLE clients ADD COLUMN payer_email text;
ALTER TABLE clients ADD COLUMN payer_phone text;
ALTER TABLE clients ADD COLUMN payer_relationship text DEFAULT 'self';
ALTER TABLE clients ADD COLUMN payment_method text;
