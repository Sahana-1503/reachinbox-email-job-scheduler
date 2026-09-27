"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_js_1 = __importDefault(require("./app.js"));
const elasticsearch_service_js_1 = require("./services/elasticsearch.service.js");
const recovery_service_js_1 = require("./services/recovery.service.js");
const PORT = Number(process.env.PORT || 5000);
async function startServer() {
    try {
        await (0, elasticsearch_service_js_1.initializeEmailIndex)();
        await (0, recovery_service_js_1.recoverScheduledEmails)();
        app_js_1.default.listen(PORT, () => {
            console.log(`API server running at http://localhost:${PORT}`);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map