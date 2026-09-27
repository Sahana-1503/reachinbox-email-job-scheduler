"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleEmails = scheduleEmails;
const node_crypto_1 = require("node:crypto");
const prisma_js_1 = require("../config/prisma.js");
const email_queue_js_1 = require("../queues/email.queue.js");
const elasticsearch_service_js_1 = require("./elasticsearch.service.js");
async function scheduleEmails(input) {
    const { userId, senderId, recipients, subject, body, startTime, delayBetweenEmails, hourlyLimit, } = input;
    // Verify sender belongs to the logged-in user.
    const sender = await prisma_js_1.prisma.sender.findFirst({
        where: {
            id: senderId,
            userId,
        },
    });
    if (!sender) {
        throw new Error("Sender not found");
    }
    if (recipients.length === 0) {
        throw new Error("At least one recipient is required");
    }
    if (startTime.getTime() < Date.now()) {
        throw new Error("Start time must be in the future");
    }
    if (delayBetweenEmails < 0) {
        throw new Error("Delay cannot be negative");
    }
    if (hourlyLimit <= 0) {
        throw new Error("Hourly limit must be greater than zero");
    }
    const createdEmails = [];
    /*
     * Each recipient becomes an independent email record
     * and an independent BullMQ job.
     */
    for (let index = 0; index < recipients.length; index++) {
        const recipient = recipients[index].trim().toLowerCase();
        if (!recipient) {
            continue;
        }
        const scheduledAt = new Date(startTime.getTime() +
            index * delayBetweenEmails);
        const idempotencyKey = (0, node_crypto_1.randomUUID)();
        const email = await prisma_js_1.prisma.email.create({
            data: {
                userId,
                senderId,
                recipient,
                subject,
                body,
                scheduledAt,
                minDelayMs: delayBetweenEmails,
                hourlyLimit,
                idempotencyKey,
            },
        });
        const delay = Math.max(0, scheduledAt.getTime() - Date.now());
        const job = await email_queue_js_1.emailQueue.add("send-email", {
            emailId: email.id,
            senderId,
            recipient,
            subject,
            body,
            minDelayMs: delayBetweenEmails,
            hourlyLimit,
        }, {
            jobId: email.id,
            delay,
        });
        await prisma_js_1.prisma.email.update({
            where: {
                id: email.id,
            },
            data: {
                bullJobId: String(job.id),
            },
        });
        await (0, elasticsearch_service_js_1.indexEmail)(email.id);
        createdEmails.push({
            id: email.id,
            recipient,
            scheduledAt,
            bullJobId: job.id,
        });
    }
    return createdEmails;
}
//# sourceMappingURL=scheduler.service.js.map