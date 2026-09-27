import { Request, Response } from "express";
import { searchEmails } from "../services/elasticsearch.service.js";

export async function searchEmailController(req: Request, res: Response) {
  try {
    const userId = String(req.query.userId || "");
    const query = String(req.query.q || "");
    const status = req.query.status
      ? String(req.query.status) as
          "SCHEDULED" | "SENDING" | "SENT" | "FAILED"
      : undefined;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const emails = await searchEmails(userId, query, status);

    return res.json({
      success: true,
      count: emails.length,
      emails,
    });
  } catch (error) {
    console.error("Search error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to search emails",
    });
  }
}