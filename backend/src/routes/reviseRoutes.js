import { Router } from "express";
import {
  getReviseSummary,
  startReviseSession,
} from "../controllers/reviseController.js";
import { requireUserId } from "../middleware/requireUserId.js";

const router = Router();

router.use(requireUserId);
router.get("/summary", getReviseSummary);
router.post("/start", startReviseSession);

export default router;
