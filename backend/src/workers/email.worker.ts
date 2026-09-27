import "dotenv/config";

import {
  DelayedError,
  Job,
  Worker,
} from "bullmq";

import { redis } from "../config/redis.js";
import { prisma } from "../config/prisma.js";

import {
  EMAIL_QUEUE_NAME,
  EmailJobData,
} from "../queues/email.queue.js";

import { sendEmail } from "../services/email.service.js";
import { indexEmail } from "../services/elasticsearch.service.js";
import { sendSlackNotification } from "../services/slack.service.js";

const concurrency = Number(
  process.env.WORKER_CONCURRENCY || 5
);

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

async function acquireSenderLock(senderId: string) {
  const key = `email-lock:${senderId}`;

  const token =
    `${process.pid}-${Date.now()}-${Math.random()}`;

  const result = await redis.set(
    key,
    token,
    "PX",
    30000,
    "NX"
  );

  if (result !== "OK") {
    return null;
  }

  return {
    key,
    token,
  };
}

async function releaseSenderLock(
  lock: {
    key: string;
    token: string;
  }
) {
  await redis.eval(
    RELEASE_LOCK_SCRIPT,
    1,
    lock.key,
    lock.token
  );
}

/*
|--------------------------------------------------------------------------
| Minimum delay between emails
|--------------------------------------------------------------------------
*/

async function getLastSentAt(
  senderId: string
) {
  const value = await redis.get(
    `last-sent:${senderId}`
  );

  return value ? Number(value) : null;
}

async function setLastSentAt(
  senderId: string
) {
  await redis.set(
    `last-sent:${senderId}`,
    Date.now().toString()
  );
}

/*
|--------------------------------------------------------------------------
| Hourly rate limiter
|--------------------------------------------------------------------------
*/

