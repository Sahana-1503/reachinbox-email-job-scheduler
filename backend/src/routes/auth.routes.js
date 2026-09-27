"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const passport_js_1 = __importDefault(require("../config/passport.js"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_js_1 = require("../config/prisma.js");
const auth_middleware_js_1 = require("../middleware/auth.middleware.js");
const router = (0, express_1.Router)();
router.get("/google", passport_js_1.default.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
}));
router.get("/google/callback", passport_js_1.default.authenticate("google", {
    session: false,
    failureRedirect: "http://localhost:5173/login?error=google_auth_failed",
}), (req, res) => {
    const user = req.user;
    const token = jsonwebtoken_1.default.sign({
        userId: user.id,
        email: user.email,
    }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
    res.cookie("auth_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.redirect("http://localhost:5173");
});
router.post("/logout", (_req, res) => {
    res.clearCookie("auth_token");
    res.json({
        success: true,
        message: "Logged out successfully",
    });
});
router.get("/me", auth_middleware_js_1.requireAuth, async (req, res) => {
    try {
        const user = await prisma_js_1.prisma.user.findUnique({
            where: {
                id: req.userId,
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
    }
    catch (error) {
        console.error("Failed to get current user:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get current user",
        });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map