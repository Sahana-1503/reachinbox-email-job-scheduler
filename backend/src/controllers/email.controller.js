"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleEmail = scheduleEmail;
exports.getScheduledEmails = getScheduledEmails;
exports.getSentEmails = getSentEmails;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_js_1 = require("../config/prisma.js");
const scheduler_service_js_1 = require("../services/scheduler.service.js");
const scheduleEmailSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    senderId: zod_1.z.string().min(1),
    recipients: zod_1.z
        .array(zod_1.z.string().email())
        .min(1),
    subject: zod_1.z.string().min(1).max(500),
    body: zod_1.z.string().min(1),
    startTime: zod_1.z.string().datetime(),
    delayBetweenEmails: zod_1.z.number().int().min(0),
    hourlyLimit: zod_1.z.number().int().positive(),
});
async function scheduleEmail(req, res) {
    try {
        const data = scheduleEmailSchema.parse(req.body);
        const emails = await (0, scheduler_service_js_1.scheduleEmails)({
            ...data,
            startTime: new Date(data.startTime),
        });
        return res.status(201).json({
            success: true,
            message: `${emails.length} email(s) scheduled successfully`,
            emails,
        });
    }
    catch (error) {
        console.error("Schedule email error:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                message: "Invalid request",
                errors: error.issues,
            });
        }
        return res.status(500).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Failed to schedule emails",
        });
    }
}
async function getScheduledEmails(req, res) {
    try {
        const userId = String(req.query.userId || "");
        const search = String(req.query.search || "").trim();
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required",
            });
        }
        const emails = await prisma_js_1.prisma.email.findMany({
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
    }
    catch (error) {
        console.error("Get scheduled emails error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch scheduled emails",
        });
    }
}
async function getSentEmails(req, res) {
    try {
        const userId = String(req.query.userId || "");
        const search = String(req.query.search || "").trim();
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required",
            });
        }
        const emails = await prisma_js_1.prisma.email.findMany({
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
    }
    catch (error) {
        console.error("Get sent emails error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch sent emails",
        });
    }
}
//# sourceMappingURL=email.controller.js.map