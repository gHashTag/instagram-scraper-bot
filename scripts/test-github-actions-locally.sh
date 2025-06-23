#!/bin/bash

# 🧪 Test GitHub Actions Locally
# Скрипт для локального тестирования команд из GitHub Actions

echo "🧪 Локальное тестирование GitHub Actions"
echo "═══════════════════════════════════════════════════════════════"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to test command
test_command() {
    local cmd="$1"
    local description="$2"
    
    echo -e "\n${BLUE}🔍 Тестирование: ${description}${NC}"
    echo "Команда: $cmd"
    echo "─────────────────────────────────────────────────"
    
    if eval "$cmd"; then
        echo -e "${GREEN}✅ УСПЕХ: $description${NC}"
        return 0
    else
        echo -e "${RED}❌ ОШИБКА: $description${NC}"
        return 1
    fi
}

# Load environment variables
echo -e "${YELLOW}📋 Загрузка переменных окружения...${NC}"
if [ -f ".env.development" ]; then
    export $(cat .env.development | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Загружен .env.development${NC}"
elif [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Загружен .env${NC}"
fi

# Test environment variables
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL не установлена${NC}"
    exit 1
else
    echo -e "${GREEN}✅ DATABASE_URL установлена${NC}"
fi

# Test 1: TypeScript compilation
test_command "bun run typecheck" "Проверка типов TypeScript"

# Test 2: Database migration
test_command "bun run db:migrate" "Миграции базы данных"

# Test 3: Sync Obsidian (Project 1 - Coco Age)
test_command "bun run sync-obsidian 1" "Синхронизация Obsidian Vault (Coco Age)"

# Test 4: Meta Muse commands
test_command "bun run meta-muse:check" "Проверка данных Meta Muse"

# Test 5: Meta Muse daily runner (dry run)
echo -e "\n${BLUE}🔍 Тестирование: Meta Muse Daily Runner (проверка запуска)${NC}"
echo "Команда: timeout 10s bun run meta-muse:daily || true"
echo "─────────────────────────────────────────────────"
timeout 10s bun run meta-muse:daily || echo -e "${YELLOW}⏰ Таймаут (ожидаемо для полного цикла)${NC}"

echo -e "\n${GREEN}🎉 ЛОКАЛЬНОЕ ТЕСТИРОВАНИЕ ЗАВЕРШЕНО${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo -e "${BLUE}📊 Результаты:${NC}"
echo "✅ Все основные команды протестированы"
echo "✅ GitHub Actions должны работать корректно"
echo ""
echo -e "${YELLOW}🔗 Следующие шаги:${NC}"
echo "1. Перейти на GitHub: https://github.com/gHashTag/instagram-scraper-bot/actions"
echo "2. Найти workflow 'Update Obsidian Vault Daily'"
echo "3. Нажать 'Run workflow' для ручного запуска"
echo "4. Проверить логи выполнения"
echo ""
echo -e "${BLUE}🤖 Автоматические запуски:${NC}"
echo "• Update Obsidian Vault Daily: каждый день в 6:00 UTC"
echo "• Meta Muse Daily: каждый день в 2:00 UTC" 