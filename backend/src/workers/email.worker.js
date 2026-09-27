"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailWorker = void 0;
require("dotenv/config");
const bullmq_1 = require("bullmq");
const redis_js_1 = require("../config/redis.js");
const prisma_js_1 = require("../config/prisma.js");
const email_queue_js_1 = require("../queues/email.queue.js");
const email_service_js_1 = require("../services/email.service.js");
const elasticsearch_service_js_1 = require("../services/elasticsearch.service.js");
const slack_service_js_1 = require("../services/slack.service.js");
const concurrency = Number(process.env.WORKER_CONCURRENCY || 5);
/*
|--------------------------------------------------------------------------
| Sender distributed lock
|--------------------------------------------------------------------------
*/
const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end

return 0
`;
async function acquireSenderLock(senderId) {
    const key = `email-lock:${senderId}`;
    const token = `${process.pid}-${Date.now()}-${Math.random()}`;
    const result = await redis_js_1.redis.set(key, token, "PX", 30000, "NX");
    if (result !== "OK") {
        return null;
    }
    return {
        key,
        token,
    };
}
async function releaseSenderLock(lock) {
    await redis_js_1.redis.eval(RELEASE_LOCK_SCRIPT, 1, lock.key, lock.token);
}
/*
|--------------------------------------------------------------------------
| Minimum delay between emails
|--------------------------------------------------------------------------
*/
async function getLastSentAt(senderId) {
    const value = await redis_js_1.redis.get(`last-sent:${senderId}`);
    return value ? Number(value) : null;
}
async function setLastSentAt(senderId) {
    await redis_js_1.redis.set(`last-sent:${senderId}`, Date.now().toString());
}
/*
|--------------------------------------------------------------------------
| Hourly rate limiter
|--------------------------------------------------------------------------
*/
async function incrementHourlyCounter(senderId, hourlyLimit) {
    const hourWindow = Math.floor(Date.now() /
        (60 * 60 * 1000));
    const key = `email-rate:${senderId}:${hourWindow}`;
    const script = `
    local current =
      redis.call("INCR", KEYS[1])

    if current == 1 then
      redis.call(
        "EXPIRE",
        KEYS[1],
        3700
      )
    end

    return current
  `;
    const count = Number(await redis_js_1.redis.eval(script, 1, key));
    /*
     * If the limit has been exceeded,
     * undo the increment.
     */
    if (count > hourlyLimit) {
        await redis_js_1.redis.decr(key);
        return false;
    }
    return true;
}
/*
|--------------------------------------------------------------------------
| Calculate beginning of next hour
|--------------------------------------------------------------------------
*/
function getNextHourTimestamp() {
    const now = Date.now();
    return (Math.floor(now /
        (60 * 60 * 1000)) + 1) *
        (60 * 60 * 1000);
}
/*
|--------------------------------------------------------------------------
| Process email
|--------------------------------------------------------------------------
*/
async function processEmail(job, token) {
    const { emailId, senderId, recipient, subject, body, minDelayMs, hourlyLimit, } = job.data;
    /*
     * --------------------------------------------------------------
     * Acquire sender lock
     * --------------------------------------------------------------
     */
    const lock = await acquireSenderLock(senderId);
    if (!lock) {
        const delay = Math.max(1000, minDelayMs);
        if (token) {
            await job.moveToDelayed(Date.now() + delay, token);
            throw new bullmq_1.DelayedError();
        }
        return;
    }
    try {
        /*
         * --------------------------------------------------------------
         * Enforce minimum delay between actual sends
         * --------------------------------------------------------------
         */
        const lastSentAt = await getLastSentAt(senderId);
        if (lastSentAt) {
            const elapsed = Date.now() - lastSentAt;
            if (elapsed < minDelayMs) {
                const delay = minDelayMs - elapsed;
                if (token) {
                    await job.moveToDelayed(Date.now() + delay, token);
                    throw new bullmq_1.DelayedError();
                }
                return;
            }
        }
        /*
         * --------------------------------------------------------------
         * Enforce hourly sender limit
         * --------------------------------------------------------------
         */
        const allowed = await incrementHourlyCounter(senderId, hourlyLimit);
        if (!allowed) {
            const nextHour = getNextHourTimestamp();
            const delay = Math.max(1000, nextHour - Date.now());
            console.log(`Hourly limit reached for sender ${senderId}. ` +
                `Rescheduling email ${emailId}.`);
            /*
             * ------------------------------------------------------------
             * Slack notification
             * ------------------------------------------------------------
             */
            try {
                const email = await prisma_js_1.prisma.email.findUnique({
                    where: {
                        id: emailId,
                    },
                    include: {
                        sender: true,
                    },
                });
                if (email) {
                    await (0, slack_service_js_1.sendSlackNotification)(email.userId, `⚠️ Email rate limit reached

