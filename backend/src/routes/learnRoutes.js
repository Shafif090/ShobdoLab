import { Router } from "express";
import {
  createNextSet,
  getCurrentSet,
  startLearnQuiz,
} from "../controllers/learnController.js";
import { requireUserId } from "../middleware/requireUserId.js";

const router = Router();

router.use(requireUserId);
router.get("/current-set", getCurrentSet);
router.post("/next-set", createNextSet);
router.post("/:setId/start-quiz", startLearnQuiz);

export default router;
