import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import exerciseRoutes from "./routes/exerciseRoutes.js";
import homeRoutes from "./routes/homeRoutes.js";
import learnRoutes from "./routes/learnRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import reviseRoutes from "./routes/reviseRoutes.js";
import wordRoutes from "./routes/wordRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("ShobdoLab Backend Running");
});

app.use("/v1/auth", authRoutes);
app.use("/v1/home", homeRoutes);
app.use("/v1/learn", learnRoutes);
app.use("/v1/quiz", quizRoutes);
app.use("/v1/revise", reviseRoutes);
app.use("/v1/exercise", exerciseRoutes);
app.use("/v1/words", wordRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
