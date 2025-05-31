const http = require("http");

const server = http.createServer((req, res) => {
  // Устанавливаем CORS заголовки
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Обрабатываем OPTIONS запрос
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log("Headers:", req.headers);

  if (req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        console.log("📦 Telegram webhook data:", JSON.stringify(data, null, 2));

        // Простой ответ
        const response = {
          ok: true,
          message: "Telegram webhook received successfully",
          timestamp: new Date().toISOString(),
          receivedData: data,
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));

        console.log("✅ Response sent:", response);
      } catch (error) {
        console.error("❌ Error parsing JSON:", error);
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  } else {
    // Для GET запросов - простая страница статуса
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <html>
        <body>
          <h1>🤖 Telegram Webhook Server</h1>
          <p>Status: ✅ Running</p>
          <p>Time: ${new Date().toISOString()}</p>
          <p>Ready to receive Telegram webhooks!</p>
        </body>
      </html>
    `);
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Webhook server running on http://localhost:${PORT}`);
  console.log("📡 Ready to receive Telegram webhooks!");
});
