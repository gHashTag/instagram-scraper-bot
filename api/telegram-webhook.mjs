export default async function handler(req, res) {
  // Устанавливаем CORS заголовки
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Обрабатываем OPTIONS запрос
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Проверяем метод запроса
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Логируем входящий webhook
    console.log("Telegram webhook received:", {
      method: req.method,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    // Простая заглушка - отвечаем что все ОК
    res.status(200).json({
      ok: true,
      message: "Webhook received successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
