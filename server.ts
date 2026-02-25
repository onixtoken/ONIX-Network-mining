import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("onix.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    google_id TEXT UNIQUE,
    username TEXT,
    balance REAL DEFAULT 0,
    energy REAL DEFAULT 21600, -- 6 hours in seconds
    last_energy_update INTEGER,
    level INTEGER DEFAULT 1,
    hashrate_multiplier REAL DEFAULT 1,
    referral_code TEXT UNIQUE,
    referred_by INTEGER,
    is_mining INTEGER DEFAULT 0,
    last_mining_start INTEGER,
    total_mined REAL DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    created_at INTEGER
  );

  -- Add password column if it doesn't exist (for existing databases)
  PRAGMA table_info(users);
`);

// Check if columns exist, if not add them
const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
const hasPassword = tableInfo.some(col => col.name === 'password');
if (!hasPassword) {
  db.exec("ALTER TABLE users ADD COLUMN password TEXT");
}
const hasWallet = tableInfo.some(col => col.name === 'wallet_address');
if (!hasWallet) {
  db.exec("ALTER TABLE users ADD COLUMN wallet_address TEXT");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER,
    referred_id INTEGER,
    earnings REAL DEFAULT 0,
    FOREIGN KEY(referrer_id) REFERENCES users(id),
    FOREIGN KEY(referred_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS global_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS usdt_upgrades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    tx_id TEXT,
    amount REAL,
    status TEXT DEFAULT 'pending',
    created_at INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  INSERT OR IGNORE INTO global_settings (key, value) VALUES ('base_mining_rate', '0.0001');
  INSERT OR IGNORE INTO global_settings (key, value) VALUES ('daily_emission_cap', '10000');
  INSERT OR IGNORE INTO global_settings (key, value) VALUES ('current_block', '104280');
  INSERT OR IGNORE INTO global_settings (key, value) VALUES ('total_burned', '0');
  
  -- Force update for existing databases to match the new calculation
  UPDATE global_settings SET value = '0.0001' WHERE key = 'base_mining_rate';
  UPDATE global_settings SET value = '10000' WHERE key = 'daily_emission_cap';
`);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const JWT_SECRET = process.env.JWT_SECRET || "onix-secret-key";
if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET environment variable is not set. Using default insecure secret.");
}

