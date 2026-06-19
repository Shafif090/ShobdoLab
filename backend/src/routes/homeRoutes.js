import { Router } from "express";
import { getHomeSummary } from "../controllers/homeController.js";
import { requireUserId } from "../middleware/requireUserId.js";

const router = Router();

router.use(requireUserId);
router.get("/summary", getHomeSummary);

export default router;
