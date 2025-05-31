const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware для парсинга JSON
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Instagram Scraper Bot Railway Server",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Telegram webhook endpoint
app.post("/webhook", (req, res) => {
  try {
    console.log("📨 Telegram webhook received:", {
      method: req.method,
      url: req.url,
      headers: {
        "content-type": req.headers["content-type"],
        "user-agent": req.headers["user-agent"],
        "x-forwarded-for": req.headers["x-forwarded-for"],
      },
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    // Простая обработка webhook
    if (req.body && req.body.message) {
      console.log("💬 Message received:", {
        chat_id: req.body.message.chat?.id,
        user_id: req.body.message.from?.id,
        username: req.body.message.from?.username,
        text: req.body.message.text,
        timestamp: new Date(req.body.message.date * 1000).toISOString(),
      });
    }

    // Отвечаем Telegram что все ОК
    res.status(200).json({
      ok: true,
      message: "Webhook received successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(500).json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Запускаем сервер
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚂 Railway server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
