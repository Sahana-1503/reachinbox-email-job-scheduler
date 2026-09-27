import { prisma } from "../config/prisma.js";
import { emailQueue } from "../queues/email.queue.js";

export async function recoverScheduledEmails() {
  const emails = await prisma.email.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: {
        gt: new Date(),
      },
    },
  });

  let recovered = 0;

  for (const email of emails) {
    const delay = Math.max(
      0,
      email.scheduledAt.getTime() - Date.now()
    );

    await emailQueue.add(
      "send-email",
      {
        emailId: email.id,
        senderId: email.senderId,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        minDelayMs: email.minDelayMs,
        hourlyLimit: email.hourlyLimit,
      },
      {
        jobId: email.id,
        delay,
      }
    );

    recovered++;
  }

  console.log(`Recovered ${recovered} scheduled email(s)`);
}