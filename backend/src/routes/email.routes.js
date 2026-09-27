"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const email_controller_js_1 = require("../controllers/email.controller.js");
const router = (0, express_1.Router)();
router.post("/schedule", email_controller_js_1.scheduleEmail);
router.get("/scheduled", email_controller_js_1.getScheduledEmails);
router.get("/sent", email_controller_js_1.getSentEmails);
exports.default = router;
//# sourceMappingURL=email.routes.js.map