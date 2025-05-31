/**
 * Скрипт для проверки доступных акторов Apify
 *
 * Использование:
 * bun run src/scripts/check-apify-actors.ts
 */

import axios from "axios";
import * as dotenv from "dotenv";

// Загружаем переменные окружения из .env файла
dotenv.config();

// Получаем токен Apify из .env файла
const apifyApiToken = process.env.APIFY_TOKEN;

if (!apifyApiToken) {
  console.error("APIFY_TOKEN не найден в .env файле");
  process.exit(1);
}

console.log(`Используем токен Apify: ${apifyApiToken.substring(0, 15)}...`);

// Функция для получения списка акторов
async function getActors(token: string): Promise<void> {
  try {
    // Получаем список акторов пользователя
    const userActorsUrl = `https://api.apify.com/v2/acts?token=${token}`;
    console.log(`Запрос списка акторов пользователя: ${userActorsUrl}`);

    const userActorsResponse = await axios.get(userActorsUrl);
    console.log("Список акторов пользователя:");
    console.log(JSON.stringify(userActorsResponse.data, null, 2));

    // Получаем список акторов, созданных пользователем
    const myActorsUrl = `https://api.apify.com/v2/acts?token=${token}&my=true`;
    console.log(
      `\nЗапрос списка акторов, созданных пользователем: ${myActorsUrl}`
    );

    const myActorsResponse = await axios.get(myActorsUrl);
    console.log("Список акторов, созданных пользователем:");
    console.log(JSON.stringify(myActorsResponse.data, null, 2));

    // Поиск акторов, связанных с Instagram
    const searchInstagramActorsUrl = `https://api.apify.com/v2/acts?token=${token}&search=instagram`;
    console.log(
      `\nПоиск акторов, связанных с Instagram: ${searchInstagramActorsUrl}`
    );

    const searchInstagramActorsResponse = await axios.get(
      searchInstagramActorsUrl
    );
    console.log("Результаты поиска акторов, связанных с Instagram:");

    // Фильтруем только те акторы, которые доступны для запуска
    const availableActors =
      searchInstagramActorsResponse.data.data.items.filter((actor: any) => {
        // Проверяем, что актор не требует платы или создан пользователем
        return (
          actor.username === "dao999nft" ||
          !actor.pricingInfos ||
          actor.pricingInfos.length === 0
        );
      });

    console.log(
      `Найдено ${availableActors.length} доступных акторов, связанных с Instagram:`
    );

    for (const actor of availableActors) {
      console.log(`\n- Имя: ${actor.name}`);
      console.log(`  Заголовок: ${actor.title || "Нет заголовка"}`);
      console.log(`  Описание: ${actor.description || "Нет описания"}`);
      console.log(`  Пользователь: ${actor.username}`);
      console.log(`  ID: ${actor.id}`);

      // Проверяем, доступен ли актор для запуска
      try {
        const actorInfoUrl = `https://api.apify.com/v2/acts/${actor.id}?token=${token}`;
        const actorInfoResponse = await axios.get(actorInfoUrl);

        console.log(
          `  Доступен для запуска: ${actorInfoResponse.data.data.isPublic ? "Да (публичный)" : "Нет (приватный)"}`
        );

        // Проверяем, можно ли запустить актор
        try {
          const actorRunsUrl = `https://api.apify.com/v2/acts/${actor.id}/runs?token=${token}`;
          await axios.get(actorRunsUrl);
          console.log(`  Можно запустить: Да`);
        } catch (runError) {
          console.log(
            `  Можно запустить: Нет (${runError instanceof Error ? runError.message : String(runError)})`
          );
        }
      } catch (infoError) {
        console.log(
          `  Доступен для запуска: Нет (${infoError instanceof Error ? infoError.message : String(infoError)})`
        );
      }
    }

    // Поиск акторов, связанных с Reel
    const searchReelActorsUrl = `https://api.apify.com/v2/acts?token=${token}&search=reel`;
    console.log(`\nПоиск акторов, связанных с Reel: ${searchReelActorsUrl}`);

    const searchReelActorsResponse = await axios.get(searchReelActorsUrl);
    console.log("Результаты поиска акторов, связанных с Reel:");

    // Фильтруем только те акторы, которые доступны для запуска
    const availableReelActors = searchReelActorsResponse.data.data.items.filter(
      (actor: any) => {
        // Проверяем, что актор не требует платы или создан пользователем
        return (
          actor.username === "dao999nft" ||
          !actor.pricingInfos ||
          actor.pricingInfos.length === 0
        );
      }
    );

    console.log(
      `Найдено ${availableReelActors.length} доступных акторов, связанных с Reel:`
    );

    for (const actor of availableReelActors) {
      console.log(`\n- Имя: ${actor.name}`);
      console.log(`  Заголовок: ${actor.title || "Нет заголовка"}`);
      console.log(`  Описание: ${actor.description || "Нет описания"}`);
      console.log(`  Пользователь: ${actor.username}`);
      console.log(`  ID: ${actor.id}`);

      // Проверяем, доступен ли актор для запуска
      try {
        const actorInfoUrl = `https://api.apify.com/v2/acts/${actor.id}?token=${token}`;
        const actorInfoResponse = await axios.get(actorInfoUrl);

        console.log(
          `  Доступен для запуска: ${actorInfoResponse.data.data.isPublic ? "Да (публичный)" : "Нет (приватный)"}`
        );

        // Проверяем, можно ли запустить актор
        try {
          const actorRunsUrl = `https://api.apify.com/v2/acts/${actor.id}/runs?token=${token}`;
          await axios.get(actorRunsUrl);
          console.log(`  Можно запустить: Да`);
        } catch (runError) {
          console.log(
            `  Можно запустить: Нет (${runError instanceof Error ? runError.message : String(runError)})`
          );
        }
      } catch (infoError) {
        console.log(
          `  Доступен для запуска: Нет (${infoError instanceof Error ? infoError.message : String(infoError)})`
        );
      }
    }

    // Поиск акторов, связанных с Scraper
    const searchScraperActorsUrl = `https://api.apify.com/v2/acts?token=${token}&search=scraper`;
    console.log(
      `\nПоиск акторов, связанных с Scraper: ${searchScraperActorsUrl}`
    );

    const searchScraperActorsResponse = await axios.get(searchScraperActorsUrl);
    console.log("Результаты поиска акторов, связанных с Scraper:");

    // Фильтруем только те акторы, которые доступны для запуска
    const availableScraperActors =
      searchScraperActorsResponse.data.data.items.filter((actor: any) => {
        // Проверяем, что актор не требует платы или создан пользователем
        return (
          actor.username === "dao999nft" ||
          !actor.pricingInfos ||
          actor.pricingInfos.length === 0
        );
      });

    console.log(
      `Найдено ${availableScraperActors.length} доступных акторов, связанных с Scraper:`
    );

    for (const actor of availableScraperActors) {
      console.log(`\n- Имя: ${actor.name}`);
      console.log(`  Заголовок: ${actor.title || "Нет заголовка"}`);
      console.log(`  Описание: ${actor.description || "Нет описания"}`);
      console.log(`  Пользователь: ${actor.username}`);
      console.log(`  ID: ${actor.id}`);

      // Проверяем, доступен ли актор для запуска
      try {
        const actorInfoUrl = `https://api.apify.com/v2/acts/${actor.id}?token=${token}`;
        const actorInfoResponse = await axios.get(actorInfoUrl);

        console.log(
          `  Доступен для запуска: ${actorInfoResponse.data.data.isPublic ? "Да (публичный)" : "Нет (приватный)"}`
        );

        // Проверяем, можно ли запустить актор
        try {
          const actorRunsUrl = `https://api.apify.com/v2/acts/${actor.id}/runs?token=${token}`;
          await axios.get(actorRunsUrl);
          console.log(`  Можно запустить: Да`);
        } catch (runError) {
          console.log(
            `  Можно запустить: Нет (${runError instanceof Error ? runError.message : String(runError)})`
          );
        }
      } catch (infoError) {
        console.log(
          `  Доступен для запуска: Нет (${infoError instanceof Error ? infoError.message : String(infoError)})`
        );
      }
    }
  } catch (error) {
    console.error(
      "Ошибка при получении списка акторов:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Запускаем функцию для получения списка акторов
getActors(apifyApiToken);
