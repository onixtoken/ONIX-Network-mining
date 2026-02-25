import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ================= DATABASE =================

const db = new Database("database.db");

db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT,
  balance INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`).run();

// ================= JWT MIDDLEWARE =================

function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(
    token,
    process.env.JWT_SECRET || "onixsecret",
    (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    }
  );
}

// ================= REGISTER =================

app.post("/api/auth/register", async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)"
    );

    stmt.run(username, email, hashedPassword);

    res.json({ success: true, message: "User registered successfully" });
  } catch (err: any) {
    res.status(400).json({ error: "User already exists" });
  }
});

// ================= LOGIN =================

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const validPassword = await bcrypt.compare(password, user.password);

  if (!validPassword) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || "onixsecret",
    { expiresIn: "7d" }
  );

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      balance: user.balance
    }
  });
});

// ================= GET PROFILE =================

app.get("/api/user/profile", authenticateToken, (req: any, res) => {
  const user = db
    .prepare("SELECT id, username, email, balance FROM users WHERE id = ?")
    .get(req.user.id);

  res.json(user);
});

// ================= MINING =================

app.post("/api/mining/start", authenticateToken, (req: any, res) => {
  const reward = 10; // mining reward

  db.prepare(
    "UPDATE users SET balance = balance + ? WHERE id = ?"
  ).run(reward, req.user.id);

  res.json({ success: true, reward });
});

// ================= TEST =================

app.get("/api/test", (req, res) => {
  res.json({ status: "ONIX Professional Backend Running 🚀" });
});

// ================= SERVE FRONTEND =================

app.use(express.static(path.join(__dirname, "dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ================= START SERVER =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 ONIX Server running on port ${PORT}`);
});
