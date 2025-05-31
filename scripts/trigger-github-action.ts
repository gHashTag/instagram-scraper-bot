#!/usr/bin/env tsx

/**
 * 🚀 Ручной запуск GitHub Action для тестирования
 * 
 * Запускает workflow обновления Obsidian vault вручную
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Загружаем переменные окружения
const devEnvPath = path.join(__dirname, "../.env.development");
const prodEnvPath = path.join(__dirname, "../.env");

const dev = fs.existsSync(devEnvPath);
const envPath = dev ? devEnvPath : prodEnvPath;
dotenv.config({ path: envPath });

async function triggerGitHubAction(): Promise<void> {
  console.log("🚀 Запуск GitHub Action для тестирования системы...");
  
  const githubToken = process.env.GITHUB_TOKEN;
  
  if (!githubToken) {
    console.error("❌ GITHUB_TOKEN не найден в переменных окружения");
    console.log("💡 Создайте Personal Access Token:");
    console.log("   1. GitHub → Settings → Developer settings → Personal access tokens");
    console.log("   2. Generate new token (classic)");
    console.log("   3. Выберите scopes: repo, workflow");
    console.log("   4. Добавьте токен в .env.development");
    return;
  }
  
  try {
    // Получаем информацию о workflow
    const workflowResponse = await fetch(
      'https://api.github.com/repos/gHashTag/instagram-scraper/actions/workflows',
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Coco-Age-Test-Script'
        }
      }
    );
    
    if (!workflowResponse.ok) {
      console.error("❌ Ошибка получения workflows:", await workflowResponse.text());
      return;
    }
    
    const workflows = await workflowResponse.json();
    console.log(`📋 Найдено workflows: ${workflows.total_count}`);
    
    // Ищем наш workflow
    const obsidianWorkflow = workflows.workflows.find((w: any) => 
      w.name === '🔄 Update Obsidian Vault Daily'
    );
    
    if (!obsidianWorkflow) {
      console.log("⚠️ Workflow '🔄 Update Obsidian Vault Daily' не найден");
      console.log("📋 Доступные workflows:");
      workflows.workflows.forEach((w: any) => {
        console.log(`   • ${w.name} (${w.state})`);
      });
      
      console.log("\n💡 Возможные причины:");
      console.log("   • Workflow файл еще не закоммичен");
      console.log("   • Файл содержит синтаксические ошибки");
      console.log("   • Нужно сделать push в main ветку");
      return;
    }
    
    console.log(`✅ Workflow найден: ${obsidianWorkflow.name}`);
    console.log(`📊 Статус: ${obsidianWorkflow.state}`);
    
    // Запускаем workflow
    const dispatchResponse = await fetch(
      `https://api.github.com/repos/gHashTag/instagram-scraper/actions/workflows/${obsidianWorkflow.id}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Coco-Age-Test-Script'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            project_id: '1'
          }
        })
      }
    );
    
    if (dispatchResponse.ok) {
      console.log("🎉 GitHub Action успешно запущен!");
      console.log("📱 Ожидайте Telegram уведомление через 2-3 минуты");
      console.log("🔗 Проверить статус: https://github.com/gHashTag/instagram-scraper/actions");
      
      // Ждем немного и проверяем последние запуски
      console.log("\n⏳ Ожидание запуска workflow...");
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await checkRecentRuns(githubToken, obsidianWorkflow.id);
      
    } else {
      const errorText = await dispatchResponse.text();
      console.error("❌ Ошибка запуска workflow:", errorText);
      
      if (dispatchResponse.status === 422) {
        console.log("💡 Возможные причины:");
        console.log("   • Workflow не поддерживает workflow_dispatch");
        console.log("   • Неверные входные параметры");
        console.log("   • Workflow отключен");
      }
    }
    
  } catch (error) {
    console.error("❌ Ошибка при работе с GitHub API:", error);
  }
}

async function checkRecentRuns(githubToken: string, workflowId: number): Promise<void> {
  try {
    const runsResponse = await fetch(
      `https://api.github.com/repos/gHashTag/instagram-scraper/actions/workflows/${workflowId}/runs?per_page=5`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Coco-Age-Test-Script'
        }
      }
    );
    
    if (runsResponse.ok) {
      const runs = await runsResponse.json();
      console.log(`\n📊 Последние запуски (${runs.total_count} всего):`);
      
      runs.workflow_runs.slice(0, 3).forEach((run: any, index: number) => {
        const status = run.status === 'completed' ? 
          (run.conclusion === 'success' ? '✅' : '❌') : '🔄';
        
        console.log(`   ${status} ${run.created_at.split('T')[0]} - ${run.status} (${run.conclusion || 'running'})`);
        
        if (index === 0) {
          console.log(`      🔗 ${run.html_url}`);
        }
      });
    }
  } catch (error) {
    console.log("⚠️ Не удалось получить информацию о запусках");
  }
}

async function createCommitToTriggerWorkflow(): Promise<void> {
  console.log("\n📝 Создание тестового коммита для запуска workflow...");
  
  try {
    // Создаем тестовый файл
    const testFilePath = path.join(__dirname, "../vaults/coco-age/test-trigger.md");
    const testContent = `# 🧪 Тестовый триггер

**Время:** ${new Date().toISOString()}

Этот файл создан для тестирования автоматического запуска GitHub Actions.

## 🎯 Цель
Проверить, что система обновления работает корректно и отправляет Telegram уведомления.

---

*Автоматически создано для тестирования*
`;
    
    fs.writeFileSync(testFilePath, testContent, 'utf8');
    console.log("✅ Тестовый файл создан");
    
    console.log("\n📋 Следующие шаги:");
    console.log("1. git add .");
    console.log("2. git commit -m '🧪 Test GitHub Actions trigger'");
    console.log("3. git push");
    console.log("4. Проверить: https://github.com/gHashTag/instagram-scraper/actions");
    
  } catch (error) {
    console.error("❌ Ошибка создания тестового файла:", error);
  }
}

// Запускаем
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🧪 GitHub Actions Test Trigger");
  console.log("=" .repeat(50));
  
  const args = process.argv.slice(2);
  
  if (args.includes('--commit')) {
    createCommitToTriggerWorkflow();
  } else {
    triggerGitHubAction().catch((error) => {
      console.error("❌ Критическая ошибка:", error);
      process.exit(1);
    });
  }
}
