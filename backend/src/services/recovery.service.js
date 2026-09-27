"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recoverScheduledEmails = recoverScheduledEmails;
const prisma_js_1 = require("../config/prisma.js");
const email_queue_js_1 = require("../queues/email.queue.js");
async function recoverScheduledEmails() {
    const emails = await prisma_js_1.prisma.email.findMany({
        where: {
            status: "SCHEDULED",
            scheduledAt: {
                gt: new Date(),
            },
        },
    });
    let recovered = 0;
    for (const email of emails) {
        const delay = Math.max(0, email.scheduledAt.getTime() - Date.now());
        await email_queue_js_1.emailQueue.add("send-email", {
            emailId: email.id,
            senderId: email.senderId,
            recipient: email.recipient,
            subject: email.subject,
            body: email.body,
            minDelayMs: email.minDelayMs,
            hourlyLimit: email.hourlyLimit,
        }, {
            jobId: email.id,
            delay,
        });
        recovered++;
    }
    console.log(`Recovered ${recovered} scheduled email(s)`);
}
//# sourceMappingURL=recovery.service.js.map