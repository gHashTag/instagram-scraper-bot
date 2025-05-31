import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import {
  initializeDBConnection,
  closeDBConnection,
  getDB,
} from "../src/db/neonDB";
import { usersTable, projectsTable } from "../src/db/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devEnvPath = path.join(__dirname, "../.env.development");
const prodEnvPath = path.join(__dirname, "../.env");

const dev = fs.existsSync(devEnvPath);
const envPath = dev ? devEnvPath : prodEnvPath;
dotenv.config({ path: envPath });
console.log(`Используется файл окружения: ${envPath}`);

async function main() {
  await initializeDBConnection();
  const db = getDB();

  console.log("=== Пользователи в базе данных ===");
  const users = await db.select().from(usersTable);

  if (users.length === 0) {
    console.log("Пользователи не найдены");
  } else {
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Auth ID: ${user.authId}`);
      console.log(`   Telegram ID: ${user.telegram_id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log("   ---");
    });
  }

  console.log("\n=== Проекты в базе данных ===");
  const projects = await db.select().from(projectsTable);

  if (projects.length === 0) {
    console.log("Проекты не найдены");
  } else {
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ID: ${project.id}`);
      console.log(`   User ID: ${project.user_id}`);
      console.log(`   Name: ${project.name}`);
      console.log(`   Description: ${project.description}`);
      console.log(`   Active: ${project.is_active}`);
      console.log("   ---");
    });
  }

  await closeDBConnection();
}

main().catch(async (err) => {
  console.error("Ошибка выполнения скрипта", err);
  await closeDBConnection();
});
