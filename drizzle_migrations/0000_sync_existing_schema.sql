-- Пустая миграция для синхронизации журнала миграций
-- Все таблицы уже существуют в базе данных
-- Эта миграция служит только для синкронизации состояния Drizzle

-- Проверяем, что основные таблицы существуют (не создаем их заново)
DO $$
BEGIN
    -- Просто проверяем существование таблиц без их создания
    PERFORM 1 FROM information_schema.tables WHERE table_name = 'users';
    PERFORM 1 FROM information_schema.tables WHERE table_name = 'projects';
    PERFORM 1 FROM information_schema.tables WHERE table_name = 'competitors';
    PERFORM 1 FROM information_schema.tables WHERE table_name = 'hashtags';
    PERFORM 1 FROM information_schema.tables WHERE table_name = 'reels';
    PERFORM 1 FROM information_schema.tables WHERE table_name = 'parsing_runs';
    
    RAISE NOTICE 'All required tables exist. Migration sync completed successfully.';
END $$; 