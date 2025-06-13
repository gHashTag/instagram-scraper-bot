/**
 * 🕉️ Meta Muse Scheduler - Планировщик автоматического скрепинга
 *
 * **"धृतिश्च तेजो धैर्यं च गुणाश्च सत्यवादिता"**
 * "Стойкость, энергия, терпение, честность - вот качества успеха"
 *
 * Планирует автоматическое выполнение скрепинга Meta Muse каждый день в течение 2 недель
 */

import { MetaMuseAutomatedScraper } from "./meta-muse-automated-scraper";
import * as fs from "fs";
import * as path from "path";

interface SchedulerConfig {
  startDate: Date;
  durationDays: number;
  dailyRunTime: { hour: number; minute: number };
  autoStart: boolean;
}

/**
 * 📅 Планировщик Meta Muse
 */
export class MetaMuseScheduler {
  private config: SchedulerConfig;
  private isRunning = false;
  private currentDay = 0;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      startDate: new Date(),
      durationDays: 14,
      dailyRunTime: { hour: 9, minute: 0 }, // 9:00 утра
      autoStart: true,
      ...config,
    };
  }

  /**
   * Создание cron job для автоматического запуска
   */
  createCronJob(): string {
    const { hour, minute } = this.config.dailyRunTime;
    return `${minute} ${hour} * * *`; // Каждый день в указанное время
  }

  /**
   * Создание systemd timer для Linux
   */
  generateSystemdTimer(): string {
    const { hour, minute } = this.config.dailyRunTime;

    return `[Unit]
Description=Meta Muse Instagram Scraper
Requires=meta-muse-scraper.service

[Timer]
OnCalendar=*-*-* ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00
Persistent=true

[Install]
WantedBy=timers.target`;
  }

  /**
   * Создание systemd service для Linux
   */
  generateSystemdService(): string {
    const workingDir = process.cwd();
    const scriptPath = path.join(
      workingDir,
      "src/scripts/meta-muse-automated-scraper.ts"
    );

    return `[Unit]
Description=Meta Muse Instagram Scraper Service
After=network.target

[Service]
Type=oneshot
User=node
WorkingDirectory=${workingDir}
Environment=NODE_ENV=production
ExecStart=/usr/bin/bun run ${scriptPath}
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target`;
  }

  /**
   * Создание GitHub Action workflow
   */
  generateGitHubAction(): string {
    const { hour, minute } = this.config.dailyRunTime;

    return `name: 🐭 Meta Muse Daily Scraper

on:
  schedule:
    # Каждый день в ${hour}:${minute.toString().padStart(2, "0")} UTC
    - cron: '${minute} ${hour} * * *'
  workflow_dispatch: # Ручной запуск
    inputs:
      force_run:
        description: 'Force run scraper'
        required: false
        default: 'false'

jobs:
  scrape-meta-muse:
    runs-on: ubuntu-latest
    name: 🕷️ Meta Muse Scraping
    timeout-minutes: 240 # 4 часа максимум
    
    steps:
      - name: 🔄 Checkout repository
        uses: actions/checkout@v4

      - name: 🟢 Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: 📦 Install dependencies
        run: bun install

      - name: 🕷️ Run Meta Muse Scraper
        env:
          DATABASE_URL: \${{ secrets.DATABASE_URL }}
          APIFY_TOKEN: \${{ secrets.APIFY_TOKEN }}
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
        run: bun run src/scripts/meta-muse-automated-scraper.ts

      - name: 📊 Upload scraping reports
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: meta-muse-reports-\${{ github.run_number }}
          path: exports/meta-muse-report-*.json
          retention-days: 30`;
  }

  /**
   * Создание Docker Compose для автоматизации
   */
  generateDockerCompose(): string {
    return `version: '3.8'

services:
  meta-muse-scraper:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=\${DATABASE_URL}
      - APIFY_TOKEN=\${APIFY_TOKEN}
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - NODE_ENV=production
    volumes:
      - ./exports:/app/exports
      - ./temp:/app/temp
    restart: unless-stopped
    depends_on:
      - postgres
    command: ["bun", "run", "src/scripts/meta-muse-automated-scraper.ts"]

  meta-muse-scheduler:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=\${DATABASE_URL}
      - APIFY_TOKEN=\${APIFY_TOKEN}
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
    volumes:
      - ./exports:/app/exports
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
    command: ["node", "-e", "
      const schedule = require('node-cron');
      schedule.schedule('0 9 * * *', () => {
        const { exec } = require('child_process');
        exec('docker-compose up meta-muse-scraper', (error, stdout, stderr) => {
          if (error) console.error('Error:', error);
          console.log(stdout);
        });
      });
      console.log('🕉️ Meta Muse Scheduler started - runs daily at 9:00 AM');
      process.stdin.resume();
    "]

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=metamuse
      - POSTGRES_USER=\${DB_USER:-metamuse}
      - POSTGRES_PASSWORD=\${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:`;
  }

  /**
   * Создание простого Node.js планировщика
   */
  generateNodeScheduler(): string {
    return `/**
 * 🕉️ Meta Muse Node.js Scheduler
 */
const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

// Запуск каждый день в 9:00
cron.schedule('0 9 * * *', () => {
  console.log('🕉️ Запуск Meta Muse Scraper:', new Date().toLocaleString());
  
  const scriptPath = path.join(__dirname, 'meta-muse-automated-scraper.ts');
  const command = \`bun run \${scriptPath}\`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Ошибка выполнения:', error);
      return;
    }
    
    if (stderr) {
      console.error('⚠️ Предупреждения:', stderr);
    }
    
    console.log('✅ Результат выполнения:', stdout);
  });
}, {
  scheduled: true,
  timezone: "Europe/Moscow"
});

console.log('🕉️ Meta Muse Scheduler запущен - ежедневный запуск в 9:00 МСК');
console.log('📅 Продолжительность: 14 дней');
console.log('⏰ Следующий запуск:', new Date(Date.now() + 24*60*60*1000).toLocaleString());

// Держим процесс активным
process.stdin.resume();`;
  }

  /**
   * Создание PowerShell скрипта для Windows
   */
  generatePowerShellScheduler(): string {
    return `# 🕉️ Meta Muse PowerShell Scheduler for Windows
# Создает задачу в Windows Task Scheduler

\$TaskName = "MetaMuseScraper"
\$ScriptPath = Join-Path \$PSScriptRoot "meta-muse-automated-scraper.ts"
\$BunPath = "bun"

# Создание действия задачи
\$Action = New-ScheduledTaskAction -Execute \$BunPath -Argument "run '\$ScriptPath'"

# Создание триггера (каждый день в 9:00)
\$Trigger = New-ScheduledTaskTrigger -Daily -At "09:00"

# Настройки задачи
\$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

# Регистрация задачи
Register-ScheduledTask -TaskName \$TaskName -Action \$Action -Trigger \$Trigger -Settings \$Settings -Description "Meta Muse Instagram Scraper - Daily execution"

Write-Host "✅ Задача '\$TaskName' создана в Windows Task Scheduler"
Write-Host "⏰ Запуск: каждый день в 9:00"
Write-Host "📁 Скрипт: \$ScriptPath"

# Показать информацию о задаче
Get-ScheduledTask -TaskName \$TaskName | Format-Table`;
  }

  /**
   * Генерация всех файлов автоматизации
   */
  async generateAutomationFiles(): Promise<void> {
    const automationDir = path.join(process.cwd(), "automation", "meta-muse");

    // Создаем директорию
    if (!fs.existsSync(automationDir)) {
      fs.mkdirSync(automationDir, { recursive: true });
    }

    const files = [
      {
        name: "github-action.yml",
        content: this.generateGitHubAction(),
        description: "GitHub Actions workflow",
      },
      {
        name: "docker-compose.yml",
        content: this.generateDockerCompose(),
        description: "Docker Compose configuration",
      },
      {
        name: "node-scheduler.js",
        content: this.generateNodeScheduler(),
        description: "Node.js cron scheduler",
      },
      {
        name: "meta-muse.timer",
        content: this.generateSystemdTimer(),
        description: "Systemd timer (Linux)",
      },
      {
        name: "meta-muse.service",
        content: this.generateSystemdService(),
        description: "Systemd service (Linux)",
      },
      {
        name: "setup-windows-scheduler.ps1",
        content: this.generatePowerShellScheduler(),
        description: "Windows Task Scheduler setup",
      },
    ];

    console.log(`🕉️ Создание файлов автоматизации в: ${automationDir}`);
    console.log("═".repeat(70));

    for (const file of files) {
      const filePath = path.join(automationDir, file.name);
      fs.writeFileSync(filePath, file.content);
      console.log(`✅ ${file.name.padEnd(30)} - ${file.description}`);
    }

    // Создаем README с инструкциями
    const readmeContent = this.generateAutomationReadme();
    const readmePath = path.join(automationDir, "README.md");
    fs.writeFileSync(readmePath, readmeContent);
    console.log(`✅ ${"README.md".padEnd(30)} - Инструкции по настройке`);

    console.log("\n📋 ФАЙЛЫ АВТОМАТИЗАЦИИ СОЗДАНЫ!");
    console.log(`📁 Директория: ${automationDir}`);
    console.log("\n🚀 ВАРИАНТЫ ЗАПУСКА:");
    console.log(
      "1. 🌐 GitHub Actions (рекомендуется) - автоматически в облаке"
    );
    console.log("2. 🐳 Docker Compose - локально в контейнерах");
    console.log("3. 🟢 Node.js Scheduler - локально с node-cron");
    console.log("4. 🐧 Systemd (Linux) - системный планировщик");
    console.log(
      "5. 🪟 Windows Task Scheduler - встроенный планировщик Windows"
    );
  }

  /**
   * Генерация README с инструкциями
   */
  private generateAutomationReadme(): string {
    return `# 🕉️ Meta Muse Automation Setup

Автоматизация скрепинга Meta Muse (аниме мышь) на 14 дней с ежедневным запуском.

## 🎯 Варианты автоматизации

### 1. 🌐 GitHub Actions (Рекомендуется)

**Преимущества:** Бесплатно, надежно, логи в облаке, не требует сервера

\`\`\`bash
# 1. Скопируйте github-action.yml в .github/workflows/
cp github-action.yml ../.github/workflows/meta-muse-daily.yml

# 2. Добавьте секреты в GitHub Repository Settings:
# - DATABASE_URL
# - APIFY_TOKEN  
# - OPENAI_API_KEY

# 3. Workflow запустится автоматически каждый день в 9:00 UTC
\`\`\`

### 2. 🐳 Docker Compose

**Преимущества:** Изолированная среда, легко масштабировать

\`\`\`bash
# Настройте .env файл с переменными
cp .env.example .env

# Запустите контейнеры
docker-compose up -d

# Планировщик будет запускать скрепер каждый день в 9:00
\`\`\`

### 3. 🟢 Node.js Scheduler

**Преимущества:** Простота, гибкость настройки

\`\`\`bash
# Установите зависимости
npm install node-cron

# Запустите планировщик
node node-scheduler.js

# Процесс будет работать в фоне и запускать скрепер ежедневно
\`\`\`

### 4. 🐧 Linux Systemd

**Преимущества:** Интеграция с системой, автозапуск

\`\`\`bash
# Скопируйте файлы systemd
sudo cp meta-muse.service /etc/systemd/system/
sudo cp meta-muse.timer /etc/systemd/system/

# Включите и запустите
sudo systemctl enable meta-muse.timer
sudo systemctl start meta-muse.timer

# Проверьте статус
sudo systemctl status meta-muse.timer
\`\`\`

### 5. 🪟 Windows Task Scheduler

**Преимущества:** Встроен в Windows, графический интерфейс

\`\`\`powershell
# Запустите PowerShell как администратор
# Выполните скрипт настройки
.\\setup-windows-scheduler.ps1

# Задача появится в Task Scheduler
\`\`\`

## ⚙️ Настройки

### Время запуска
По умолчанию: **9:00 UTC** (12:00 МСК)

Изменить время в файлах:
- GitHub Actions: \`cron: '0 9 * * *'\`
- Docker: schedule в node-scheduler
- Systemd: \`OnCalendar=*-*-* 09:00:00\`
- Windows: \`-At "09:00"\`

### Переменные окружения

\`\`\`env
DATABASE_URL=postgresql://user:pass@host:port/db
APIFY_TOKEN=your_apify_token
OPENAI_API_KEY=sk-your_openai_key
\`\`\`

## 📊 Мониторинг

### Логи
- GitHub Actions: в интерфейсе GitHub
- Docker: \`docker-compose logs -f\`
- Node.js: в консоли
- Systemd: \`journalctl -u meta-muse.service\`
- Windows: Event Viewer

### Отчеты
Отчеты сохраняются в \`exports/meta-muse-report-*.json\`

## 🔧 Устранение неполадок

### Проблемы с токенами
Проверьте актуальность токенов в переменных окружения

### Проблемы с сетью
Убедитесь в доступности Apify API и Instagram

### Проблемы с базой данных
Проверьте подключение к Neon PostgreSQL

## 📅 Расписание на 14 дней

День 1-14: Обработка по 10-11 хэштегов ежедневно
Всего: 151 хэштег в 6 категориях

**Категории:**
1. Базовые хэштеги (7)
2. AI-инфлюенсеры (30) 
3. Метавселенные и технологии (24)
4. Архетип: Муза/Маг/Провидец (30)
5. Психоэмоциональный сегмент (30)
6. Философия: дух + технологии (30)

---

🕉️ **"धृतिश्च तेजो धैर्यं च गुणाश्च सत्यवादिता"** 
"Стойкость, энергия, терпение, честность - вот качества успеха"`;
  }

  /**
   * Немедленный запуск скрепера (для тестирования)
   */
  async runNow(): Promise<void> {
    if (this.isRunning) {
      console.log("⚠️ Скрепер уже запущен");
      return;
    }

    this.isRunning = true;
    console.log("🕉️ Немедленный запуск Meta Muse Scraper...");

    try {
      const scraper = new MetaMuseAutomatedScraper();
      await scraper.run();
    } catch (error) {
      console.error("❌ Ошибка выполнения:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Показать статус планировщика
   */
  showStatus(): void {
    console.log("🕉️ Meta Muse Scheduler Status");
    console.log("═".repeat(40));
    console.log(
      `📅 Дата начала: ${this.config.startDate.toLocaleDateString()}`
    );
    console.log(
      `⏰ Время запуска: ${this.config.dailyRunTime.hour}:${this.config.dailyRunTime.minute.toString().padStart(2, "0")}`
    );
    console.log(`📆 Продолжительность: ${this.config.durationDays} дней`);
    console.log(`🔄 Статус: ${this.isRunning ? "Выполняется" : "Ожидание"}`);
    console.log(`📊 День: ${this.currentDay}/${this.config.durationDays}`);
    console.log(
      `⚙️ Автозапуск: ${this.config.autoStart ? "Включен" : "Отключен"}`
    );
  }
}

/**
 * CLI интерфейс
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const scheduler = new MetaMuseScheduler();

  switch (command) {
    case "generate":
      await scheduler.generateAutomationFiles();
      break;

    case "run":
      await scheduler.runNow();
      break;

    case "status":
      scheduler.showStatus();
      break;

    case "help":
    default:
      console.log(`🕉️ Meta Muse Scheduler Commands:

📋 Доступные команды:
  generate  - Создать файлы автоматизации
  run       - Запустить скрепер немедленно
  status    - Показать статус планировщика
  help      - Показать эту справку

🚀 Примеры использования:
  bun run src/scripts/meta-muse-scheduler.ts generate
  bun run src/scripts/meta-muse-scheduler.ts run
  bun run src/scripts/meta-muse-scheduler.ts status

🕉️ Да пребудет автоматизация с Meta Muse! 🐭⚡`);
      break;
  }
}

// Запуск CLI
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  });
}
