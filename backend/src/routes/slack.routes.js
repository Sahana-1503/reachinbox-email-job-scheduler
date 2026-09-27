"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const slack_service_js_1 = require("../services/slack.service.js");
const prisma_js_1 = require("../config/prisma.js");
const router = (0, express_1.Router)();
/*
|--------------------------------------------------------------------------
| Connect Slack
|--------------------------------------------------------------------------
|
| We receive the logged-in user's ID from the frontend.
| The ID is stored inside OAuth state so that after Slack redirects
| back to us, we know which ReachInbox user connected Slack.
|
*/
router.get("/connect", async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required",
            });
        }
        /*
         * Verify that the user actually exists.
         */
        const user = await prisma_js_1.prisma.user.findUnique({
            where: {
                id: userId,
            },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        /*
         * Create OAuth state.
         */
        const state = Buffer.from(JSON.stringify({
            userId,
            nonce: crypto_1.default.randomUUID(),
        })).toString("base64url");
        /*
         * Generate Slack authorization URL.
         */
        const slackUrl = (0, slack_service_js_1.getSlackAuthorizeUrl)(state);
        return res.redirect(slackUrl);
    }
    catch (error) {
        console.error("Slack connect error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to connect Slack",
        });
    }
});
/*
|--------------------------------------------------------------------------
| Slack OAuth callback
|--------------------------------------------------------------------------
*/
router.get("/oauth/callback", async (req, res) => {
    try {
        const code = req.query.code;
        const state = req.query.state;
        if (!code || !state) {
            return res.status(400).send("Missing Slack OAuth parameters.");
        }
        /*
         * Decode OAuth state.
         */
        let stateData;
        try {
            stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
        }
        catch {
            return res.status(400).send("Invalid OAuth state.");
        }
        const { userId, } = stateData;
        if (!userId) {
            return res.status(400).send("Invalid OAuth state: missing userId.");
        }
        /*
         * Make sure the user still exists.
         */
        const user = await prisma_js_1.prisma.user.findUnique({
            where: {
                id: userId,
            },
        });
        if (!user) {
            return res.status(404).send("User not found.");
        }
        /*
         * Exchange Slack authorization code
         * for an access token.
         */
        const slack = await (0, slack_service_js_1.exchangeSlackCode)(code);
        /*
         * Slack OAuth may return:
         *
         * access_token
         * team.id
         * incoming_webhook.channel_id
         */
        await (0, slack_service_js_1.saveSlackConnection)(userId, slack.access_token, slack.team?.id, slack.incoming_webhook?.channel_id);
        console.log(`Slack connected for user ${userId}`);
        /*
         * Redirect back to frontend.
         */
        return res.redirect(`${process.env.FRONTEND_URL}?slack=connected`);
    }
    catch (error) {
        console.error("Slack OAuth callback error:", error);
        return res.redirect(`${process.env.FRONTEND_URL}?slack=error`);
    }
});
/*
|--------------------------------------------------------------------------
| Disconnect Slack
|--------------------------------------------------------------------------
*/
router.post("/disconnect", async (req, res) => {
    try {
        const { userId, } = req.body;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "userId is required",
            });
        }
        await (0, slack_service_js_1.disconnectSlack)(userId);
        return res.json({
            success: true,
            message: "Slack disconnected",
        });
    }
    catch (error) {
        console.error("Slack disconnect error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to disconnect Slack",
        });
    }
});
exports.default = router;
//# sourceMappingURL=slack.routes.js.map