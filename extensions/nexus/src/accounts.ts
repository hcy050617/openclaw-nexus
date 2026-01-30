import type { OpenclawConfig } from "openclaw/plugin-sdk";
import type { GatewayConfig, ResolvedGatewayAccount } from "./types.js";
import { DEFAULT_ACCOUNT_ID } from "openclaw/plugin-sdk";

export function resolveGatewayCredentials(cfg?: GatewayConfig): { serverUrl: string; botId: string; token?: string } | null {
  if (!cfg?.serverUrl || !cfg?.botId) {
    return null;
  }
  return {
    serverUrl: cfg.serverUrl,
    botId: cfg.botId,
    token: cfg.token,
  };
}

export function resolveGatewayAccount(params: { cfg: OpenclawConfig }): ResolvedGatewayAccount {
  const gatewayCfg = params.cfg.channels?.nexus as GatewayConfig | undefined;
  const creds = resolveGatewayCredentials(gatewayCfg);

  return {
    accountId: DEFAULT_ACCOUNT_ID,
    enabled: gatewayCfg?.enabled ?? false,
    configured: Boolean(creds),
    serverUrl: gatewayCfg?.serverUrl,
    botId: gatewayCfg?.botId,
  };
}
