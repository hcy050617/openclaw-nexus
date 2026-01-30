import type { GatewayConfig, GatewayProbeResult } from "./types.js";

export async function probeGateway(cfg?: GatewayConfig): Promise<GatewayProbeResult> {
  if (!cfg?.serverUrl || !cfg?.botId) {
    return {
      ok: false,
      error: "Gateway not configured (serverUrl and botId required)",
    };
  }

  // For now, just return success if configured
  // In the future, we could try to connect and verify
  return {
    ok: true,
    botId: cfg.botId,
    botName: cfg.botName,
  };
}
