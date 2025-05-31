export default async function handler(req, res) {
  try {
    const status = {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Instagram Scraper Bot",
      version: "2.0.0",
      environment: process.env.NODE_ENV || "development",
      env_check: {
        telegram_token: !!process.env.TELEGRAM_BOT_TOKEN,
        database_url: !!process.env.DATABASE_URL,
        apify_token: !!process.env.APIFY_TOKEN,
        openai_key: !!process.env.OPENAI_API_KEY,
        admin_user: !!process.env.ADMIN_USER_ID,
        obsidian_path: !!process.env.OBSIDIAN_VAULT_PATH,
      },
    };

    res.status(200).json(status);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
