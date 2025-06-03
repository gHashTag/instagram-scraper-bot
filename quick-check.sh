#!/bin/bash

# 🔍 Быстрая проверка через API

echo "🚀 БЫСТРАЯ ДИАГНОСТИКА ЧЕРЕЗ API"
echo "================================="

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Проверяем общую статистику...${NC}"

# 1. Проверка здоровья системы
echo -e "\n${YELLOW}1. Health Check:${NC}"
curl -s "https://instagram-scraper-bot.vercel.app/health" | head -5

# 2. Проверка reels
echo -e "\n${YELLOW}2. Общее количество reels:${NC}"
curl -s "https://instagram-scraper-bot.vercel.app/api/reels?limit=1" | grep -o '"total":[0-9]*' | head -1

# 3. Проверка конкурентов
echo -e "\n${YELLOW}3. Конкуренты:${NC}"
curl -s "https://instagram-scraper-bot.vercel.app/api/competitors" | head -10

# 4. Проверка хэштегов
echo -e "\n${YELLOW}4. Хэштеги:${NC}"
curl -s "https://instagram-scraper-bot.vercel.app/api/hashtags" | head -10

# 5. Топ reels
echo -e "\n${YELLOW}5. Топ 3 reels:${NC}"
curl -s "https://instagram-scraper-bot.vercel.app/api/reels?limit=3&sort=views" | head -20

echo -e "\n${GREEN}✅ Диагностика через API завершена${NC}"
echo -e "${BLUE}🌐 Полный дашборд: https://instagram-scraper-bot.vercel.app/${NC}"
