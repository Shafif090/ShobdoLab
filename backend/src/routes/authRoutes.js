import { Router } from "express";
import {
  googleAuthUrl,
  login,
  oauthSession,
  signup,
} from "../controllers/authController.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/google/url", googleAuthUrl);
router.post("/oauth/session", oauthSession);

export default router;
