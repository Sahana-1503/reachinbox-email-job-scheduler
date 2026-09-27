import { Router } from "express";
import {
  scheduleEmail,
  getScheduledEmails,
  getSentEmails,
} from "../controllers/email.controller.js";

const router = Router();

router.post(
  "/schedule",
  scheduleEmail
);

router.get(
  "/scheduled",
  getScheduledEmails
);

router.get(
  "/sent",
  getSentEmails
);

export default router;