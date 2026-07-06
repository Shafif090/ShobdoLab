import { Router } from "express";
import {
  addWordToUser,
  getWordDetail,
  searchWords,
} from "../controllers/wordController.js";
import { requireUserId } from "../middleware/requireUserId.js";

const router = Router();

router.use(requireUserId);
router.get("/search", searchWords);
router.post("/:wordId/add", addWordToUser);
router.get("/:wordId", getWordDetail);

export default router;
