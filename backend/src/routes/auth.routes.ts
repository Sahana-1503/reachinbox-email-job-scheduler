import { Router } from "express";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { requireAuth, AuthRequest } from "../middleware/auth.middleware.js";
const router = Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect:
      "http://localhost:5173/login?error=google_auth_failed",
  }),
  (req, res) => {
    const user = req.user as {
      id: string;
      email: string;
      name: string;
      avatar: string | null;
    };

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET!,
      {
        expiresIn: "7d",
      }
    );

    res.cookie("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect("http://localhost:5173");
  }
);

router.post("/logout", (_req, res) => {
  res.clearCookie("auth_token");

  res.json({
    success: true,
    message: "Logged out successfully",
  });
});
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: req.userId!,
      },
      include: {
        senders: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        senderId: user.senders[0]?.id ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to get current user:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get current user",
    });
  }
});

export default router;