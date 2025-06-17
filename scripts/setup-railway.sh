#!/bin/bash

# 🚂 Скрипт автоматической настройки Railway для Instagram Scraper Bot
# Использование: bash scripts/setup-railway.sh

set -e  # Остановка при ошибке

echo "🚂 Настройка Railway для Instagram Scraper Bot"
echo "=============================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода цветного текста
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Проверка наличия Railway CLI
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        print_warning "Railway CLI не установлен. Устанавливаем..."
        
        # Установка Railway CLI
        if command -v npm &> /dev/null; then
            npm install -g @railway/cli
            print_status "Railway CLI установлен через npm"
        elif command -v curl &> /dev/null; then
            curl -fsSL https://railway.app/install.sh | sh
            print_status "Railway CLI установлен через curl"
        else
            print_error "Не удалось установить Railway CLI. Установите вручную: https://docs.railway.app/develop/cli"
            exit 1
        fi
    else
        print_status "Railway CLI уже установлен"
    fi
}

# Проверка авторизации в Railway
check_railway_auth() {
    if ! railway whoami &> /dev/null; then
        print_warning "Необходима авторизация в Railway"
        print_info "Откроется браузер для входа в Railway..."
        railway login
        print_status "Авторизация в Railway выполнена"
    else
        USER=$(railway whoami)
        print_status "Вы авторизованы как: $USER"
    fi
}

# Проверка наличия конфигурационных файлов
check_config_files() {
    print_info "Проверка конфигурационных файлов..."
    
    if [[ ! -f "railway.json" ]]; then
        print_error "Файл railway.json не найден!"
        exit 1
    fi
    print_status "railway.json найден"
    
    if [[ ! -f ".railwayignore" ]]; then
        print_warning ".railwayignore не найден, но это не критично"
    else
        print_status ".railwayignore найден"
    fi
    
    if [[ ! -f ".env.railway" ]]; then
        print_warning ".env.railway не найден, создаем шаблон..."
        cp .env.example .env.railway 2>/dev/null || echo "# Railway Environment Variables" > .env.railway
    fi
    print_status "Конфигурационные файлы проверены"
}

# Инициализация проекта Railway
init_railway_project() {
    print_info "Инициализация проекта Railway..."
    
    if [[ ! -f ".railway/project.json" ]]; then
        print_info "Создание нового проекта Railway..."
        railway init
        print_status "Проект Railway создан"
    else
        print_status "Проект Railway уже инициализирован"
    fi
}

# Добавление PostgreSQL базы данных
add_postgresql() {
    print_info "Добавление PostgreSQL базы данных..."
    
    # Проверяем, есть ли уже база данных
    if railway service list | grep -q "postgresql"; then
        print_status "PostgreSQL база данных уже существует"
    else
        print_info "Создание PostgreSQL базы данных..."
        railway add --database postgresql
        print_status "PostgreSQL база данных добавлена"
    fi
}

# Настройка переменных окружения
setup_environment_variables() {
    print_info "Настройка переменных окружения..."
    
    # Проверяем наличие .env файла
    if [[ -f ".env" ]]; then
        print_info "Найден .env файл, загружаем переменные..."
        
        # Читаем переменные из .env и добавляем в Railway
        while IFS= read -r line; do
            # Пропускаем комментарии и пустые строки
            if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
                continue
            fi
            
            # Извлекаем имя переменной
            if [[ $line =~ ^([^=]+)= ]]; then
                var_name="${BASH_REMATCH[1]}"
                print_info "Добавление переменной: $var_name"
                
                # Добавляем переменную в Railway (пользователь введет значение)
                echo "Введите значение для $var_name:"
                read -r var_value
                railway variables set "$var_name=$var_value"
            fi
        done < .env
        
        print_status "Переменные окружения настроены"
    else
        print_warning ".env файл не найден"
        print_info "Настройте переменные вручную в Railway Dashboard"
        print_info "Необходимые переменные:"
        echo "  - BOT_TOKEN"
        echo "  - DATABASE_URL (автоматически создается с PostgreSQL)"
        echo "  - APIFY_TOKEN"
        echo "  - OPENAI_API_KEY"
    fi
}

# Деплой проекта
deploy_project() {
    print_info "Деплой проекта на Railway..."
    
    # Проверяем, что все готово для деплоя
    if [[ ! -f "package.json" ]]; then
        print_error "package.json не найден!"
        exit 1
    fi
    
    # Запускаем деплой
    railway up
    print_status "Проект задеплоен на Railway!"
    
    # Получаем URL проекта
    PROJECT_URL=$(railway status --json | grep -o '"url":"[^"]*' | cut -d'"' -f4)
    if [[ -n "$PROJECT_URL" ]]; then
        print_status "Проект доступен по адресу: $PROJECT_URL"
        print_info "Health check: $PROJECT_URL/health"
    fi
}

# Показать информацию о проекте
show_project_info() {
    print_info "Информация о проекте:"
    railway status
    
    print_info "Переменные окружения:"
    railway variables
    
    print_info "Логи (последние 100 строк):"
    railway logs --tail 100
}

# Основная функция
main() {
    echo
    print_info "Начинаем настройку Railway..."
    echo
    
    # Выполняем все шаги
    check_railway_cli
    check_railway_auth
    check_config_files
    init_railway_project
    add_postgresql
    
    # Спрашиваем пользователя о настройке переменных
    echo
    print_info "Хотите настроить переменные окружения сейчас? (y/n)"
    read -r setup_vars
    if [[ $setup_vars == "y" || $setup_vars == "Y" ]]; then
        setup_environment_variables
    else
        print_warning "Не забудьте настроить переменные в Railway Dashboard!"
    fi
    
    # Спрашиваем о деплое
    echo
    print_info "Хотите задеплоить проект сейчас? (y/n)"
    read -r deploy_now
    if [[ $deploy_now == "y" || $deploy_now == "Y" ]]; then
        deploy_project
    else
        print_info "Для деплоя выполните: railway up"
    fi
    
    echo
    print_status "Настройка Railway завершена!"
    print_info "Дополнительная информация в docs/RAILWAY_DEPLOYMENT.md"
    
    # Показываем информацию о проекте
    show_project_info
}

# Запуск основной функции
main "$@"
