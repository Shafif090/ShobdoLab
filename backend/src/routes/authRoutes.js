import { Router } from "express";
import {
  forgotPassword,
  googleAuthUrl,
  login,
  oauthSession,
  refreshSession,
  resetPassword,
  signup,
} from "../controllers/authController.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh", refreshSession);
router.post("/google/url", googleAuthUrl);
router.post("/oauth/session", oauthSession);

export default router;
