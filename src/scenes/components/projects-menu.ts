import { Markup } from "telegraf";
import { Project } from "../../schemas";

// Функция для генерации клавиатуры списка проектов
function generateProjectsMenuKeyboard(projects: Project[]) {
  const buttons = [];

  // Добавляем кнопки для каждого проекта с кнопкой удаления справа
  for (const project of projects) {
    buttons.push([
      Markup.button.callback(
        `📁 ${project.name}`,
        `select_project_${project.id}`
      ),
      Markup.button.callback("🗑️", `delete_project_${project.id}`),
    ]);
  }

  // Добавляем управляющие кнопки
  buttons.push([
    Markup.button.callback("➕ Создать новый проект", "create_new_project"),
  ]);

  buttons.push([
    Markup.button.callback("⬅️ Назад в главное меню", "back_to_main_menu"),
  ]);

  return buttons;
}

export const меню = {
  generateProjectsMenuKeyboard,
};
