import { Router } from "express";
import {
  getExerciseHistory,
  getExerciseMeta,
  startExerciseSession,
} from "../controllers/exerciseController.js";
import { requireUserId } from "../middleware/requireUserId.js";

const router = Router();

router.use(requireUserId);
router.get("/history", getExerciseHistory);
router.get("/meta", getExerciseMeta);
router.post("/start", startExerciseSession);

export default router;
