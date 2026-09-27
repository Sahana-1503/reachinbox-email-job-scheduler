import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "./prisma.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5000/api/auth/google/callback",
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("Google account email not found"));
        }

        let user = await prisma.user.findUnique({
          where: {
            googleId: profile.id,
          },
        });

        if (!user) {
          user = await prisma.user.findUnique({
            where: {
              email,
            },
          });

          if (user) {
            user = await prisma.user.update({
              where: {
                id: user.id,
              },
              data: {
                googleId: profile.id,
                name: profile.displayName || user.name,
                avatar: profile.photos?.[0]?.value || user.avatar,
              },
            });
          } else {
            user = await prisma.user.create({
              data: {
                googleId: profile.id,
                email,
                name: profile.displayName || "Google User",
                avatar: profile.photos?.[0]?.value || null,
              },
            });
          }
        }

        await prisma.sender.upsert({
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
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

export default passport;