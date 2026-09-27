import "dotenv/config";
import app from "./app.js";
import { initializeEmailIndex } from "./services/elasticsearch.service.js";
import { recoverScheduledEmails } from "./services/recovery.service.js";

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    await initializeEmailIndex();

    await recoverScheduledEmails();

    app.listen(PORT, () => {
      console.log(`API server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();