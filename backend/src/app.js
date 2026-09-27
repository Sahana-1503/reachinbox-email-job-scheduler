"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bull_board_js_1 = require("./config/bull-board.js");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const slack_routes_js_1 = __importDefault(require("./routes/slack.routes.js"));
const morgan_1 = __importDefault(require("morgan"));
const search_routes_js_1 = __importDefault(require("./routes/search.routes.js"));
const email_routes_js_1 = __importDefault(require("./routes/email.routes.js"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const passport_js_1 = __importDefault(require("./config/passport.js"));
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
}));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json({ limit: "5mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use(passport_js_1.default.initialize());
app.use("/api/auth", auth_routes_js_1.default);
app.use("/api/slack", slack_routes_js_1.default);
app.use("/api/emails", email_routes_js_1.default);
app.use("/api/search", search_routes_js_1.default);
app.use("/admin/queues", bull_board_js_1.bullBoardRouter);
exports.default = app;
//# sourceMappingURL=app.js.map