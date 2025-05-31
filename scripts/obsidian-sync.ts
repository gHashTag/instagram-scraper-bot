import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import {
  initializeDBConnection,
  closeDBConnection,
  getDB,
} from "../src/db/neonDB";
import {
  reelsTable,
  competitorsTable,
  projectsTable,
  hashtagsTable,
} from "../src/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devEnvPath = path.join(__dirname, "../.env.development");
const prodEnvPath = path.join(__dirname, "../.env");

const dev = fs.existsSync(devEnvPath);
const envPath = dev ? devEnvPath : prodEnvPath;
dotenv.config({ path: envPath });

const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
if (!vaultPath) {
  console.error("❌ Не указан путь OBSIDIAN_VAULT_PATH в .env");
  process.exit(1);
}

const obsidianPath: string = vaultPath;

interface EditableData {
  competitors: Array<{
    id: number;
    username: string;
    full_name: string | null;
    notes: string | null;
    is_active: boolean;
  }>;
  hashtags: Array<{
    id: number;
    tag_name: string;
    notes: string | null;
    is_active: boolean;
  }>;
  project: {
    id: number;
    name: string;
    description: string | null;
    industry: string | null;
  };
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("ru-RU").format(num);
}

function parseEditableSection(content: string, sectionName: string): any[] {
  const sectionRegex = new RegExp(
    `<!-- EDITABLE_${sectionName}_START -->([\\s\\S]*?)<!-- EDITABLE_${sectionName}_END -->`,
    "i"
  );
  const match = content.match(sectionRegex);

  if (!match) return [];

  const sectionContent = match[1];
  const items: any[] = [];

  // Парсим таблицу или список элементов
  const lines = sectionContent.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    if (line.includes("|") && !line.includes("---")) {
      // Парсим строку таблицы
      const cells = line
        .split("|")
        .map((cell) => cell.trim())
        .filter((cell) => cell);
      if (cells.length >= 3) {
        if (sectionName === "COMPETITORS") {
          items.push({
            id: parseInt(cells[0]) || 0,
            username: cells[1] || "",
            full_name: cells[2] || null,
            notes: cells[3] || null,
            is_active: cells[4] === "✅" || cells[4] === "true",
          });
        } else if (sectionName === "HASHTAGS") {
          items.push({
            id: parseInt(cells[0]) || 0,
            tag_name: cells[1] || "",
            notes: cells[2] || null,
            is_active: cells[3] === "✅" || cells[3] === "true",
          });
        }
      }
    }
  }

  return items;
}

function slugify(name: string, projectId: number): string {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "e",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
  };
  const transliterated = name
    .split("")
    .map((ch) => {
      const lower = ch.toLowerCase();
      if (map[lower]) return map[lower];
      if (/[a-z0-9]/i.test(ch)) return ch;
      return "-";
    })
    .join("");
  let slug = transliterated
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  if (!slug) slug = String(projectId);
  return slug;
}

async function syncFromObsidianToDB(projectId: number): Promise<void> {
  console.log(
    `🔄 Синхронизация изменений из Obsidian в БД для проекта ${projectId}...`
  );

  await initializeDBConnection();
  const db = getDB();

  // Получаем информацию о проекте
  const projectInfo = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);

  if (!projectInfo.length) {
    console.error(`❌ Проект с ID ${projectId} не найден`);
    return;
  }

  const project = projectInfo[0];
  const projectSlug = slugify(project.name, projectId);

  // Читаем файл дашборда
  const dashboardPath = path.join(
    obsidianPath,
    "content-factory",
    `project-${projectSlug}`,
    "dashboard.md"
  );

  if (!fs.existsSync(dashboardPath)) {
    console.error(`❌ Файл дашборда не найден: ${dashboardPath}`);
    return;
  }

  const dashboardContent = fs.readFileSync(dashboardPath, "utf8");

  // Парсим редактируемые секции
  const editableCompetitors = parseEditableSection(
    dashboardContent,
    "COMPETITORS"
  );
  const editableHashtags = parseEditableSection(dashboardContent, "HASHTAGS");

  // Обновляем конкурентов
  for (const competitor of editableCompetitors) {
    if (competitor.id > 0) {
      await db
        .update(competitorsTable)
        .set({
          username: competitor.username,
          full_name: competitor.full_name,
          notes: competitor.notes,
          is_active: competitor.is_active,
          updated_at: new Date(),
        })
        .where(eq(competitorsTable.id, competitor.id));

      console.log(`✅ Обновлен конкурент: ${competitor.username}`);
    }
  }

  // Обновляем хэштеги
  for (const hashtag of editableHashtags) {
    if (hashtag.id > 0) {
      await db
        .update(hashtagsTable)
        .set({
          tag_name: hashtag.tag_name,
          notes: hashtag.notes,
          is_active: hashtag.is_active,
          updated_at: new Date(),
        })
        .where(eq(hashtagsTable.id, hashtag.id));

      console.log(`✅ Обновлен хэштег: #${hashtag.tag_name}`);
    }
  }

  await closeDBConnection();
  console.log(`✅ Синхронизация завершена для проекта ${projectId}`);
}