async function incrementHourlyCounter(
  senderId: string,
  hourlyLimit: number
) {
  const hourWindow = Math.floor(
    Date.now() /
      (60 * 60 * 1000)
  );

  const key =
    `email-rate:${senderId}:${hourWindow}`;

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

  const count = Number(
    await redis.eval(
      script,
      1,
      key
    )
  );

  /*
   * If the limit has been exceeded,
   * undo the increment.
   */
  if (count > hourlyLimit) {
    await redis.decr(key);

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

  return (
    Math.floor(
      now /
        (60 * 60 * 1000)
    ) + 1
  ) *
    (60 * 60 * 1000);
}

/*
|--------------------------------------------------------------------------
| Process email
|--------------------------------------------------------------------------
*/

async function processEmail(
  job: Job<EmailJobData>,
  token?: string
) {
  const {
    emailId,
    senderId,
    recipient,
    subject,
    body,
    minDelayMs,
    hourlyLimit,
  } = job.data;

  /*
   * --------------------------------------------------------------
   * Acquire sender lock
   * --------------------------------------------------------------
   */

  const lock =
    await acquireSenderLock(
      senderId
    );

  if (!lock) {
    const delay = Math.max(
      1000,
      minDelayMs
    );

    if (token) {
      await job.moveToDelayed(
        Date.now() + delay,
        token
      );

      throw new DelayedError();
    }

    return;
  }

  try {
    /*
     * --------------------------------------------------------------
     * Enforce minimum delay between actual sends
     * --------------------------------------------------------------
     */

    const lastSentAt =
      await getLastSentAt(
        senderId
      );

    if (lastSentAt) {
      const elapsed =
        Date.now() - lastSentAt;

      if (elapsed < minDelayMs) {
        const delay =
          minDelayMs - elapsed;

        if (token) {
          await job.moveToDelayed(
            Date.now() + delay,
            token
          );

          throw new DelayedError();
        }

        return;
      }
    }

    /*
     * --------------------------------------------------------------
     * Enforce hourly sender limit
     * --------------------------------------------------------------
     */

    const allowed =
      await incrementHourlyCounter(
        senderId,
        hourlyLimit
      );

    if (!allowed) {
      const nextHour =
        getNextHourTimestamp();

      const delay =
        Math.max(
          1000,
          nextHour - Date.now()
        );

      console.log(
        `Hourly limit reached for sender ${senderId}. ` +
        `Rescheduling email ${emailId}.`
      );

      /*
       * ------------------------------------------------------------
       * Slack notification
       * ------------------------------------------------------------
       */

      try {
        const email =
          await prisma.email.findUnique({
            where: {
              id: emailId,
            },

            include: {
              sender: true,
            },
          });

        if (email) {
          await sendSlackNotification(
            email.userId,
            `⚠️ Email rate limit reached

Sender: ${email.sender.email}

Hourly limit: ${hourlyLimit}

Recipient: ${recipient}

Email has been rescheduled for the next hour.`
          );
        }
      } catch (slackError) {
        /*
         * Slack failure must NEVER
         * break email scheduling.
         */

        console.error(
          "Slack notification failed:",
          slackError
        );
      }

      /*
       * ------------------------------------------------------------
       * Reschedule BullMQ job
       * ------------------------------------------------------------
       */

      if (token) {
        await job.moveToDelayed(
          Date.now() + delay,
          token
        );

        throw new DelayedError();
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

    const claimed =
      await prisma.email.updateMany({
        where: {
          id: emailId,
          status: "SCHEDULED",
        },

        data: {
          status: "SENDING",
        },
      });

    if (claimed.count === 0) {
      console.log(
        `Email ${emailId} already processed or claimed.`
      );

      return;
    }

    /*
     * --------------------------------------------------------------
     * Get sender
     * --------------------------------------------------------------
     */

    try {
      const sender =
        await prisma.sender.findUnique({
          where: {
            id: senderId,
          },
        });

      if (!sender) {
        throw new Error(
          `Sender ${senderId} not found`
        );
      }

      /*
       * ------------------------------------------------------------
       * Send email using Ethereal
       * ------------------------------------------------------------
       */

      const result =
        await sendEmail({
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

      await prisma.email.update({
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

      await indexEmail(
        emailId
      );

      /*
       * ------------------------------------------------------------
       * Save last send timestamp
       * ------------------------------------------------------------
       */

      await setLastSentAt(
        senderId
      );

      console.log(
        `Email sent: ${recipient}`
      );

      /*
       * ------------------------------------------------------------
       * Ethereal preview URL
       * ------------------------------------------------------------
       */

      if (result.previewUrl) {
        console.log(
          `Preview: ${result.previewUrl}`
        );
      }

      return result;

    } catch (error) {

      /*
       * ------------------------------------------------------------
       * Mark email as FAILED
       * ------------------------------------------------------------
       */

      await prisma.email.update({
        where: {
          id: emailId,
        },

        data: {
          status: "FAILED",

          error:
            error instanceof Error
              ? error.message
              : "Unknown error",
        },
      });

      /*
       * Update Elasticsearch
       */

      await indexEmail(
        emailId
      );

      throw error;
    }

  } finally {

    /*
     * Always release sender lock
     */

    await releaseSenderLock(
      lock
    );
  }
}

/*
|--------------------------------------------------------------------------
| BullMQ Worker
|--------------------------------------------------------------------------
*/

export const emailWorker =
  new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    processEmail,
    {
      connection: redis,
      concurrency,
    }
  );

/*
|--------------------------------------------------------------------------
| Worker events
|--------------------------------------------------------------------------
*/

emailWorker.on(
  "completed",
  (job) => {
    console.log(
      `Job completed: ${job.id}`
    );
  }
);

emailWorker.on(
  "failed",
  (job, error) => {
    console.error(
      `Job failed: ${job?.id}`,
      error
    );
  }
);

emailWorker.on(
  "stalled",
  (jobId) => {
    console.warn(
      `Job stalled: ${jobId}`
    );
  }
);

/*
|--------------------------------------------------------------------------
| Worker startup
|--------------------------------------------------------------------------
*/

console.log(
  `Email worker started with concurrency ${concurrency}`
);