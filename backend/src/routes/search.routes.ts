import { Router } from "express";
import { searchEmailController } from "../controllers/search.controller.js";

const router = Router();

router.get("/", searchEmailController);

export default router;