declare module "clawdbot/plugin-sdk" {
  export type PluginRuntime = any;
  export type ClawdbotPluginApi = {
    runtime: PluginRuntime;
    registerChannel: (opts: { plugin: ChannelPlugin<any> }) => void;
  };
  export type ClawdbotConfig = any;
  export type RuntimeEnv = any;
  export type HistoryEntry = {
    sender: string;
    body: string;
    timestamp: number;
    messageId?: string;
  };
  export type ChannelPlugin<T> = {
    id: string;
    meta: {
      id: string;
      label: string;
      selectionLabel?: string;
      docsPath?: string;
      docsLabel?: string;
      blurb?: string;
      aliases?: string[];
      order?: number;
    };
    pairing?: {
      idLabel: string;
      normalizeAllowEntry: (entry: string) => string;
      notifyApproval?: (params: { cfg: ClawdbotConfig; id: string }) => Promise<void>;
    };
    capabilities: {
      chatTypes: ("direct" | "channel")[];
      polls: boolean;
      threads: boolean;
      media: boolean;
      reactions: boolean;
      edit: boolean;
      reply: boolean;
    };
    agentPrompt?: {
      messageToolHints?: () => string[];
    };
    groups?: {
      resolveToolPolicy?: any;
    };
    reload?: { configPrefixes: string[] };
    configSchema: {
      schema: any;
    };
    config: {
      listAccountIds: () => string[];
      resolveAccount: (cfg: ClawdbotConfig) => T;
      defaultAccountId: () => string;
      setAccountEnabled: (params: { cfg: ClawdbotConfig; enabled: boolean }) => ClawdbotConfig;
      deleteAccount: (params: { cfg: ClawdbotConfig }) => ClawdbotConfig;
      isConfigured: (account: T, cfg: ClawdbotConfig) => boolean;
      describeAccount: (account: T) => any;
      resolveAllowFrom: (params: { cfg: ClawdbotConfig }) => (string | number)[];
      formatAllowFrom: (params: { allowFrom: (string | number)[] }) => string[];
    };
    security?: {
      collectWarnings?: (params: { cfg: ClawdbotConfig }) => string[];
    };
    setup?: {
      resolveAccountId: () => string;
      applyAccountConfig: (params: { cfg: ClawdbotConfig }) => ClawdbotConfig;
    };
    onboarding?: any;
    messaging?: {
      normalizeTarget: (target: string) => string;
      targetResolver?: {
        looksLikeId: (id: string) => boolean;
        hint: string;
      };
    };
    directory?: any;
    outbound: ChannelOutboundAdapter;
    status: {
      defaultRuntime: any;
      buildChannelSummary: (params: { snapshot: any }) => any;
      probeAccount: (params: { cfg: ClawdbotConfig }) => Promise<any>;
      buildAccountSnapshot: (params: { account: T; runtime: any; probe: any }) => any;
    };
    gateway: {
      startAccount: (ctx: any) => Promise<void>;
    };
  };
  export type ChannelOutboundAdapter = {
    deliveryMode: string;
    chunker: (text: string, limit: number) => string[];
    chunkerMode: string;
    textChunkLimit: number;
    sendText: (params: { cfg: ClawdbotConfig; to: string; text: string }) => Promise<any>;
    sendMedia: (params: { cfg: ClawdbotConfig; to: string; text?: string; mediaUrl?: string }) => Promise<any>;
  };
  export type ReplyDispatcher = {
    sendText: (params: { text: string }) => Promise<any>;
    sendMedia: (params: { text?: string; mediaUrl?: string }) => Promise<any>;
    sendBlockReply: (params: { text: string }) => Promise<any>;
    waitForIdle: () => Promise<void>;
  };
  export type ReplyDispatcherOptions = {
    streamingEnabled: boolean;
    typingIndicator: boolean;
  };
  export const DEFAULT_ACCOUNT_ID: string;
  export const PAIRING_APPROVED_MESSAGE: string;
  export const DEFAULT_GROUP_HISTORY_LIMIT: number;
  export function emptyPluginConfigSchema(): any;
  export function buildPendingHistoryContextFromMap(params: {
    historyMap: Map<string, HistoryEntry[]>;
    historyKey: string;
    limit: number;
    currentMessage: string;
    formatEntry: (entry: HistoryEntry) => string;
  }): string;
  export function recordPendingHistoryEntryIfEnabled(params: {
    historyMap: Map<string, HistoryEntry[]>;
    historyKey: string;
    limit: number;
    entry: HistoryEntry;
  }): void;
  export function clearHistoryEntriesIfEnabled(params: {
    historyMap: Map<string, HistoryEntry[]>;
    historyKey: string;
    limit: number;
  }): void;
}
