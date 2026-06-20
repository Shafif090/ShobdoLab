import { Router } from "express";
import {
  finishQuizSession,
  getQuizResult,
  getQuizSession,
  getNextQuizItem,
  retryQuizSession,
  submitQuizAnswer,
} from "../controllers/quizController.js";
import { requireUserId } from "../middleware/requireUserId.js";

const router = Router();

router.use(requireUserId);
router.get("/:sessionId", getQuizSession);
router.post("/:sessionId/answer", submitQuizAnswer);
router.post("/:sessionId/next", getNextQuizItem);
router.post("/:sessionId/finish", finishQuizSession);
router.get("/:sessionId/result", getQuizResult);
router.post("/:sessionId/retry", retryQuizSession);

export default router;
