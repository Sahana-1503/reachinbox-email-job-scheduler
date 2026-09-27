import { Router } from "express";
import crypto from "crypto";

import {
  disconnectSlack,
  exchangeSlackCode,
  getSlackAuthorizeUrl,
  saveSlackConnection,
} from "../services/slack.service.js";

import { prisma } from "../config/prisma.js";

const router = Router();

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
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    /*
     * Verify that the user actually exists.
     */

    const user = await prisma.user.findUnique({
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

    const state = Buffer.from(
      JSON.stringify({
        userId,
        nonce: crypto.randomUUID(),
      })
    ).toString("base64url");

    /*
     * Generate Slack authorization URL.
     */

    const slackUrl =
      getSlackAuthorizeUrl(state);

    return res.redirect(slackUrl);

  } catch (error) {
    console.error(
      "Slack connect error:",
      error
    );

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
    const code = req.query.code as string;
    const state = req.query.state as string;

    if (!code || !state) {
      return res.status(400).send(
        "Missing Slack OAuth parameters."
      );
    }

    /*
     * Decode OAuth state.
     */

    let stateData: {
      userId: string;
      nonce: string;
    };

    try {
      stateData = JSON.parse(
        Buffer.from(
          state,
          "base64url"
        ).toString("utf8")
      );
    } catch {
      return res.status(400).send(
        "Invalid OAuth state."
      );
    }

    const {
      userId,
    } = stateData;

    if (!userId) {
      return res.status(400).send(
        "Invalid OAuth state: missing userId."
      );
    }

    /*
     * Make sure the user still exists.
     */

    const user =
      await prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!user) {
      return res.status(404).send(
        "User not found."
      );
    }

    /*
     * Exchange Slack authorization code
     * for an access token.
     */

    const slack =
      await exchangeSlackCode(code);

    /*
     * Slack OAuth may return:
     *
     * access_token
     * team.id
     * incoming_webhook.channel_id
     */

    await saveSlackConnection(
      userId,
      slack.access_token,
      slack.team?.id,
      slack.incoming_webhook?.channel_id
    );

    console.log(
      `Slack connected for user ${userId}`
    );

    /*
     * Redirect back to frontend.
     */

    return res.redirect(
      `${process.env.FRONTEND_URL}?slack=connected`
    );

  } catch (error) {
    console.error(
      "Slack OAuth callback error:",
      error
    );

    return res.redirect(
      `${process.env.FRONTEND_URL}?slack=error`
    );
  }
});

/*
|--------------------------------------------------------------------------
| Disconnect Slack
|--------------------------------------------------------------------------
*/

router.post("/disconnect", async (req, res) => {
  try {
    const {
      userId,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    await disconnectSlack(userId);

    return res.json({
      success: true,
      message: "Slack disconnected",
    });

  } catch (error) {
    console.error(
      "Slack disconnect error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to disconnect Slack",
    });
  }
});

export default router;