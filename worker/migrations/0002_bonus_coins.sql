-- Coins granted to an account (gifts, promotions, test accounts), on top of coins earned in games.
ALTER TABLE users ADD COLUMN bonus_coins INTEGER NOT NULL DEFAULT 0;
