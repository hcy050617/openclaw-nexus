import type { PluginRuntime } from "openclaw/plugin-sdk";

let gatewayRuntime: PluginRuntime | null = null;

export function setGatewayRuntime(runtime: PluginRuntime): void {
  gatewayRuntime = runtime;
}

export function getGatewayRuntime(): PluginRuntime {
  if (!gatewayRuntime) {
    throw new Error("Gateway runtime not initialized");
  }
  return gatewayRuntime;
}
