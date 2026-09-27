"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const prisma_js_1 = require("./config/prisma.js");
const redis_js_1 = require("./config/redis.js");
async function testConnections() {
    try {
        await prisma_js_1.prisma.$queryRaw `SELECT 1`;
        console.log("PostgreSQL connected successfully");
        await redis_js_1.redis.ping();
        console.log("Redis connected successfully");
    }
    catch (error) {
        console.error("Connection test failed:", error);
    }
    finally {
        await prisma_js_1.prisma.$disconnect();
        redis_js_1.redis.disconnect();
    }
}
testConnections();
//# sourceMappingURL=test-db.js.map