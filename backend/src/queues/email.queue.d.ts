import { Queue } from "bullmq";
export declare const EMAIL_QUEUE_NAME = "email-scheduler";
export interface EmailJobData {
    emailId: string;
    senderId: string;
    recipient: string;
    subject: string;
    body: string;
    minDelayMs: number;
    hourlyLimit: number;
}
export declare const emailQueue: Queue<EmailJobData, any, string, EmailJobData, any, string, import("bullmq").RedisQueueBackend, import("bullmq").ConnectionOptions>;
//# sourceMappingURL=email.queue.d.ts.map