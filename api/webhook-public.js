// Простой публичный webhook для Telegram
export default function handler(req, res) {
  // Устанавливаем CORS заголовки
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Обрабатываем OPTIONS запрос
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Логируем входящий webhook
    console.log("📨 Telegram webhook received:", {
      method: req.method,
      url: req.url,
      headers: {
        "content-type": req.headers["content-type"],
        "user-agent": req.headers["user-agent"],
      },
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    // Простая заглушка - отвечаем что все ОК
    const response = {
      ok: true,
      message: "Telegram webhook received successfully",
      timestamp: new Date().toISOString(),
      method: req.method,
      bodyReceived: !!req.body,
    };

    console.log("✅ Sending response:", response);

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Telegram webhook error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message || "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
