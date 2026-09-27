"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchEmailController = searchEmailController;
const express_1 = require("express");
const elasticsearch_service_js_1 = require("../services/elasticsearch.service.js");
async function searchEmailController(req, res) {
    try {
        const userId = String(req.query.userId || "");
        const query = String(req.query.q || "");
        const status = req.query.status
            ? String(req.query.status)
            : undefined;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required",
            });
        }
        const emails = await (0, elasticsearch_service_js_1.searchEmails)(userId, query, status);
        return res.json({
            success: true,
            count: emails.length,
            emails,
        });
    }
    catch (error) {
        console.error("Search error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to search emails",
        });
    }
}
//# sourceMappingURL=search.controller.js.map