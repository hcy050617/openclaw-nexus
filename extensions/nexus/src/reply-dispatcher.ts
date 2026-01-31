import WebSocket from "ws";
import crypto from "crypto";
import fs from "fs";
import type { GatewayOutboundMessage } from "./types.js";
import { fileToBase64, detectMimeFromBuffer } from "./media.js";

type ReplyDispatcherOptions = {
  streamingEnabled: boolean;
  typingIndicator: boolean;
};

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * 检查是否是本地文件路径
 */
function isLocalPath(urlOrPath: string): boolean {
  if (urlOrPath.startsWith("/") || urlOrPath.startsWith("~") || /^[a-zA-Z]:/.test(urlOrPath)) {
    return true;
  }
  try {
    const url = new URL(urlOrPath);
    return url.protocol === "file:";
  } catch {
    return true;
  }
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
      const messageId = generateId();
      let imageData: string | undefined;

      // 尝试将媒体转换为 base64
      if (mediaUrl) {
        try {
          if (isLocalPath(mediaUrl)) {
            const filePath = mediaUrl.startsWith("~")
              ? mediaUrl.replace("~", process.env.HOME ?? "")
              : mediaUrl.replace("file://", "");

            if (fs.existsSync(filePath)) {
              imageData = await fileToBase64(filePath) ?? undefined;
            }
          } else {
            // 远程 URL - 下载后转换
            const response = await fetch(mediaUrl);
            if (response.ok) {
              const buffer = Buffer.from(await response.arrayBuffer());
              const mimeType = detectMimeFromBuffer(buffer) || response.headers.get("content-type") || "application/octet-stream";
              imageData = `data:${mimeType};base64,${buffer.toString("base64")}`;
            }
          }
        } catch (err) {
          log(`gateway: failed to convert media to base64: ${String(err)}`);
        }
      }

      // 构建消息
      const outbound: any = {
        type: "reply",
        id: messageId,
        replyTo: replyToMessageId,
        content: text ?? "",
        done: true,
        timestamp: Date.now(),
      };

      // 如果成功转换为 base64，添加图片数据
      if (imageData) {
        outbound.image = imageData;
      } else if (mediaUrl) {
        // 回退：将 URL 添加到文本中
        outbound.content = `${text ?? ""}\n\n📎 ${mediaUrl}`.trim();
      }

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
