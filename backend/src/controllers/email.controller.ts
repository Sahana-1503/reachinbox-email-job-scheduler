import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { scheduleEmails } from "../services/scheduler.service.js";

const scheduleEmailSchema = z.object({
  userId: z.string().min(1),
  senderId: z.string().min(1),
  recipients: z
    .array(z.string().email())
    .min(1),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  startTime: z.string().datetime(),
  delayBetweenEmails: z.number().int().min(0),
  hourlyLimit: z.number().int().positive(),
});

export async function scheduleEmail(
  req: Request,
  res: Response
) {
  try {
    const data =
      scheduleEmailSchema.parse(req.body);

    const emails = await scheduleEmails({
      ...data,
      startTime: new Date(data.startTime),
    });

    return res.status(201).json({
      success: true,
      message: `${emails.length} email(s) scheduled successfully`,
      emails,
    });
  } catch (error) {
    console.error(
      "Schedule email error:",
      error
    );

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
        errors: error.issues,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to schedule emails",
    });
  }
}

export async function getScheduledEmails(
  req: Request,
  res: Response
) {
  try {
    const userId = String(
      req.query.userId || ""
    );

    const search = String(
      req.query.search || ""
    ).trim();

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const emails =
      await prisma.email.findMany({
        where: {
          userId,
          status: {
            in: ["SCHEDULED", "SENDING"],
          },
          ...(search
            ? {
                OR: [
                  {
                    recipient: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    subject: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),
        },
        include: {
          sender: true,
        },
        orderBy: {
          scheduledAt: "asc",
        },
      });

    return res.json({
      success: true,
      emails,
    });
  } catch (error) {
    console.error(
      "Get scheduled emails error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch scheduled emails",
    });
  }
}

export async function getSentEmails(
  req: Request,
  res: Response
) {
  try {
    const userId = String(
      req.query.userId || ""
    );

    const search = String(
      req.query.search || ""
    ).trim();

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const emails =
      await prisma.email.findMany({
        where: {
          userId,
          status: {
            in: ["SENT", "FAILED"],
          },
          ...(search
            ? {
                OR: [
                  {
                    recipient: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    subject: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              }
            : {}),
        },
        include: {
          sender: true,
        },
        orderBy: {
          sentAt: "desc",
        },
      });

    return res.json({
      success: true,
      emails,
    });
  } catch (error) {
    console.error(
      "Get sent emails error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sent emails",
    });
  }
}