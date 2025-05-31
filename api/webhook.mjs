export default async function handler(req, res) {
  try {
    // Проверяем метод запроса
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Проверяем наличие токена
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res
        .status(500)
        .json({ error: "TELEGRAM_BOT_TOKEN not configured" });
    }

    // Простая заглушка для webhook
    console.log("Webhook received:", req.body);

    res.status(200).json({ ok: true, message: "Webhook received" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
