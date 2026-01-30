import WebSocket from "ws";
import crypto from "crypto";
import type { GatewayOutboundMessage } from "./types.js";

type ReplyDispatcherOptions = {
  streamingEnabled: boolean;
  typingIndicator: boolean;
};

function generateId(): string {
  return crypto.randomUUID();
}

export function createGatewayReplyDispatcher(params: {
  cfg: any;
  agentId: string;
  runtime: any;
  conversationId: string;
  replyToMessageId: string;
  ws: WebSocket;
}): {
  dispatcher: any;
  replyOptions: ReplyDispatcherOptions;
  markDispatchIdle: () => void;
} {
  const { conversationId, replyToMessageId, ws, runtime } = params;
  const log = runtime?.log ?? console.log;

  let isIdle = false;
  let idleResolvers: (() => void)[] = [];
  let streamMessageId: string | null = null;

  const dispatcher = {
    async sendText({ text }: { text: string }) {
      // Use existing stream message id or generate new one
      const messageId = streamMessageId ?? generateId();
      if (!streamMessageId) {
        streamMessageId = messageId;
      }

      const outbound: GatewayOutboundMessage = {
        type: "reply",
        id: messageId,
        replyTo: replyToMessageId,
        content: text,
        done: false,  // Streaming chunk, not final
        timestamp: Date.now(),
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(outbound));
        log(`gateway: sent stream chunk to ${replyToMessageId} (msg=${messageId})`);
      } else {
        log(`gateway: WebSocket not open, cannot send reply`);
      }

      return {
        channel: "gateway",
        messageId,
        chatId: conversationId,
      };
    },

    async sendMedia({ text, mediaUrl }: { text?: string; mediaUrl?: string }) {
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

    async sendBlockReply({ text }: { text: string }) {
      // Block reply is the final message, mark as done
      const messageId = streamMessageId ?? generateId();
      const outbound: GatewayOutboundMessage = {
        type: "reply",
        id: messageId,
        replyTo: replyToMessageId,
        content: text,
        done: true,  // Final message
        timestamp: Date.now(),
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(outbound));
        log(`gateway: sent final reply to ${replyToMessageId} (msg=${messageId})`);
      } else {
        log(`gateway: WebSocket not open, cannot send block reply`);
      }

      // Reset stream message id for next conversation
      streamMessageId = null;

      return {
        channel: "gateway",
        messageId,
        chatId: conversationId,
      };
    },

    async sendFinalReply({ text }: { text: string }) {
      // Alias for sendBlockReply - OpenClaw uses this name
      const messageId = streamMessageId ?? generateId();
      const outbound: GatewayOutboundMessage = {
        type: "reply",
        id: messageId,
        replyTo: replyToMessageId,
        content: text,
        done: true,
        timestamp: Date.now(),
      };

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(outbound));
        log(`gateway: sent final reply to ${replyToMessageId} (msg=${messageId})`);
      } else {
        log(`gateway: WebSocket not open, cannot send final reply`);
      }

      streamMessageId = null;

      return {
        channel: "gateway",
        messageId,
        chatId: conversationId,
      };
    },
  };

  const replyOptions: ReplyDispatcherOptions = {
    streamingEnabled: true,
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
