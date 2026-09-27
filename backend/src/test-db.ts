import "dotenv/config";
import { prisma } from "./config/prisma.js";
import { redis } from "./config/redis.js";

async function testConnections() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("PostgreSQL connected successfully");

    await redis.ping();
    console.log("Redis connected successfully");
  } catch (error) {
    console.error("Connection test failed:", error);
  } finally {
    await prisma.$disconnect();
    redis.disconnect();
  }
}

testConnections();