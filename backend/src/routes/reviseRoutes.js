import { Router } from "express";
import {
  getLearnedWords,
  getReviseSummary,
  startReviseSession,
} from "../controllers/reviseController.js";
import { requireUserId } from "../middleware/requireUserId.js";

const router = Router();

router.use(requireUserId);
router.get("/summary", getReviseSummary);
router.get("/words", getLearnedWords);
router.post("/start", startReviseSession);

export default router;
