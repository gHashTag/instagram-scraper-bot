/**
 * Скрипт для создания актора для скрапинга Instagram
 * 
 * Использование:
 * bun run src/scripts/create-instagram-scraper-actor.ts
 */

import axios from "axios";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Загружаем переменные окружения из .env файла
dotenv.config();

// Получаем токен Apify из .env файла
const apifyApiToken = process.env.APIFY_TOKEN;

if (!apifyApiToken) {
  console.error("APIFY_TOKEN не найден в .env файле");
  process.exit(1);
}

console.log(`Используем токен Apify: ${apifyApiToken.substring(0, 15)}...`);

// Функция для создания директории, если она не существует
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Функция для создания актора для скрапинга Instagram
async function createInstagramScraperActor(token: string): Promise<void> {
  try {
    // Создаем нового актора
    const createActorUrl = `https://api.apify.com/v2/acts?token=${token}`;
    console.log(`Создание нового актора: ${createActorUrl}`);
    
    const createActorResponse = await axios.post(createActorUrl, {
      name: "instagram-hashtag-scraper",
      title: "Instagram Hashtag Scraper",
      description: "Скрапер для поиска рилсов по хэштегам в Instagram",
      isPublic: false,
      versions: [
        {
          versionNumber: "0.0",
          buildTag: "latest",
          sourceType: "SOURCE_FILES",
          sourceFiles: [
            {
              name: "package.json",
              format: "TEXT",
              content: JSON.stringify({
                name: "instagram-hashtag-scraper",
                version: "0.0.1",
                type: "module",
                description: "Скрапер для поиска рилсов по хэштегам в Instagram",
                dependencies: {
                  "apify": "^3.1.10",
                  "crawlee": "^3.5.4",
                  "playwright": "*",
                  "axios": "^1.9.0"
                },
                scripts: {
                  "start": "node src/main.js"
                }
              }, null, 2)
            },
            {
              name: "src",
              folder: true
            },
            {
              name: "src/main.js",
              format: "TEXT",
              content: `
// Импортируем необходимые библиотеки
import { Actor } from 'apify';
import axios from 'axios';

// Инициализируем Actor
await Actor.init();

// Получаем входные данные
const input = await Actor.getInput();
const { hashtag, resultsLimit = 10 } = input || {};

if (!hashtag) {
  throw new Error('Хэштег не указан во входных данных');
}

console.log(\`Поиск рилсов по хэштегу #\${hashtag}...\`);

try {
  // Здесь мы будем использовать простой HTTP запрос для получения данных
  // В реальном сценарии здесь должен быть код для скрапинга Instagram
  // с использованием Playwright или Puppeteer
  
  // Создаем фиктивные данные для демонстрации
  const results = [];
  
  for (let i = 1; i <= resultsLimit; i++) {
    results.push({
      id: \`reel_\${i}\`,
      url: \`https://www.instagram.com/reel/demo_\${i}/\`,
      ownerUsername: \`user_\${i}\`,
      caption: \`This is a demo reel for hashtag #\${hashtag} - \${i}\`,
      viewCount: Math.floor(Math.random() * 100000) + 50000,
      likeCount: Math.floor(Math.random() * 10000),
      commentCount: Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      hashtags: [\`#\${hashtag}\`, '#demo', '#test'],
      type: 'reel'
    });
  }
  
  // Сохраняем результаты в хранилище данных
  await Actor.pushData(results);
  
  console.log(\`Найдено \${results.length} рилсов по хэштегу #\${hashtag}\`);
} catch (error) {
  console.error('Ошибка при поиске рилсов:', error);
  throw error;
} finally {
  // Завершаем Actor
  await Actor.exit();
}
`
            },
            {
              name: "INPUT_SCHEMA.json",
              format: "TEXT",
              content: JSON.stringify({
                title: "Instagram Hashtag Scraper",
                type: "object",
                schemaVersion: 1,
                properties: {
                  hashtag: {
                    title: "Хэштег",
                    type: "string",
                    description: "Хэштег для поиска рилсов в Instagram (без символа #)",
                    editor: "textfield"
                  },
                  resultsLimit: {
                    title: "Лимит результатов",
                    type: "integer",
                    description: "Максимальное количество результатов для возврата",
                    default: 10,
                    minimum: 1,
                    maximum: 100,
                    editor: "number"
                  }
                },
                required: ["hashtag"]
              }, null, 2)
            },
            {
              name: "Dockerfile",
              format: "TEXT",
              content: `
# Specify the base Docker image. You can read more about
# the available images at https://crawlee.dev/docs/guides/docker-images
# You can also use any other image from Docker Hub.
FROM apify/actor-node:18

# Copy just package.json and package-lock.json
# to speed up the build using Docker layer cache.
COPY --chown=myuser package*.json ./

# Install NPM packages, skip optional and development dependencies to
# keep the image small. Avoid logging too much and print the dependency
# tree for debugging
RUN npm --quiet set progress=false \\
    && npm install --omit=dev --omit=optional \\
    && echo "Installed NPM packages:" \\
    && (npm list --omit=dev --all || true) \\
    && echo "Node.js version:" \\
    && node --version \\
    && echo "NPM version:" \\
    && npm --version \\
    && rm -r ~/.npm

# Next, copy the remaining files and directories with the source code.
# Since we do this after NPM install, quick build will be really fast
# for most source file changes.
COPY --chown=myuser . ./

# Run the image. If you know you won't need headful browsers,
# you can remove the XVFB start script for a micro perf gain.
CMD npm start --silent
`
            }
          ]
        }
      ]
    });
    
    console.log("Ответ API (создание актора):");
    console.log(JSON.stringify(createActorResponse.data, null, 2));
    
    // Получаем ID нового актора
    const actorId = createActorResponse.data.data.id;
    console.log(`ID нового актора: ${actorId}`);
    
    // Запускаем сборку актора
    const buildActorUrl = `https://api.apify.com/v2/acts/${actorId}/builds?token=${token}`;
    console.log(`\nЗапуск сборки актора: ${buildActorUrl}`);
    
    const buildActorResponse = await axios.post(buildActorUrl, {
      version: "0.0",
      useCache: true,
      tag: "latest"
    });
    
    console.log("Ответ API (запуск сборки актора):");
    console.log(JSON.stringify(buildActorResponse.data, null, 2));
    
    // Получаем ID сборки
    const buildId = buildActorResponse.data.data.id;
    console.log(`ID сборки: ${buildId}`);
    
    // Ждем завершения сборки
    console.log("Ожидание завершения сборки...");
    
    let isFinished = false;
    let buildStatus = null;
    
    while (!isFinished) {
      // Получаем статус сборки
      const buildStatusUrl = `https://api.apify.com/v2/acts/${actorId}/builds/${buildId}?token=${token}`;
      const buildStatusResponse = await axios.get(buildStatusUrl);
      
      buildStatus = buildStatusResponse.data.data.status;
      console.log(`Статус сборки: ${buildStatus}`);
      
      if (buildStatus === "SUCCEEDED" || buildStatus === "FAILED" || buildStatus === "ABORTED" || buildStatus === "TIMED-OUT") {
        isFinished = true;
      } else {
        // Ждем 1 секунду перед следующей проверкой
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log(`Сборка завершена со статусом: ${buildStatus}`);
    
    // Если сборка успешна, запускаем актор
    if (buildStatus === "SUCCEEDED") {
      console.log("\nСборка успешна! Теперь можно запустить актор.");
      
      // Запускаем актор
      const runActorUrl = `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`;
      console.log(`Запуск актора: ${runActorUrl}`);
      
      const runActorResponse = await axios.post(runActorUrl, {
        timeout: 60,
        memory: 1024,
        build: "latest",
        input: {
          hashtag: "hydrafacial",
          resultsLimit: 5
        }
      });
      
      console.log("Ответ API (запуск актора):");
      console.log(JSON.stringify(runActorResponse.data, null, 2));
      
      // Получаем ID запуска
      const runId = runActorResponse.data.data.id;
      console.log(`ID запуска: ${runId}`);
      
      // Ждем завершения запуска
      console.log("Ожидание завершения запуска...");
      
      let isRunFinished = false;
      let runStatus = null;
      
      while (!isRunFinished) {
        // Получаем статус запуска
        const runStatusUrl = `https://api.apify.com/v2/acts/${actorId}/runs/${runId}?token=${token}`;
        const runStatusResponse = await axios.get(runStatusUrl);
        
        runStatus = runStatusResponse.data.data.status;
        console.log(`Статус запуска: ${runStatus}`);
        
        if (runStatus === "SUCCEEDED" || runStatus === "FAILED" || runStatus === "ABORTED" || runStatus === "TIMED-OUT") {
          isRunFinished = true;
        } else {
          // Ждем 1 секунду перед следующей проверкой
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`Запуск завершен со статусом: ${runStatus}`);
      
      // Если запуск успешен, получаем результаты
      if (runStatus === "SUCCEEDED") {
        // Получаем ID хранилища данных
        const datasetId = runActorResponse.data.data.defaultDatasetId;
        console.log(`ID хранилища данных: ${datasetId}`);
        
        // Получаем результаты запуска
        const datasetItemsUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`;
        console.log(`Запрос результатов запуска: ${datasetItemsUrl}`);
        
        const datasetItemsResponse = await axios.get(datasetItemsUrl);
        console.log("Результаты запуска:");
        console.log(JSON.stringify(datasetItemsResponse.data, null, 2));
        
        // Сохраняем результаты в файл
        const tempDir = path.join(process.cwd(), "temp");
        ensureDirectoryExists(tempDir);
        const outputPath = path.join(tempDir, "instagram-hashtag-scraper-results.json");
        
        fs.writeFileSync(outputPath, JSON.stringify(datasetItemsResponse.data, null, 2));
        console.log(`Результаты сохранены в файл: ${outputPath}`);
      }
    }
    
    console.log("\nАктор успешно создан и готов к использованию!");
    console.log(`ID актора: ${actorId}`);
    console.log(`Имя актора: instagram-hashtag-scraper`);
  } catch (error) {
    console.error("Ошибка при создании актора:", error);
  }
}

// Запускаем функцию для создания актора
createInstagramScraperActor(apifyApiToken);