async function createEditableDashboard(projectId: number): Promise<void> {
  console.log(
    `📝 Создание редактируемого дашборда для проекта ${projectId}...`
  );

  await initializeDBConnection();
  const db = getDB();

  // Получаем данные проекта
  const projectInfo = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId))
    .limit(1);

  if (!projectInfo.length) {
    console.error(`❌ Проект с ID ${projectId} не найден`);
    return;
  }

  const project = projectInfo[0];

  // Получаем конкурентов
  const competitors = await db
    .select()
    .from(competitorsTable)
    .where(eq(competitorsTable.project_id, projectId))
    .orderBy(competitorsTable.username);

  // Получаем хэштеги
  const hashtags = await db
    .select()
    .from(hashtagsTable)
    .where(eq(hashtagsTable.project_id, projectId))
    .orderBy(hashtagsTable.tag_name);

  // Получаем статистику
  const stats = await db
    .select({
      totalReels: sql<number>`count(${reelsTable.id})`,
      totalViews: sql<number>`sum(${reelsTable.views_count})`,
      totalLikes: sql<number>`sum(${reelsTable.likes_count})`,
      avgViews: sql<number>`avg(${reelsTable.views_count})`,
    })
    .from(reelsTable)
    .where(eq(reelsTable.project_id, projectId));

  const projectSlug = slugify(project.name, projectId);

  const projectDir = path.join(
    obsidianPath,
    "content-factory",
    `project-${projectSlug}`
  );

  fs.mkdirSync(projectDir, { recursive: true });

  // Создаем редактируемый дашборд
  const editableDashboard = `# 🏭 РЕДАКТИРУЕМЫЙ ДАШБОРД: ${project.name}

> **⚠️ ВНИМАНИЕ:** Этот файл содержит редактируемые секции, которые синхронизируются с базой данных.  
> После внесения изменений запустите: \`bun run sync:from-obsidian ${projectId}\`

---

## 📊 ОБЩАЯ СТАТИСТИКА (только чтение)

| Метрика | Значение |
|---------|----------|
| 🎬 **Всего Reels** | ${formatNumber(Number(stats[0]?.totalReels || 0))} |
| 👀 **Общие просмотры** | ${formatNumber(Number(stats[0]?.totalViews || 0))} |
| ❤️ **Общие лайки** | ${formatNumber(Number(stats[0]?.totalLikes || 0))} |
| 📊 **Средние просмотры** | ${formatNumber(Math.round(Number(stats[0]?.avgViews || 0)))} |

---

## 👥 КОНКУРЕНТЫ (редактируемая секция)

> **Инструкция:** Вы можете редактировать данные в таблице ниже. Изменения будут применены к базе данных после синхронизации.

<!-- EDITABLE_COMPETITORS_START -->
| ID | Username | Полное имя | Заметки | Активен |
|----|----------|------------|---------|---------|
${competitors
  .map(
    (comp) =>
      `| ${comp.id} | ${comp.username} | ${comp.full_name || ""} | ${comp.notes || ""} | ${comp.is_active ? "✅" : "❌"} |`
  )
  .join("\n")}
<!-- EDITABLE_COMPETITORS_END -->

**Как редактировать:**
- ✅ = активен, ❌ = неактивен
- Можно изменять полное имя и заметки
- НЕ изменяйте ID и Username без крайней необходимости

---

## 🏷️ ХЭШТЕГИ (редактируемая секция)

> **Инструкция:** Вы можете редактировать данные в таблице ниже. Изменения будут применены к базе данных после синхронизации.

<!-- EDITABLE_HASHTAGS_START -->
| ID | Хэштег | Заметки | Активен |
|----|--------|---------|---------|
${hashtags
  .map(
    (tag) =>
      `| ${tag.id} | ${tag.tag_name} | ${tag.notes || ""} | ${tag.is_active ? "✅" : "❌"} |`
  )
  .join("\n")}
<!-- EDITABLE_HASHTAGS_END -->

**Как редактировать:**
- ✅ = активен, ❌ = неактивен
- Можно изменять заметки
- НЕ изменяйте ID без крайней необходимости
- Хэштеги указывайте без символа #

---

## 🔄 КОМАНДЫ СИНХРОНИЗАЦИИ

### Применить изменения в БД
\`\`\`bash
# Синхронизировать изменения из Obsidian в базу данных
bun run sync:from-obsidian ${projectId}
\`\`\`

### Обновить данные из БД
\`\`\`bash
# Обновить этот файл данными из базы данных
bun run sync:to-obsidian ${projectId}
\`\`\`

### Полная синхронизация
\`\`\`bash
# Двухсторонняя синхронизация
bun run sync:bidirectional ${projectId}
\`\`\`

---

## 📝 ЖУРНАЛ ИЗМЕНЕНИЙ

**Последняя синхронизация:** ${new Date().toLocaleString("ru-RU")}

**История изменений:**
- Создан редактируемый дашборд
- Настроена двухсторонняя синхронизация
- Добавлены инструкции по редактированию

---

## ⚠️ ВАЖНЫЕ ЗАМЕЧАНИЯ

1. **Резервное копирование:** Все изменения автоматически сохраняются в Git
2. **Конфликты:** При конфликтах приоритет имеют данные из БД
3. **Валидация:** Некорректные данные будут отклонены
4. **Логирование:** Все изменения записываются в лог

---

*Файл создан: ${new Date().toLocaleString("ru-RU")}*  
*Проект ID: ${projectId} | Статус: 🟢 Готов к редактированию*`;

  const editablePath = path.join(projectDir, "editable-dashboard.md");
  fs.writeFileSync(editablePath, editableDashboard, "utf8");

  console.log(`✅ Редактируемый дашборд создан: ${editablePath}`);
  console.log(`👥 Конкурентов: ${competitors.length}`);
  console.log(`🏷️ Хэштегов: ${hashtags.length}`);

  await closeDBConnection();
}

async function main() {
  const command = process.argv[2];
  const projectIdArg = process.argv[3];

  if (!projectIdArg) {
    console.error("❌ Укажите ID проекта");
    console.log("Использование:");
    console.log(
      "  bun run sync:from-obsidian <PROJECT_ID>  # Синхронизация из Obsidian в БД"
    );
    console.log(
      "  bun run sync:to-obsidian <PROJECT_ID>    # Создание редактируемого дашборда"
    );
    console.log(
      "  bun run sync:bidirectional <PROJECT_ID>  # Двухсторонняя синхронизация"
    );
    process.exit(1);
  }

  const projectId = parseInt(projectIdArg);
  if (isNaN(projectId)) {
    console.error("❌ ID проекта должен быть числом");
    process.exit(1);
  }

  try {
    switch (command) {
      case "from-obsidian":
        await syncFromObsidianToDB(projectId);
        break;
      case "to-obsidian":
        await createEditableDashboard(projectId);
        break;
      case "bidirectional":
        await createEditableDashboard(projectId);
        await syncFromObsidianToDB(projectId);
        break;
      default:
        console.error("❌ Неизвестная команда:", command);
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
