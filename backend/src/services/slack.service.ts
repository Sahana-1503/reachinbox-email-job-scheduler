import { WebClient } from "@slack/web-api";
import { prisma } from "../config/prisma.js";

const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID!;
const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET!;
const SLACK_REDIRECT_URI = process.env.SLACK_REDIRECT_URI!;

export function getSlackAuthorizeUrl(state: string) {
  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    scope: "chat:write,incoming-webhook",
    redirect_uri: SLACK_REDIRECT_URI,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function exchangeSlackCode(code: string) {
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

export async function saveSlackConnection(
  userId: string,
  accessToken: string,
  teamId?: string,
  channelId?: string
) {
  await prisma.slackConnection.upsert({
    where: {
      userId,
    },
    update: {
      accessToken,
      teamId: teamId ?? null,
      channelId: channelId ?? null,
    },
    create: {
      userId,
      accessToken,
      teamId: teamId ?? null,
      channelId: channelId ?? null,
    },
  });
}

export async function disconnectSlack(userId: string) {
  await prisma.slackConnection.deleteMany({
    where: {
      userId,
    },
  });
}

export async function sendSlackNotification(
  userId: string,
  message: string
) {
  const connection = await prisma.slackConnection.findUnique({
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
    const client = new WebClient(connection.accessToken);

    await client.chat.postMessage({
      channel: connection.channelId,
      text: message,
    });

    console.log("Slack notification sent.");
  } catch (error) {
    console.error("Slack notification failed:", error);
  }
}