# 🕉️ Meta Muse PowerShell Scheduler for Windows
# Создает задачу в Windows Task Scheduler

$TaskName = "MetaMuseScraper"
$ScriptPath = Join-Path $PSScriptRoot "meta-muse-automated-scraper.ts"
$BunPath = "bun"

# Создание действия задачи
$Action = New-ScheduledTaskAction -Execute $BunPath -Argument "run '$ScriptPath'"

# Создание триггера (каждый день в 9:00)
$Trigger = New-ScheduledTaskTrigger -Daily -At "09:00"

# Настройки задачи
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Регистрация задачи
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Meta Muse Instagram Scraper - Daily execution"

Write-Host "✅ Задача '$TaskName' создана в Windows Task Scheduler"
Write-Host "⏰ Запуск: каждый день в 9:00"
Write-Host "📁 Скрипт: $ScriptPath"

# Показать информацию о задаче
Get-ScheduledTask -TaskName $TaskName | Format-Table