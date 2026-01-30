import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { BotManager } from "./bot-manager.js";
import { loadConfig } from "./config.js";
import {
  createSession,
  validateSession,
  validateLogin,
  destroySession,
  cleanupExpiredSessions,
} from "./session.js";
import type { BotMessage, UserChatRequest, LoginRequest } from "./types.js";

const config = loadConfig();

const app = express();
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const server = createServer(app);
const botManager = new BotManager({
  pingInterval: config.pingInterval,
  botTimeout: config.botTimeout,
});

// Session cleanup
setInterval(() => {
  const cleaned = cleanupExpiredSessions();
  if (cleaned > 0) {
    console.log(`[Nexus] Cleaned ${cleaned} expired sessions`);
  }
}, 10 * 60 * 1000);

// WebSocket for bots
const wss = new WebSocketServer({ server, path: "/bot-ws" });

wss.on("connection", (ws: WebSocket) => {
  console.log("[Nexus] Bot connected");

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString()) as BotMessage;

      if (msg.type === "register") {
        const success = botManager.register(ws, msg.botId, msg.botName, msg.token);
        ws.send(JSON.stringify({ type: "registered", success }));
        console.log(`[Nexus] Bot registered: ${msg.botId}`);
        return;
      }

      const botId = botManager.findByWs(ws);
      if (!botId) {
        ws.send(JSON.stringify({ type: "error", message: "Not registered" }));
        return;
      }

      if (msg.type === "pong") {
        botManager.handlePong(botId);
        return;
      }

      if (msg.type === "reply") {
        botManager.handleReply(botId, msg);
        return;
      }
    } catch (err) {
      console.error("[Nexus] Error:", err);
    }
  });

  ws.on("close", () => {
    const botId = botManager.findByWs(ws);
    if (botId) {
      botManager.unregister(botId);
      console.log(`[Nexus] Bot disconnected: ${botId}`);
    }
  });

  ws.on("error", (err) => {
    console.error("[Nexus] WebSocket error:", err);
  });
});

// Auth middleware
function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未登录" });
  }

  const session = validateSession(header.slice(7));
  if (!session) {
    return res.status(401).json({ error: "会话已过期" });
  }

  (req as any).user = session.user;
  (req as any).session = session;
  next();
}

// === Auth API ===

app.post("/api/login", (req, res) => {
  const { username, password } = req.body as LoginRequest;

  if (!username || !password) {
    return res.status(400).json({ error: "用户名和密码不能为空" });
  }

  if (!validateLogin(config, username, password)) {
    return res.status(401).json({ error: "用户名或密码错误" });
  }

  const session = createSession(config, username);
  if (!session) {
    return res.status(500).json({ error: "创建会话失败" });
  }

  console.log(`[Nexus] Login: ${username}`);
  res.json({
    token: session.token,
    user: session.user,
    expiresAt: session.expiresAt,
  });
});

app.post("/api/logout", auth, (req, res) => {
  destroySession((req as any).session.token);
  res.json({ success: true });
});

app.get("/api/me", auth, (req, res) => {
  const session = (req as any).session;
  res.json({ user: session.user, expiresAt: session.expiresAt });
});

// === Chat API ===

app.get("/api/bots", auth, (req, res) => {
  const bots = botManager.listBots().map((b) => ({
    id: b.id,
    name: b.name,
    connectedAt: b.connectedAt,
  }));
  res.json({ bots });
});

app.post("/api/chat", auth, async (req, res) => {
  const { message, target } = req.body as UserChatRequest;
  const user = (req as any).user;

  if (!message) {
    return res.status(400).json({ error: "消息不能为空" });
  }

  let botId = target;
  let text = message;

  if (!botId) {
    const match = message.match(/^@(\S+)\s+/);
    if (match) {
      botId = match[1];
      text = message.slice(match[0].length);
    } else {
      botId = botManager.getFirstAvailable();
    }
  }

  if (!botId) {
    return res.status(503).json({ error: "没有可用的机器人" });
  }

  try {
    const content = await botManager.sendToBot(botId, text, user.displayName || user.username);
    res.json({ botId, content, timestamp: Date.now() });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Health check
app.get("/health", (req, res) => {
  const bots = botManager.listBots();
  res.json({
    status: "ok",
    bots: bots.length,
    botIds: bots.map((b) => b.id),
  });
});

// Start
botManager.start();
server.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║             🌐 Nexus Gateway              ║
╠═══════════════════════════════════════════╣
║  Port: ${String(config.port).padEnd(35)}║
║  Bot WS: /bot-ws                          ║
║  API: /api                                ║
╚═══════════════════════════════════════════╝
  `);
});

process.on("SIGTERM", () => {
  console.log("[Nexus] Shutting down...");
  botManager.stop();
  server.close();
  process.exit(0);
});
