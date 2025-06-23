#!/bin/bash

# 🚂 Полезные команды Railway для Instagram Scraper Bot
# Использование: source scripts/railway-commands.sh

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚂 Railway Commands для Instagram Scraper Bot${NC}"
echo "================================================"

# Функции для удобства
railway_status() {
    echo -e "${GREEN}📊 Статус проекта:${NC}"
    railway status
}

railway_logs_live() {
    echo -e "${GREEN}📝 Живые логи:${NC}"
    railway logs --tail
}

railway_logs_recent() {
    echo -e "${GREEN}📝 Последние 100 строк логов:${NC}"
    railway logs --tail 100
}

railway_vars() {
    echo -e "${GREEN}🔧 Переменные окружения:${NC}"
    railway variables
}

railway_db_connect() {
    echo -e "${GREEN}🗄️ Подключение к PostgreSQL:${NC}"
    railway connect postgresql
}

railway_redeploy() {
    echo -e "${GREEN}🔄 Перезапуск деплоя:${NC}"
    railway redeploy
}

railway_shell() {
    echo -e "${GREEN}💻 Подключение к контейнеру:${NC}"
    railway shell
}

railway_add_var() {
    if [ -z "$1" ] || [ -z "$2" ]; then
        echo -e "${YELLOW}Использование: railway_add_var KEY VALUE${NC}"
        return 1
    fi
    echo -e "${GREEN}➕ Добавление переменной $1:${NC}"
    railway variables set "$1=$2"
}

railway_remove_var() {
    if [ -z "$1" ]; then
        echo -e "${YELLOW}Использование: railway_remove_var KEY${NC}"
        return 1
    fi
    echo -e "${GREEN}➖ Удаление переменной $1:${NC}"
    railway variables delete "$1"
}

railway_health_check() {
    PROJECT_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    if [ -n "$PROJECT_URL" ]; then
        echo -e "${GREEN}🏥 Health Check:${NC}"
        curl -s "$PROJECT_URL/health" | jq . 2>/dev/null || curl -s "$PROJECT_URL/health"
    else
        echo -e "${YELLOW}⚠️ URL проекта не найден${NC}"
    fi
}

railway_api_test() {
    PROJECT_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    if [ -n "$PROJECT_URL" ]; then
        echo -e "${GREEN}🔌 Тест API:${NC}"
        curl -s "$PROJECT_URL/api" | jq . 2>/dev/null || curl -s "$PROJECT_URL/api"
    else
        echo -e "${YELLOW}⚠️ URL проекта не найден${NC}"
    fi
}

railway_backup_vars() {
    echo -e "${GREEN}💾 Создание бэкапа переменных:${NC}"
    railway variables > "railway-vars-backup-$(date +%Y%m%d-%H%M%S).txt"
    echo "Бэкап сохранен в railway-vars-backup-*.txt"
}

railway_monitor() {
    echo -e "${GREEN}📊 Мониторинг проекта (Ctrl+C для выхода):${NC}"
    while true; do
        clear
        echo "=== Railway Monitor - $(date) ==="
        railway status
        echo ""
        echo "=== Последние логи ==="
        railway logs --tail 10
        sleep 30
    done
}

# Алиасы для удобства
alias rs='railway_status'
alias rl='railway_logs_recent'
alias rll='railway_logs_live'
alias rv='railway_vars'
alias rdb='railway_db_connect'
alias rr='railway_redeploy'
alias rsh='railway_shell'
alias rhc='railway_health_check'
alias rat='railway_api_test'
alias rbv='railway_backup_vars'
alias rm='railway_monitor'

# Показать доступные команды
show_commands() {
    echo -e "${BLUE}📋 Доступные команды:${NC}"
    echo ""
    echo -e "${GREEN}Основные:${NC}"
    echo "  rs, railway_status      - Статус проекта"
    echo "  rl, railway_logs_recent - Последние логи"
    echo "  rll, railway_logs_live  - Живые логи"
    echo "  rv, railway_vars        - Переменные окружения"
    echo "  rr, railway_redeploy    - Перезапуск"
    echo ""
    echo -e "${GREEN}База данных:${NC}"
    echo "  rdb, railway_db_connect - Подключение к PostgreSQL"
    echo ""
    echo -e "${GREEN}Переменные:${NC}"
    echo "  railway_add_var KEY VAL - Добавить переменную"
    echo "  railway_remove_var KEY  - Удалить переменную"
    echo "  rbv, railway_backup_vars - Бэкап переменных"
    echo ""
    echo -e "${GREEN}Тестирование:${NC}"
    echo "  rhc, railway_health_check - Health check"
    echo "  rat, railway_api_test     - Тест API"
    echo ""
    echo -e "${GREEN}Мониторинг:${NC}"
    echo "  rm, railway_monitor     - Мониторинг в реальном времени"
    echo "  rsh, railway_shell      - Подключение к контейнеру"
    echo ""
    echo -e "${YELLOW}Примеры:${NC}"
    echo "  railway_add_var BOT_TOKEN 'your_token_here'"
    echo "  railway_remove_var DEBUG_MODE"
    echo "  rs && rhc  # Статус + health check"
}

# Показать команды при загрузке
show_commands

echo ""
echo -e "${GREEN}✅ Railway команды загружены!${NC}"
echo -e "${BLUE}💡 Используйте 'show_commands' для просмотра всех команд${NC}"
