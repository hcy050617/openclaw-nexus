import type { OpenclawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { gatewayPlugin } from "./src/channel.js";
import { setGatewayRuntime } from "./src/runtime.js";

export { monitorGatewayProvider, stopGatewayMonitor } from "./src/monitor.js";
export { sendMessageGateway } from "./src/send.js";
export { probeGateway } from "./src/probe.js";
export { gatewayPlugin } from "./src/channel.js";

const plugin = {
  id: "nexus",
  name: "Nexus Channel",
  description: "Connect OpenClaw to Nexus Gateway",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenclawPluginApi) {
    setGatewayRuntime(api.runtime);
    api.registerChannel({ plugin: gatewayPlugin });
  },
};

export default plugin;
