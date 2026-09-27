"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const passport = __importStar(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const prisma_js_1 = require("./prisma.js");
passport.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5000/api/auth/google/callback",
}, async (_accessToken, _refreshToken, profile, done) => {
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            return done(new Error("Google account email not found"));
        }
        let user = await prisma_js_1.prisma.user.findUnique({
            where: {
                googleId: profile.id,
            },
        });
        if (!user) {
            user = await prisma_js_1.prisma.user.findUnique({
                where: {
                    email,
                },
            });
            if (user) {
                user = await prisma_js_1.prisma.user.update({
                    where: {
                        id: user.id,
                    },
                    data: {
                        googleId: profile.id,
                        name: profile.displayName || user.name,
                        avatar: profile.photos?.[0]?.value || user.avatar,
                    },
                });
            }
            else {
                user = await prisma_js_1.prisma.user.create({
                    data: {
                        googleId: profile.id,
                        email,
                        name: profile.displayName || "Google User",
                        avatar: profile.photos?.[0]?.value || null,
                    },
                });
            }
        }
        await prisma_js_1.prisma.sender.upsert({
            where: {
                userId_email: {
                    userId: user.id,
                    email: user.email,
                },
            },
            update: {
                name: user.name,
            },
            create: {
                userId: user.id,
                email: user.email,
                name: user.name,
            },
        });
        return done(null, user);
    }
    catch (error) {
        return done(error);
    }
}));
exports.default = passport;
//# sourceMappingURL=passport.js.map