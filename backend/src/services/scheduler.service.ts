import { randomUUID } from "node:crypto";
import { prisma } from "../config/prisma.js";
import { emailQueue } from "../queues/email.queue.js";
import { indexEmail } from "./elasticsearch.service.js";

interface ScheduleEmailInput {
  userId: string;
  senderId: string;
  recipients: string[];
  subject: string;
  body: string;
  startTime: Date;
  delayBetweenEmails: number;
  hourlyLimit: number;
}

export async function scheduleEmails(
  input: ScheduleEmailInput
) {
  const {
    userId,
    senderId,
    recipients,
    subject,
    body,
    startTime,
    delayBetweenEmails,
    hourlyLimit,
  } = input;

  // Verify sender belongs to the logged-in user.
  const sender = await prisma.sender.findFirst({
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
   const recipient = recipients[index]!.trim().toLowerCase();

    if (!recipient) {
      continue;
    }

    const scheduledAt = new Date(
      startTime.getTime() +
        index * delayBetweenEmails
    );

    const idempotencyKey = randomUUID();

    const email = await prisma.email.create({
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

    const delay = Math.max(
      0,
      scheduledAt.getTime() - Date.now()
    );

    const job = await emailQueue.add(
      "send-email",
      {
        emailId: email.id,
        senderId,
        recipient,
        subject,
        body,
        minDelayMs: delayBetweenEmails,
        hourlyLimit,
      },
      {
        jobId: email.id,
        delay,
      }
    );

    await prisma.email.update({
      where: {
        id: email.id,
      },
      data: {
        bullJobId: String(job.id),
      },
    });
    await indexEmail(email.id);

    createdEmails.push({
      id: email.id,
      recipient,
      scheduledAt,
      bullJobId: job.id,
    });
  }

  return createdEmails;
}