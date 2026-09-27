import "dotenv/config";
import { Worker } from "bullmq";
import { EmailJobData } from "../queues/email.queue.js";
export declare const emailWorker: Worker<EmailJobData, any, string, import("bullmq").RedisQueueBackend, import("bullmq").JobProgress, import("bullmq").ConnectionOptions>;
//# sourceMappingURL=email.worker.d.ts.map