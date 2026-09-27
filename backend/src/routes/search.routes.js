"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const search_controller_js_1 = require("../controllers/search.controller.js");
const router = (0, express_1.Router)();
router.get("/", search_controller_js_1.searchEmailController);
exports.default = router;
//# sourceMappingURL=search.routes.js.map