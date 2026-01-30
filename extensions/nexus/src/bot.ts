import WebSocket from "ws";
import type { ClawdbotConfig, RuntimeEnv, HistoryEntry } from "clawdbot/plugin-sdk";
import {
  buildPendingHistoryContextFromMap,
  recordPendingHistoryEntryIfEnabled,
  clearHistoryEntriesIfEnabled,
  DEFAULT_GROUP_HISTORY_LIMIT,
} from "clawdbot/plugin-sdk";
import type { GatewayConfig, GatewayInboundMessage, GatewayMessageContext } from "./types.js";
import { getGatewayRuntime } from "./runtime.js";
import { createGatewayReplyDispatcher } from "./reply-dispatcher.js";

export function parseGatewayMessageEvent(event: GatewayInboundMessage): GatewayMessageContext {
  // Gateway server sends: { type: "chat", id, content, from, timestamp }
  // We need to map this to our internal context format
  return {
    messageId: event.id,
    conversationId: event.conversationId ?? event.from, // Use conversationId if provided, else use "from" as the conversation
    senderId: event.from,
    senderName: event.senderName ?? event.from,
    chatType: event.chatType ?? "direct",
    content: event.content,
    replyTo: event.replyTo,
  };
}

export async function handleGatewayMessage(params: {
  cfg: ClawdbotConfig;
  event: GatewayInboundMessage;
  runtime?: RuntimeEnv;
  chatHistories?: Map<string, HistoryEntry[]>;
  ws: WebSocket;
}): Promise<void> {
  const { cfg, event, runtime, chatHistories, ws } = params;
  const gatewayCfg = cfg.channels?.nexus as GatewayConfig | undefined;
  const log = runtime?.log ?? console.log;
  const error = runtime?.error ?? console.error;

  const ctx = parseGatewayMessageEvent(event);
  const isGroup = ctx.chatType === "group";

  log(`nexus: received message from ${ctx.senderId} in ${ctx.conversationId} (${ctx.chatType})`);

  const historyLimit = Math.max(
    0,
    cfg.messages?.groupChat?.historyLimit ?? DEFAULT_GROUP_HISTORY_LIMIT,
  );

  // For DM policy check
  if (!isGroup) {
    const dmPolicy = gatewayCfg?.dmPolicy ?? "open";
    const allowFrom = gatewayCfg?.allowFrom ?? [];

    if (dmPolicy === "allowlist") {
      const allowed = allowFrom.some((entry) => String(entry) === ctx.senderId);
      if (!allowed) {
        log(`nexus: sender ${ctx.senderId} not in DM allowlist`);
        return;
      }
    }
  }

  try {
    const core = getGatewayRuntime();

    const gatewayFrom = isGroup ? `nexus:group:${ctx.conversationId}` : `nexus:${ctx.senderId}`;
    const gatewayTo = isGroup ? `conv:${ctx.conversationId}` : `user:${ctx.senderId}`;

    const route = core.channel.routing.resolveAgentRoute({
      cfg,
      channel: "nexus",
      peer: {
        kind: isGroup ? "group" : "dm",
        id: isGroup ? ctx.conversationId : ctx.senderId,
      },
    });

    const preview = ctx.content.replace(/\s+/g, " ").slice(0, 160);
    const inboundLabel = isGroup
      ? `Gateway message in ${ctx.conversationId}`
      : `Gateway DM from ${ctx.senderId}`;

    core.system.enqueueSystemEvent(`${inboundLabel}: ${preview}`, {
      sessionKey: route.sessionKey,
      contextKey: `nexus:message:${ctx.conversationId}:${ctx.messageId}`,
    });

    const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(cfg);

    // Build message body with quoted content if available
    let messageBody = ctx.content;
    if (ctx.replyTo) {
      messageBody = `[Replying to: "${ctx.replyTo}"]\n\n${ctx.content}`;
    }

    const body = core.channel.reply.formatAgentEnvelope({
      channel: "Gateway",
      from: isGroup ? ctx.conversationId : ctx.senderId,
      timestamp: new Date(),
      envelope: envelopeOptions,
      body: messageBody,
    });

    let combinedBody = body;
    const historyKey = isGroup ? ctx.conversationId : undefined;

    if (isGroup && historyKey && chatHistories) {
      combinedBody = buildPendingHistoryContextFromMap({
        historyMap: chatHistories,
        historyKey,
        limit: historyLimit,
        currentMessage: combinedBody,
        formatEntry: (entry) =>
          core.channel.reply.formatAgentEnvelope({
            channel: "Gateway",
            from: ctx.conversationId,
            timestamp: entry.timestamp,
            body: `${entry.sender}: ${entry.body}`,
            envelope: envelopeOptions,
          }),
      });
    }

    const ctxPayload = core.channel.reply.finalizeInboundContext({
      Body: combinedBody,
      RawBody: ctx.content,
      CommandBody: ctx.content,
      From: gatewayFrom,
      To: gatewayTo,
      SessionKey: route.sessionKey,
      AccountId: route.accountId,
      ChatType: isGroup ? "group" : "direct",
      GroupSubject: isGroup ? ctx.conversationId : undefined,
      SenderName: ctx.senderName ?? ctx.senderId,
      SenderId: ctx.senderId,
      Provider: "nexus" as const,
      Surface: "nexus" as const,
      MessageSid: ctx.messageId,
      Timestamp: event.timestamp,
      WasMentioned: true,
      CommandAuthorized: true,
      OriginatingChannel: "nexus" as const,
      OriginatingTo: gatewayTo,
    });

    const { dispatcher, replyOptions, markDispatchIdle } = createGatewayReplyDispatcher({
      cfg,
      agentId: route.agentId,
      runtime: runtime as RuntimeEnv,
      conversationId: ctx.conversationId,
      replyToMessageId: ctx.messageId,
      ws,
    });

    log(`nexus: dispatching to agent (session=${route.sessionKey})`);

    const { queuedFinal, counts } = await core.channel.reply.dispatchReplyFromConfig({
      ctx: ctxPayload,
      cfg,
      dispatcher,
      replyOptions,
    });

    markDispatchIdle();

    if (isGroup && historyKey && chatHistories) {
      clearHistoryEntriesIfEnabled({
        historyMap: chatHistories,
        historyKey,
        limit: historyLimit,
      });
    }

    log(`nexus: dispatch complete (queuedFinal=${queuedFinal}, replies=${counts.final})`);
  } catch (err) {
    error(`nexus: failed to dispatch message: ${String(err)}`);
  }
}
