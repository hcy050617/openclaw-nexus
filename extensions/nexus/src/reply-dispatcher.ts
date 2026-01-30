import WebSocket from "ws";
import crypto from "crypto";
import type { ClawdbotConfig, RuntimeEnv, ReplyDispatcher, ReplyDispatcherOptions } from "clawdbot/plugin-sdk";
import type { GatewayOutboundMessage } from "./types.js";

function generateId(): string {
  return crypto.randomUUID();
}

export function createGatewayReplyDispatcher(params: {
  cfg: ClawdbotConfig;
  agentId: string;
  runtime: RuntimeEnv;
  conversationId: string;
  replyToMessageId: string;  // required - the original message id from gateway
  ws: WebSocket;
}): {
  dispatcher: ReplyDispatcher;
  replyOptions: ReplyDispatcherOptions;
  markDispatchIdle: () => void;
} {
  const { conversationId, replyToMessageId, ws, runtime } = params;
  const log = runtime?.log ?? console.log;

  let isIdle = false;
  let idleResolvers: (() => void)[] = [];

  const dispatcher: ReplyDispatcher = {
    async sendText({ text }) {
      const messageId = generateId();
      const outbound: GatewayOutboundMessage = {
        type: "reply",
        id: messageId,
        replyTo: replyToMessageId,
        content: text,
        done: true,  // For now, each sendText is a complete message
        timestamp: Date.now(),
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(outbound));
        log(`gateway: sent reply to ${replyToMessageId} (msg=${messageId})`);
      } else {
        log(`gateway: WebSocket not open, cannot send reply`);
      }

      return {
        channel: "gateway",
        messageId,
        chatId: conversationId,
      };
    },

    async sendMedia({ text, mediaUrl }) {
      // For now, just send text with media URL
      const content = mediaUrl ? `${text ?? ""}\n\n📎 ${mediaUrl}`.trim() : (text ?? "");
      const messageId = generateId();
      const outbound: GatewayOutboundMessage = {
        type: "reply",
        id: messageId,
        replyTo: replyToMessageId,
        content,
        done: true,
        timestamp: Date.now(),
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(outbound));
        log(`gateway: sent media reply to ${replyToMessageId}`);
      } else {
        log(`gateway: WebSocket not open, cannot send media reply`);
      }

      return {
        channel: "gateway",
        messageId,
        chatId: conversationId,
      };
    },

    async waitForIdle() {
      if (isIdle) return;
      return new Promise<void>((resolve) => {
        idleResolvers.push(resolve);
      });
    },

    async sendBlockReply({ text }) {
      // Same as sendText for block replies
      return this.sendText({ text });
    },
  };

  const replyOptions: ReplyDispatcherOptions = {
    streamingEnabled: false,
    typingIndicator: false,
  };

  const markDispatchIdle = () => {
    isIdle = true;
    for (const resolve of idleResolvers) {
      resolve();
    }
    idleResolvers = [];
  };

  return { dispatcher, replyOptions, markDispatchIdle };
}
