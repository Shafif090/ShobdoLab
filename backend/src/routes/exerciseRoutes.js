import { Router } from "express";
import {
  getExerciseMeta,
  startExerciseSession,
} from "../controllers/exerciseController.js";
import { requireUserId } from "../middleware/requireUserId.js";

const router = Router();

router.use(requireUserId);
router.get("/meta", getExerciseMeta);
router.post("/start", startExerciseSession);

export default router;
