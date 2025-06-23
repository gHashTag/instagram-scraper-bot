@echo off
cd /d "%~dp0"
echo Запуск Instagram Scraper Bot...
echo Директория: %cd%
echo.
bun run dev
pause 