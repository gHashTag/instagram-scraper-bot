import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const token = process.env.BOT_TOKEN;

if (!token) {
  console.error('❌ BOT_TOKEN не найден в .env файле');
  process.exit(1);
}

console.log('🤖 Тестирование подключения к Telegram Bot API...');
console.log('🔑 Токен:', token.substring(0, 10) + '...');

// Создаем простого бота для теста
const bot = new Telegraf(token);

// Простой обработчик команды /start
bot.start((ctx) => {
  console.log('👤 Получена команда /start от:', ctx.from.username || ctx.from.id);
  ctx.reply('🎉 Instagram Scraper Bot работает! Привет, ' + (ctx.from.first_name || 'пользователь') + '!');
});

// Обработчик всех сообщений
bot.on('message', (ctx) => {
  console.log('📨 Получено сообщение:', ctx.message.text || '[не текст]');
  ctx.reply('🤖 Бот получил ваше сообщение! В разработке...');
});

// Запускаем бота
console.log('🚀 Запуск бота...');
bot.launch()
  .then(() => {
    console.log('✅ Бот успешно запущен и готов к работе!');
    console.log('📱 Попробуйте отправить /start боту в Telegram');
  })
  .catch((error) => {
    console.error('❌ Ошибка при запуске бота:', error);
    process.exit(1);
  });

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('🛑 Получен сигнал SIGINT, завершение работы...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('🛑 Получен сигнал SIGTERM, завершение работы...');
  bot.stop('SIGTERM');
}); 