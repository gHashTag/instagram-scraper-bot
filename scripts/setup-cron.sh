#!/bin/bash

# Скрипт для настройки автоматического обновления данных каждый день

echo "🤖 Настройка автоматического обновления данных..."

# Получаем текущую директорию проекта
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "📁 Директория проекта: $PROJECT_DIR"

# Проверяем наличие bun
if ! command -v bun &> /dev/null; then
    echo "❌ Bun не найден. Установите Bun для работы скрипта."
    exit 1
fi

# Создаем скрипт-обертку для cron
CRON_SCRIPT="$PROJECT_DIR/scripts/daily-update-wrapper.sh"
cat > "$CRON_SCRIPT" << EOF
#!/bin/bash

# Переходим в директорию проекта
cd "$PROJECT_DIR"

# Устанавливаем переменные окружения
export PATH="/usr/local/bin:/usr/bin:/bin:\$PATH"

# Логируем начало выполнения
echo "\$(date): Начало автоматического обновления" >> "$PROJECT_DIR/logs/auto-update.log"

# Запускаем автоматическое обновление
bun run auto:update 2>&1 >> "$PROJECT_DIR/logs/auto-update.log"

# Логируем завершение
echo "\$(date): Завершение автоматического обновления" >> "$PROJECT_DIR/logs/auto-update.log"
echo "---" >> "$PROJECT_DIR/logs/auto-update.log"
EOF

# Делаем скрипт исполняемым
chmod +x "$CRON_SCRIPT"

# Создаем директорию для логов
mkdir -p "$PROJECT_DIR/logs"

# Предлагаем добавить задачу в cron
echo ""
echo "📋 Для автоматического запуска каждый день в 9:00 утра добавьте в cron:"
echo ""
echo "crontab -e"
echo ""
echo "И добавьте строку:"
echo "0 9 * * * $CRON_SCRIPT"
echo ""
echo "🔍 Для проверки текущих задач cron:"
echo "crontab -l"
echo ""
echo "📊 Логи автоматического обновления будут в:"
echo "$PROJECT_DIR/logs/auto-update.log"
echo ""

# Предлагаем протестировать
echo "🧪 Хотите протестировать автоматическое обновление сейчас? (y/n)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🚀 Запускаем тестовое обновление..."
    bash "$CRON_SCRIPT"
    echo "✅ Тестовое обновление завершено. Проверьте логи в $PROJECT_DIR/logs/auto-update.log"
fi

echo ""
echo "🎉 Настройка завершена!"
echo "📖 Подробная документация в AUTOMATION_GUIDE.md" 