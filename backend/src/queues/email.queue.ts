import { Queue } from "bullmq";
import { redis } from "../config/redis.js";

export const EMAIL_QUEUE_NAME = "email-scheduler";

export interface EmailJobData {
  emailId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  minDelayMs: number;
  hourlyLimit: number;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redis,
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

emailQueue.on("error", (error) => {
  console.error("Email queue error:", error);
});