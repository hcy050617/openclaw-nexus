import { WebSocket } from "ws";
import type { BotInfo, BotMessage, MessageToBot, MessageFromBot } from "./types.js";

type PendingRequest = {
  resolve: (content: string) => void;
  reject: (error: Error) => void;
  chunks: string[];
  onChunk?: (chunk: string, done: boolean) => void;
};

export class BotManager {
  private bots = new Map<string, { info: BotInfo; ws: WebSocket }>();
  private pendingRequests = new Map<string, PendingRequest>();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(
    private config: { pingInterval: number; botTimeout: number; botToken: string }
  ) {}

  start() {
    // Ping all bots periodically
    this.pingInterval = setInterval(() => {
      this.pingAll();
      this.cleanupStale();
    }, this.config.pingInterval);
  }

  stop() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  register(ws: WebSocket, botId: string, botName: string, token: string): { success: boolean; error?: string } {
    // Token validation
    if (this.config.botToken && token !== this.config.botToken) {
      console.log(`[BotManager] Bot ${botId} rejected: invalid token`);
      return { success: false, error: "Invalid token" };
    }

    const existing = this.bots.get(botId);
    if (existing) {
      // Disconnect old connection
      existing.ws.close();
    }

    const info: BotInfo = {
      id: botId,
      name: botName,
      token,
      connectedAt: new Date(),
      lastPingAt: new Date(),
    };

    this.bots.set(botId, { info, ws });
    console.log(`[BotManager] Bot registered: ${botId} (${botName})`);
    return { success: true };
  }

  unregister(botId: string) {
    this.bots.delete(botId);
    console.log(`[BotManager] Bot unregistered: ${botId}`);
  }

  findByWs(ws: WebSocket): string | undefined {
    for (const [id, bot] of this.bots) {
      if (bot.ws === ws) return id;
    }
    return undefined;
  }

  handlePong(botId: string) {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.info.lastPingAt = new Date();
    }
  }

  handleReply(botId: string, msg: MessageFromBot) {
    const pending = this.pendingRequests.get(msg.replyTo);
    if (!pending) {
      console.warn(`[BotManager] No pending request for reply ${msg.replyTo}`);
      return;
    }

    pending.chunks.push(msg.content);
    pending.onChunk?.(msg.content, msg.done);

    if (msg.done) {
      pending.resolve(pending.chunks.join(""));
      this.pendingRequests.delete(msg.replyTo);
    }
  }

  async sendToBot(
    botId: string,
    content: string,
    from: string,
    onChunk?: (chunk: string, done: boolean) => void,
    image?: string
  ): Promise<string> {
    const bot = this.bots.get(botId);
    if (!bot) {
      throw new Error(`Bot not found: ${botId}`);
    }

    const msgId = crypto.randomUUID();
    const msg: MessageToBot = {
      type: "chat",
      id: msgId,
      content,
      from,
      timestamp: Date.now(),
    };

    if (image) {
      msg.image = image;
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(msgId, { resolve, reject, chunks: [], onChunk });

      try {
        bot.ws.send(JSON.stringify(msg));
      } catch (err) {
        this.pendingRequests.delete(msgId);
        reject(err);
      }

      // Timeout after 5 minutes
      setTimeout(() => {
        if (this.pendingRequests.has(msgId)) {
          this.pendingRequests.delete(msgId);
          reject(new Error("Request timeout"));
        }
      }, 5 * 60 * 1000);
    });
  }

  listBots(): BotInfo[] {
    return Array.from(this.bots.values()).map((b) => b.info);
  }

  getBot(botId: string): BotInfo | undefined {
    return this.bots.get(botId)?.info;
  }

  getFirstAvailable(): string | undefined {
    const first = this.bots.keys().next();
    return first.done ? undefined : first.value;
  }

  private pingAll() {
    for (const [id, bot] of this.bots) {
      try {
        bot.ws.send(JSON.stringify({ type: "ping" }));
      } catch {
        console.warn(`[BotManager] Failed to ping bot ${id}`);
      }
    }
  }

  private cleanupStale() {
    const now = Date.now();
    for (const [id, bot] of this.bots) {
      const elapsed = now - bot.info.lastPingAt.getTime();
      if (elapsed > this.config.botTimeout) {
        console.log(`[BotManager] Bot ${id} timed out, removing`);
        bot.ws.close();
        this.bots.delete(id);
      }
    }
  }
}
