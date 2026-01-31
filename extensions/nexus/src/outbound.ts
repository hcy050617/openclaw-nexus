import type { ChannelOutboundAdapter } from "openclaw/plugin-sdk";
import { getGatewayRuntime } from "./runtime.js";
import { sendMessageGateway, sendMediaGateway } from "./send.js";

export const gatewayOutbound: ChannelOutboundAdapter = {
  deliveryMode: "direct",
  chunker: (text, limit) => getGatewayRuntime().channel.text.chunkMarkdownText(text, limit),
  chunkerMode: "markdown",
  textChunkLimit: 4000,

  sendText: async ({ cfg, to, text }) => {
    const result = await sendMessageGateway({ cfg, to, text });
    return { channel: "gateway", ...result };
  },

  sendMedia: async ({ cfg, to, text, mediaUrl }) => {
    // Send text first if provided
    if (text?.trim()) {
      await sendMessageGateway({ cfg, to, text });
    }

    // 发送媒体
    if (mediaUrl) {
      try {
        const result = await sendMediaGateway({ cfg, to, mediaUrl });
        return { channel: "gateway", ...result };
      } catch (err) {
        // 如果发送失败，回退到发送 URL 链接
        console.error(`[nexus] sendMediaGateway failed:`, err);
        const fallbackText = `📎 ${mediaUrl}`;
        const result = await sendMessageGateway({ cfg, to, text: fallbackText });
        return { channel: "gateway", ...result };
      }
    }

    const result = await sendMessageGateway({ cfg, to, text: text ?? "" });
    return { channel: "gateway", ...result };
  },
};