// --- Auth Middleware ---
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- Auth Routes ---
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email: rawEmail, password, username, isRegister } = req.body;
    console.log(`Login attempt: email=${rawEmail}, isRegister=${isRegister}`);

    if (!rawEmail || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const email = rawEmail.toLowerCase().trim();

    if (isRegister) {
      console.log("Processing registration...");
      if (!username || username.length < 3) {
        return res.status(400).json({ error: "Username must be at least 3 characters" });
      }

      const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as any;
      const isAdmin = userCount.count === 0 ? 1 : 0;

      const result = db.prepare(`
        INSERT INTO users (email, password, username, referral_code, created_at, last_energy_update, is_admin)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(email, hashedPassword, username, referralCode, Date.now(), Date.now(), isAdmin);

      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(result.lastInsertRowid) as any;
      const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.is_admin }, JWT_SECRET, { expiresIn: "7d" });
      console.log("Registration successful for:", email);
      return res.json({ 
  token, 
  user: {
    id: user.id,
    username: user.username,
    email: user.email,
    balance: user.balance,
    energy: user.energy
  }
});
    } else {
      console.log("Processing login...");
      const user = db.prepare("SELECT * FROM users WHERE email = ? OR username = ?").get(email, rawEmail) as any;
      if (!user) {
        console.log("User not found:", email);
        return res.status(400).json({ error: "Invalid email/username or password" });
      }

      // Auto-promote first user to admin if no admins exist
      const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_admin = 1").get() as any;
      if (adminCount.count === 0) {
        console.log("No admins found. Promoting user:", user.username);
        db.prepare("UPDATE users SET is_admin = 1 WHERE id = ?").run(user.id);
        user.is_admin = 1;
      }

      if (!user.password) {
        console.log("User has no password (external auth?):", email);
        return res.status(400).json({ error: "This account was created without a password. Please use the original login method." });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        console.log("Invalid password for:", email);
        return res.status(400).json({ error: "Invalid email/username or password" });
      }

      const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.is_admin }, JWT_SECRET, { expiresIn: "7d" });
      console.log("Login successful for:", email);
     return res.json({ 
  token, 
  user: {
    id: user.id,
    username: user.username,
    email: user.email,
    balance: user.balance,
    energy: user.energy
  }
});
    }
  } catch (err: any) {
    console.error("Auth error details:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// --- User Routes ---
app.get("/api/user/me", authenticate, (req: any, res) => {
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err: any) {
    console.error("Get user error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/user/wallet", authenticate, (req: any, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: "Invalid BNB wallet address" });
    }

    db.prepare("UPDATE users SET wallet_address = ? WHERE id = ?").run(walletAddress, req.user.id);
    res.json({ success: true, walletAddress });
  } catch (err: any) {
    console.error("Update wallet error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/mining/start", authenticate, (req: any, res) => {
  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id) as any;
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.energy <= 0) return res.status(400).json({ error: "No energy" });
    
    db.prepare("UPDATE users SET is_mining = 1, last_mining_start = ?, last_energy_update = ? WHERE id = ?")
      .run(Date.now(), Date.now(), req.user.id);
    
    res.json({ success: true });
  } catch (err: any) {
    console.error("Start mining error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/mining/stop", authenticate, (req: any, res) => {
  try {
    db.prepare("UPDATE users SET is_mining = 0 WHERE id = ?").run(req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    console.error("Stop mining error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Mining Logic & WebSocket ---
const clients = new Map<number, WebSocket>();

wss.on("connection", (ws, req) => {
  let userId: number | null = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());
    if (data.type === "auth") {
      try {
        const decoded = jwt.verify(data.token, JWT_SECRET) as any;
        userId = decoded.id;
        clients.set(userId!, ws);
      } catch (e) {}
    }
  });

  ws.on("close", () => {
    if (userId) clients.delete(userId);
  });
});

// Background task for mining and energy
setInterval(() => {
  const now = Date.now();
  const baseMiningRate = parseFloat(db.prepare("SELECT value FROM global_settings WHERE key = 'base_mining_rate'").get().value);
  
  const activeMiners = db.prepare("SELECT * FROM users WHERE is_mining = 1").all() as any[];
  
  activeMiners.forEach(user => {
    const elapsedSeconds = (now - user.last_energy_update) / 1000;
    if (elapsedSeconds < 1) return;

    let energyConsumed = elapsedSeconds;
    let newEnergy = Math.max(0, user.energy - energyConsumed);
    let isMining = newEnergy > 0 ? 1 : 0;

    const reward = baseMiningRate * user.hashrate_multiplier * user.level * elapsedSeconds;
    const burnAmount = reward * 0.02; // 2% burn rate
    const userReward = reward - burnAmount;
    
    db.prepare(`
      UPDATE users 
      SET balance = balance + ?, 
          total_mined = total_mined + ?, 
          energy = ?, 
          is_mining = ?, 
          last_energy_update = ? 
      WHERE id = ?
    `).run(userReward, reward, newEnergy, isMining, now, user.id);

    // Update global burn total
    db.prepare("UPDATE global_settings SET value = CAST(CAST(value AS REAL) + ? AS TEXT) WHERE key = 'total_burned'").run(burnAmount);

    // Referral commission (7%)
    if (user.referred_by) {
      const commission = reward * 0.07;
      db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(commission, user.referred_by);
      db.prepare("UPDATE referrals SET earnings = earnings + ? WHERE referrer_id = ? AND referred_id = ?")
        .run(commission, user.referred_by, user.id);
    }

    // Notify client
    const ws = clients.get(user.id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "update",
        balance: user.balance + reward,
        energy: newEnergy,
        isMining
      }));
    }
  });

  // Energy refill for non-mining users
  const idleUsers = db.prepare("SELECT * FROM users WHERE is_mining = 0 AND energy < 21600").all() as any[];
  idleUsers.forEach(user => {
    const elapsedSeconds = (now - user.last_energy_update) / 1000;
    if (elapsedSeconds < 1) return;

    const refillRate = 1; // 1 energy per second
    const newEnergy = Math.min(21600, user.energy + (elapsedSeconds * refillRate));
    
    db.prepare("UPDATE users SET energy = ?, last_energy_update = ? WHERE id = ?")
      .run(newEnergy, now, user.id);

    const ws = clients.get(user.id);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "update", energy: newEnergy }));
    }
  });

  // Broadcast global stats
  const totalMinersOnline = activeMiners.length;
  const totalMined = db.prepare("SELECT SUM(total_mined) as total FROM users").get().total || 0;
  
  // Increment block height every 10 seconds (approx)
  if (now % 10000 < 1000) {
    db.prepare("UPDATE global_settings SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'current_block'").run();
  }
  
  const currentBlock = parseInt(db.prepare("SELECT value FROM global_settings WHERE key = 'current_block'").get().value);
  const totalBurned = parseFloat(db.prepare("SELECT value FROM global_settings WHERE key = 'total_burned'").get().value);

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: "global_stats",
        online: totalMinersOnline,
        totalMined,
        currentBlock,
        totalBurned
      }));
    }
  });
}, 1000);

// --- Admin Routes ---
app.get("/api/admin/users", authenticate, (req: any, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: "Forbidden" });
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  } catch (err: any) {
    console.error("Admin users error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- Upgrade Routes ---
app.post("/api/upgrade/onix", authenticate, (req: any, res) => {
  const { multiplier } = req.body;
  const userId = req.user.id;
  
  // Simple pricing: 100 ONIX per 0.1x increase
  const cost = (multiplier - 1) * 1000; // e.g. 1.1x cost 100 ONIX, 1.2x cost 200 ONIX relative to 1.0
  // Actually let's do a fixed cost for next level
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
  const nextMultiplier = user.hashrate_multiplier + 0.1;
  const upgradeCost = Math.floor(nextMultiplier * 50); // Simple cost formula

  if (user.balance < upgradeCost) {
    return res.status(400).json({ error: "Insufficient ONIX balance" });
  }

  db.prepare("UPDATE users SET balance = balance - ?, hashrate_multiplier = ? WHERE id = ?")
    .run(upgradeCost, nextMultiplier, userId);

  res.json({ success: true, newMultiplier: nextMultiplier, newBalance: user.balance - upgradeCost });
});

app.post("/api/upgrade/usdt", authenticate, (req: any, res) => {
  const { txId, amount } = req.body;
  const userId = req.user.id;

  if (!txId || !amount) {
    return res.status(400).json({ error: "Transaction ID and amount are required" });
  }

  db.prepare("INSERT INTO usdt_upgrades (user_id, tx_id, amount, created_at) VALUES (?, ?, ?, ?)")
    .run(userId, txId, amount, Date.now());

  res.json({ success: true, message: "Upgrade request submitted for verification" });
});

app.get("/api/admin/usdt-upgrades", authenticate, (req: any, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: "Forbidden" });
  const upgrades = db.prepare(`
    SELECT u.username, u.email, uu.* 
    FROM usdt_upgrades uu 
    JOIN users u ON uu.user_id = u.id 
    ORDER BY uu.created_at DESC
  `).all();
  res.json(upgrades);
});

app.post("/api/admin/usdt-upgrades/approve", authenticate, (req: any, res) => {
  if (!req.user.isAdmin) return res.status(403).json({ error: "Forbidden" });
  const { upgradeId, multiplierBoost } = req.body;

  const upgrade = db.prepare("SELECT * FROM usdt_upgrades WHERE id = ?").get(upgradeId) as any;
  if (!upgrade) return res.status(404).json({ error: "Upgrade not found" });

  db.transaction(() => {
    db.prepare("UPDATE usdt_upgrades SET status = 'approved' WHERE id = ?").run(upgradeId);
    db.prepare("UPDATE users SET hashrate_multiplier = hashrate_multiplier + ? WHERE id = ?")
      .run(multiplierBoost || 0.5, upgrade.user_id);
  })();

  res.json({ success: true });
});

// --- Vite Middleware ---
if (process.env.NODE_ENV !== "production") {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
}

server.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});
