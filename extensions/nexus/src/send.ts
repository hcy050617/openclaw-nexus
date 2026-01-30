import WebSocket from "ws";
import crypto from "crypto";
import type { ClawdbotConfig } from "clawdbot/plugin-sdk";
import type { GatewayConfig, GatewaySendResult, GatewayOutboundMessage } from "./types.js";
import { getGatewayWsClient } from "./monitor.js";

function generateId(): string {
  return crypto.randomUUID();
}

export type SendGatewayMessageParams = {
  cfg: ClawdbotConfig;
  to: string;
  text: string;
  replyToMessageId?: string;
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
