import "dotenv/config";
import { bullBoardRouter } from "./config/bull-board.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import slackRoutes from "./routes/slack.routes.js";
import morgan from "morgan";
import searchRoutes from "./routes/search.routes.js";
import emailRoutes from "./routes/email.routes.js";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
import authRoutes from "./routes/auth.routes.js";
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(passport.initialize());

app.use("/api/auth", authRoutes);
app.use("/api/slack", slackRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/search", searchRoutes);
app.use("/admin/queues", bullBoardRouter);
export default app;