Sender: ${email.sender.email}

Hourly limit: ${hourlyLimit}

Recipient: ${recipient}

Email has been rescheduled for the next hour.`);
                }
            }
            catch (slackError) {
                /*
                 * Slack failure must NEVER
                 * break email scheduling.
                 */
                console.error("Slack notification failed:", slackError);
            }
            /*
             * ------------------------------------------------------------
             * Reschedule BullMQ job
             * ------------------------------------------------------------
             */
            if (token) {
                await job.moveToDelayed(Date.now() + delay, token);
                throw new bullmq_1.DelayedError();
            }
            return;
        }
        /*
         * --------------------------------------------------------------
         * Idempotency guard
         * --------------------------------------------------------------
         *
         * Only SCHEDULED emails can become SENDING.
         *
         * This prevents duplicate processing
         * when multiple workers/instances
         * see the same job.
         */
        const claimed = await prisma_js_1.prisma.email.updateMany({
            where: {
                id: emailId,
                status: "SCHEDULED",
            },
            data: {
                status: "SENDING",
            },
        });
        if (claimed.count === 0) {
            console.log(`Email ${emailId} already processed or claimed.`);
            return;
        }
        /*
         * --------------------------------------------------------------
         * Get sender
         * --------------------------------------------------------------
         */
        try {
            const sender = await prisma_js_1.prisma.sender.findUnique({
                where: {
                    id: senderId,
                },
            });
            if (!sender) {
                throw new Error(`Sender ${senderId} not found`);
            }
            /*
             * ------------------------------------------------------------
             * Send email using Ethereal
             * ------------------------------------------------------------
             */
            const result = await (0, email_service_js_1.sendEmail)({
                from: sender.email,
                to: recipient,
                subject,
                body,
            });
            /*
             * ------------------------------------------------------------
             * Mark email as SENT
             * ------------------------------------------------------------
             */
            await prisma_js_1.prisma.email.update({
                where: {
                    id: emailId,
                },
                data: {
                    status: "SENT",
                    sentAt: new Date(),
                    error: null,
                },
            });
            /*
             * ------------------------------------------------------------
             * Update Elasticsearch
             * ------------------------------------------------------------
             */
            await (0, elasticsearch_service_js_1.indexEmail)(emailId);
            /*
             * ------------------------------------------------------------
             * Save last send timestamp
             * ------------------------------------------------------------
             */
            await setLastSentAt(senderId);
            console.log(`Email sent: ${recipient}`);
            /*
             * ------------------------------------------------------------
             * Ethereal preview URL
             * ------------------------------------------------------------
             */
            if (result.previewUrl) {
                console.log(`Preview: ${result.previewUrl}`);
            }
            return result;
        }
        catch (error) {
            /*
             * ------------------------------------------------------------
             * Mark email as FAILED
             * ------------------------------------------------------------
             */
            await prisma_js_1.prisma.email.update({
                where: {
                    id: emailId,
                },
                data: {
                    status: "FAILED",
                    error: error instanceof Error
                        ? error.message
                        : "Unknown error",
                },
            });
            /*
             * Update Elasticsearch
             */
            await (0, elasticsearch_service_js_1.indexEmail)(emailId);
            throw error;
        }
    }
    finally {
        /*
         * Always release sender lock
         */
        await releaseSenderLock(lock);
    }
}
/*
|--------------------------------------------------------------------------
| BullMQ Worker
|--------------------------------------------------------------------------
*/
exports.emailWorker = new bullmq_1.Worker(email_queue_js_1.EMAIL_QUEUE_NAME, processEmail, {
    connection: redis_js_1.redis,
    concurrency,
    limiter: undefined,
});
/*
|--------------------------------------------------------------------------
| Worker events
|--------------------------------------------------------------------------
*/
exports.emailWorker.on("completed", (job) => {
    console.log(`Job completed: ${job.id}`);
});
exports.emailWorker.on("failed", (job, error) => {
    console.error(`Job failed: ${job?.id}`, error);
});
exports.emailWorker.on("stalled", (jobId) => {
    console.warn(`Job stalled: ${jobId}`);
});
/*
|--------------------------------------------------------------------------
| Worker startup
|--------------------------------------------------------------------------
*/
console.log(`Email worker started with concurrency ${concurrency}`);
//# sourceMappingURL=email.worker.js.map