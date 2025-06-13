/**
 * 🕉️ Meta Muse Node.js Scheduler
 */
const cron = require('node-cron');
const { exec } = require('child_process');
const path = require('path');

// Запуск каждый день в 9:00
cron.schedule('0 9 * * *', () => {
  console.log('🕉️ Запуск Meta Muse Scraper:', new Date().toLocaleString());
  
  const scriptPath = path.join(__dirname, 'meta-muse-automated-scraper.ts');
  const command = `bun run ${scriptPath}`;
  
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
process.stdin.resume();