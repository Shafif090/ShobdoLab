import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("ShobdoLab Backend Running");
});

app.get("/dbtest", async (req, res) => {
  const { data, error } = await supabase.from("Word").select("*");

  if (error) {
    return res.status(500).json({ error });
  }

  res.json(data);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
