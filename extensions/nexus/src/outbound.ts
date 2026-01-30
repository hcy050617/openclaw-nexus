import type { ChannelOutboundAdapter } from "clawdbot/plugin-sdk";
import { getGatewayRuntime } from "./runtime.js";
import { sendMessageGateway } from "./send.js";

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

    // For media, just send the URL as text for now
    if (mediaUrl) {
      const mediaText = `📎 ${mediaUrl}`;
      const result = await sendMessageGateway({ cfg, to, text: mediaText });
      return { channel: "gateway", ...result };
    }

    const result = await sendMessageGateway({ cfg, to, text: text ?? "" });
    return { channel: "gateway", ...result };
  },
};
