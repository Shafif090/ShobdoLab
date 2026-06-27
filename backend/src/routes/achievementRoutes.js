import { Router } from "express";
import { getAchievements } from "../controllers/achievementController.js";
import { requireUserId } from "../middleware/requireUserId.js";

const router = Router();

router.use(requireUserId);
router.get("/", getAchievements);

export default router;
