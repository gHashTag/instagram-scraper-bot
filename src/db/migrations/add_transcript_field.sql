-- Добавляем поле transcript в таблицу reels
ALTER TABLE reels ADD COLUMN IF NOT EXISTS transcript TEXT;
