import WebSocket from "ws";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { OpenclawConfig } from "openclaw/plugin-sdk";
import type { GatewayConfig, GatewaySendResult, GatewayOutboundMessage } from "./types.js";
import { getGatewayWsClient } from "./monitor.js";
import { fileToBase64, detectMimeFromBuffer } from "./media.js";

function generateId(): string {
  return crypto.randomUUID();
}

export type SendGatewayMessageParams = {
  cfg: OpenclawConfig;
  to: string;
  text: string;
  replyToMessageId?: string;
  image?: string;  // base64 图片数据
};

export async function sendMessageGateway(params: SendGatewayMessageParams): Promise<GatewaySendResult> {
  const { to, text, replyToMessageId } = params;

  const ws = getGatewayWsClient();
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error("Gateway WebSocket not connected");
  }

  const messageId = generateId();
  const conversationId = normalizeGatewayTarget(to);

  // Note: This is for outbound-initiated messages (not replies to inbound)
  // The gateway server expects a "reply" format, so we use a placeholder replyTo
  const outbound: GatewayOutboundMessage = {
    type: "reply",
    id: messageId,
    replyTo: replyToMessageId ?? `outbound-${messageId}`, // use provided or generate placeholder
    content: text,
    done: true,
    timestamp: Date.now(),
  };

  ws.send(JSON.stringify(outbound));

  return {
    messageId,
    conversationId,
  };
}

export function normalizeGatewayTarget(target: string): string {
  // Remove prefixes like "user:", "conv:", "gateway:"
  return target
    .replace(/^(user|conv|gateway|group):/i, "")
    .trim();
}

export function looksLikeGatewayId(id: string): boolean {
  // Accept any non-empty string as a valid ID
  return Boolean(id && id.trim().length > 0);
}

export function formatGatewayTarget(target: string): string {
  const normalized = normalizeGatewayTarget(target);
  return `conv:${normalized}`;
}

/**
 * 检查是否是本地文件路径
 */
function isLocalPath(urlOrPath: string): boolean {
  // 以 / 或 ~ 或盘符开头
  if (urlOrPath.startsWith("/") || urlOrPath.startsWith("~") || /^[a-zA-Z]:/.test(urlOrPath)) {
    return true;
  }
  // 尝试解析为 URL
  try {
    const url = new URL(urlOrPath);
    return url.protocol === "file:";
  } catch {
    return true; // 不是有效 URL，当作本地路径
  }
}

export type SendMediaGatewayParams = {
  cfg: OpenclawConfig;
  to: string;
  mediaUrl?: string;
  mediaBuffer?: Buffer;
  fileName?: string;
  replyToMessageId?: string;
};

/**
 * 发送媒体消息（图片/文件）
 * 将媒体转换为 base64 后通过 WebSocket 发送
 */
export async function sendMediaGateway(params: SendMediaGatewayParams): Promise<GatewaySendResult> {
  const { cfg, to, mediaUrl, mediaBuffer, fileName, replyToMessageId } = params;

  const ws = getGatewayWsClient();
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error("Gateway WebSocket not connected");
  }

  let base64Data: string | null = null;

  if (mediaBuffer) {
    // 直接使用 buffer
    const mimeType = detectMimeFromBuffer(mediaBuffer) || "application/octet-stream";
    base64Data = `data:${mimeType};base64,${mediaBuffer.toString("base64")}`;
  } else if (mediaUrl) {
    if (isLocalPath(mediaUrl)) {
      // 本地文件
      const filePath = mediaUrl.startsWith("~")
        ? mediaUrl.replace("~", process.env.HOME ?? "")
        : mediaUrl.replace("file://", "");

      if (!fs.existsSync(filePath)) {
        throw new Error(`Local file not found: ${filePath}`);
      }

      base64Data = await fileToBase64(filePath);
    } else {
      // 远程 URL - 下载后转换
      try {
        const response = await fetch(mediaUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch media: ${response.status}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const mimeType = detectMimeFromBuffer(buffer) || response.headers.get("content-type") || "application/octet-stream";
        base64Data = `data:${mimeType};base64,${buffer.toString("base64")}`;
      } catch (err) {
        // 如果下载失败，直接发送 URL
        console.error(`nexus: failed to download media, sending URL instead: ${String(err)}`);
        return sendMessageGateway({ cfg, to, text: `📎 ${mediaUrl}`, replyToMessageId });
      }
    }
  }

  if (!base64Data) {
    throw new Error("Either mediaUrl or mediaBuffer must be provided");
  }

  const messageId = generateId();
  const conversationId = normalizeGatewayTarget(to);

  // 发送带图片的消息
  const outbound = {
    type: "reply",
    id: messageId,
    replyTo: replyToMessageId ?? `outbound-${messageId}`,
    content: "",  // 图片消息可以没有文本
    image: base64Data,
    done: true,
    timestamp: Date.now(),
  };

  ws.send(JSON.stringify(outbound));

  return {
    messageId,
    conversationId,
  };
}
