"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailQueue = exports.EMAIL_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const redis_js_1 = require("../config/redis.js");
exports.EMAIL_QUEUE_NAME = "email-scheduler";
exports.emailQueue = new bullmq_1.Queue(exports.EMAIL_QUEUE_NAME, {
    connection: redis_js_1.redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: false,
        removeOnFail: false,
    },
});
exports.emailQueue.on("error", (error) => {
    console.error("Email queue error:", error);
});
//# sourceMappingURL=email.queue.js.map