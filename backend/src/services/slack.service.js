"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSlackAuthorizeUrl = getSlackAuthorizeUrl;
exports.exchangeSlackCode = exchangeSlackCode;
exports.saveSlackConnection = saveSlackConnection;
exports.disconnectSlack = disconnectSlack;
exports.sendSlackNotification = sendSlackNotification;
const web_api_1 = require("@slack/web-api");
const prisma_js_1 = require("../config/prisma.js");
const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI;
function getSlackAuthorizeUrl(state) {
    const params = new URLSearchParams({
        client_id: SLACK_CLIENT_ID,
        scope: "chat:write,incoming-webhook",
        redirect_uri: SLACK_REDIRECT_URI,
        state,
    });
    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}
async function exchangeSlackCode(code) {
    const response = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            client_id: SLACK_CLIENT_ID,
            client_secret: SLACK_CLIENT_SECRET,
            code,
            redirect_uri: SLACK_REDIRECT_URI,
        }),
    });
    const data = await response.json();
    if (!data.ok) {
        throw new Error(data.error || "Slack OAuth failed");
    }
    return data;
}
async function saveSlackConnection(userId, accessToken, teamId, channelId) {
    return prisma_js_1.prisma.slackConnection.upsert({
        where: {
            userId,
        },
        update: {
            accessToken,
            teamId,
            channelId,
        },
        create: {
            userId,
            accessToken,
            teamId,
            channelId,
        },
    });
}
async function disconnectSlack(userId) {
    await prisma_js_1.prisma.slackConnection.deleteMany({
        where: {
            userId,
        },
    });
}
async function sendSlackNotification(userId, message) {
    const connection = await prisma_js_1.prisma.slackConnection.findUnique({
        where: {
            userId,
        },
    });
    if (!connection) {
        console.log("Slack not connected. Skipping notification.");
        return;
    }
    if (!connection.channelId) {
        console.log("Slack channel not configured. Skipping notification.");
        return;
    }
    try {
        const client = new web_api_1.WebClient(connection.accessToken);
        await client.chat.postMessage({
            channel: connection.channelId,
            text: message,
        });
        console.log("Slack notification sent.");
    }
    catch (error) {
        console.error("Slack notification failed:", error);
    }
}
//# sourceMappingURL=slack.service.js.map