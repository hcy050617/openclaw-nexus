import WebSocket from "ws";
import type { ClawdbotConfig, RuntimeEnv, HistoryEntry } from "clawdbot/plugin-sdk";
import type { GatewayConfig, GatewayInboundMessage, GatewayBotRegister, GatewayWsMessage } from "./types.js";
import { resolveGatewayCredentials } from "./accounts.js";
import { handleGatewayMessage } from "./bot.js";

export type MonitorGatewayOpts = {
  config?: ClawdbotConfig;
  runtime?: RuntimeEnv;
  abortSignal?: AbortSignal;
  accountId?: string;
};

let currentWsClient: WebSocket | null = null;

export async function monitorGatewayProvider(opts: MonitorGatewayOpts = {}): Promise<void> {
  const cfg = opts.config;
  if (!cfg) {
    throw new Error("Config is required for Gateway monitor");
  }

  const gatewayCfg = cfg.channels?.nexus as GatewayConfig | undefined;
  const creds = resolveGatewayCredentials(gatewayCfg);
  if (!creds) {
    throw new Error("Gateway credentials not configured (serverUrl, botId required)");
  }

  const log = opts.runtime?.log ?? console.log;
  const error = opts.runtime?.error ?? console.error;

  const reconnectInterval = gatewayCfg?.reconnectInterval ?? 5000;
  const chatHistories = new Map<string, HistoryEntry[]>();

  return new Promise((resolve, reject) => {
    let stopped = false;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const cleanup = () => {
      stopped = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (currentWsClient) {
        currentWsClient.close();
        currentWsClient = null;
      }
    };

    const handleAbort = () => {
      log("nexus: abort signal received, stopping WebSocket client");
      cleanup();
      resolve();
    };

    if (opts.abortSignal?.aborted) {
      cleanup();
      resolve();
      return;
    }

    opts.abortSignal?.addEventListener("abort", handleAbort, { once: true });

    const connect = () => {
      if (stopped) return;

      log(`nexus: connecting to ${creds.serverUrl}...`);

      const ws = new WebSocket(creds.serverUrl);
      currentWsClient = ws;

      ws.on("open", () => {
        log("nexus: WebSocket connected");

        // Register bot with server
        const registerMsg: GatewayBotRegister = {
          type: "register",
          botId: creds.botId,
          botName: gatewayCfg?.botName ?? creds.botId,
          token: creds.token ?? "",
        };
        ws.send(JSON.stringify(registerMsg));
        log(`nexus: registered as bot ${creds.botId}`);
      });

      ws.on("message", async (data) => {
        try {
          const raw = data.toString();
          const msg = JSON.parse(raw) as GatewayWsMessage;

          if (msg.type === "chat") {
            // Gateway server sends "chat" type messages
            const inbound = msg as GatewayInboundMessage;
            await handleGatewayMessage({
              cfg,
              event: inbound,
              runtime: opts.runtime,
              chatHistories,
              ws,
            });
          } else if (msg.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          } else if (msg.type === "registered") {
            log(`nexus: server confirmed registration`);
          } else {
            log(`nexus: received unknown message type: ${msg.type}`);
          }
        } catch (err) {
          error(`nexus: error handling message: ${String(err)}`);
        }
      });

      ws.on("error", (err) => {
        error(`nexus: WebSocket error: ${String(err)}`);
      });

      ws.on("close", (code, reason) => {
        log(`nexus: WebSocket closed (code=${code}, reason=${reason.toString()})`);
        currentWsClient = null;

        if (!stopped) {
          log(`nexus: reconnecting in ${reconnectInterval}ms...`);
          reconnectTimer = setTimeout(connect, reconnectInterval);
        }
      });
    };

    try {
      connect();
    } catch (err) {
      cleanup();
      opts.abortSignal?.removeEventListener("abort", handleAbort);
      reject(err);
    }
  });
}

export function stopGatewayMonitor(): void {
  if (currentWsClient) {
    currentWsClient.close();
    currentWsClient = null;
  }
}

export function getGatewayWsClient(): WebSocket | null {
  return currentWsClient;
}
