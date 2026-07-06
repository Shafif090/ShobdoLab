import express from "express";
import { env, isProduction } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import achievementRoutes from "./routes/achievementRoutes.js";
import exerciseRoutes from "./routes/exerciseRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import homeRoutes from "./routes/homeRoutes.js";
import learnRoutes from "./routes/learnRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import reviseRoutes from "./routes/reviseRoutes.js";
import wordRoutes from "./routes/wordRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { requestId } from "./middleware/requestId.js";
import {
  authRateLimit,
  corsMiddleware,
  generalRateLimit,
  securityHeaders,
} from "./middleware/security.js";
import { assertSupabaseConfig } from "./lib/supabaseClient.js";

const app = express();

if (isProduction()) {
  assertSupabaseConfig();
}

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(requestId);
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(generalRateLimit);
app.use(express.json({ limit: env.jsonLimit }));

app.get("/", (req, res) => {
  res.send("ShobdoLab Backend Running");
});

app.use("/", healthRoutes);
app.use("/v1/auth", authRateLimit, authRoutes);
app.use("/v1/achievements", achievementRoutes);
app.use("/v1/home", homeRoutes);
app.use("/v1/learn", learnRoutes);
app.use("/v1/quiz", quizRoutes);
app.use("/v1/revise", reviseRoutes);
app.use("/v1/exercise", exerciseRoutes);
app.use("/v1/words", wordRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => console.log(`Server running on port ${env.port}`));
