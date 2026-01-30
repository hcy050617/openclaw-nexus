import type { ChannelPlugin, ClawdbotConfig } from "clawdbot/plugin-sdk";
import { DEFAULT_ACCOUNT_ID } from "clawdbot/plugin-sdk";
import type { ResolvedGatewayAccount, GatewayConfig } from "./types.js";
import { resolveGatewayAccount, resolveGatewayCredentials } from "./accounts.js";
import { gatewayOutbound } from "./outbound.js";
import { probeGateway } from "./probe.js";
import { normalizeGatewayTarget, looksLikeGatewayId, formatGatewayTarget, sendMessageGateway } from "./send.js";

const meta = {
  id: "nexus",
  label: "Nexus",
  selectionLabel: "Nexus Gateway",
  blurb: "Connect to Nexus Gateway for AI bot messaging.",
  order: 80,
} as const;

export const gatewayPlugin: ChannelPlugin<ResolvedGatewayAccount> = {
  id: "nexus",
  meta: {
    ...meta,
  },
  pairing: {
    idLabel: "userId",
    normalizeAllowEntry: (entry) => entry.replace(/^(gateway|user):/i, ""),
    notifyApproval: async ({ cfg, id }) => {
      await sendMessageGateway({
        cfg,
        to: id,
        text: "Your pairing request has been approved. You can now chat with the bot.",
      });
    },
  },
  capabilities: {
    chatTypes: ["direct", "channel"],
    polls: false,
    threads: false,
    media: false,
    reactions: false,
    edit: false,
    reply: true,
  },
  agentPrompt: {
    messageToolHints: () => [
      "- Gateway targeting: omit `target` to reply to the current conversation (auto-inferred). Explicit targets: `user:userId` or `conv:conversationId`.",
    ],
  },
  reload: { configPrefixes: ["channels.nexus"] },
  configSchema: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        enabled: { type: "boolean" },
        serverUrl: { type: "string" },
        botId: { type: "string" },
        botName: { type: "string" },
        token: { type: "string" },
        reconnectInterval: { type: "integer", minimum: 1000 },
        dmPolicy: { type: "string", enum: ["open", "pairing", "allowlist"] },
        allowFrom: { type: "array", items: { oneOf: [{ type: "string" }, { type: "number" }] } },
      },
    },
  },
  config: {
    listAccountIds: () => [DEFAULT_ACCOUNT_ID],
    resolveAccount: (cfg) => resolveGatewayAccount({ cfg }),
    defaultAccountId: () => DEFAULT_ACCOUNT_ID,
    setAccountEnabled: ({ cfg, enabled }) => ({
      ...cfg,
      channels: {
        ...cfg.channels,
        nexus: {
          ...cfg.channels?.nexus,
          enabled,
        },
      },
    }),
    deleteAccount: ({ cfg }) => {
      const next = { ...cfg } as ClawdbotConfig;
      const nextChannels = { ...cfg.channels };
      delete (nextChannels as Record<string, unknown>).nexus;
      if (Object.keys(nextChannels).length > 0) {
        next.channels = nextChannels;
      } else {
        delete next.channels;
      }
      return next;
    },
    isConfigured: (_account, cfg) =>
      Boolean(resolveGatewayCredentials(cfg.channels?.nexus as GatewayConfig | undefined)),
    describeAccount: (account) => ({
      accountId: account.accountId,
      enabled: account.enabled,
      configured: account.configured,
    }),
    resolveAllowFrom: ({ cfg }) =>
      (cfg.channels?.nexus as GatewayConfig | undefined)?.allowFrom ?? [],
    formatAllowFrom: ({ allowFrom }) =>
      allowFrom
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .map((entry) => entry.toLowerCase()),
  },
  setup: {
    resolveAccountId: () => DEFAULT_ACCOUNT_ID,
    applyAccountConfig: ({ cfg }) => ({
      ...cfg,
      channels: {
        ...cfg.channels,
        nexus: {
          ...cfg.channels?.nexus,
          enabled: true,
        },
      },
    }),
  },
  messaging: {
    normalizeTarget: normalizeGatewayTarget,
    targetResolver: {
      looksLikeId: looksLikeGatewayId,
      hint: "<conversationId|user:userId|conv:convId>",
    },
  },
  outbound: gatewayOutbound,
  status: {
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
      port: null,
    },
    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      running: snapshot.running ?? false,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
      port: snapshot.port ?? null,
      probe: snapshot.probe,
      lastProbeAt: snapshot.lastProbeAt ?? null,
    }),
    probeAccount: async ({ cfg }) =>
      await probeGateway(cfg.channels?.nexus as GatewayConfig | undefined),
    buildAccountSnapshot: ({ account, runtime, probe }) => ({
      accountId: account.accountId,
      enabled: account.enabled,
      configured: account.configured,
      running: runtime?.running ?? false,
      lastStartAt: runtime?.lastStartAt ?? null,
      lastStopAt: runtime?.lastStopAt ?? null,
      lastError: runtime?.lastError ?? null,
      port: runtime?.port ?? null,
      probe,
    }),
  },
  gateway: {
    startAccount: async (ctx) => {
      const { monitorGatewayProvider } = await import("./monitor.js");
      const gatewayCfg = ctx.cfg.channels?.nexus as GatewayConfig | undefined;
      ctx.setStatus({ accountId: ctx.accountId, port: null });
      ctx.log?.info(`starting nexus provider (url: ${gatewayCfg?.serverUrl ?? "not set"})`);
      return monitorGatewayProvider({
        config: ctx.cfg,
        runtime: ctx.runtime,
        abortSignal: ctx.abortSignal,
        accountId: ctx.accountId,
      });
    },
  },
};
