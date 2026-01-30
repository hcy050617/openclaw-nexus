export type GatewayConfig = {
  enabled?: boolean;
  serverUrl: string;
  botId: string;
  botName?: string;
  token?: string;
  reconnectInterval?: number;
  dmPolicy?: "open" | "pairing" | "allowlist";
  allowFrom?: (string | number)[];
};

export type ResolvedGatewayAccount = {
  accountId: string;
  enabled: boolean;
  configured: boolean;
  serverUrl?: string;
  botId?: string;
};

export type GatewayMessageContext = {
  conversationId: string;
  messageId: string;
  senderId: string;
  senderName?: string;
  chatType: "direct" | "group";
  content: string;
  replyTo?: string;
};

export type GatewaySendResult = {
  messageId: string;
  conversationId: string;
};

export type GatewayProbeResult = {
  ok: boolean;
  error?: string;
  botId?: string;
  botName?: string;
};

// WebSocket message types
export type GatewayWsMessage = {
  type: string;
  [key: string]: unknown;
};

// Gateway server sends "chat" type messages to bot
export type GatewayInboundMessage = {
  type: "chat";
  id: string;           // messageId from gateway
  content: string;      // message content
  from: string;         // sender identifier (e.g., "web-user")
  replyTo?: string;     // if this is a reply to another message
  timestamp: number;
  // Extended fields for group support (optional, for future)
  conversationId?: string;
  chatType?: "direct" | "group";
  senderName?: string;
};

// Bot sends "reply" type messages back to gateway
export type GatewayOutboundMessage = {
  type: "reply";
  id: string;           // reply message id
  replyTo: string;      // original message id we're replying to
  content: string;      // reply content
  done: boolean;        // whether this is the final chunk
  timestamp: number;
};

export type GatewayBotRegister = {
  type: "register";
  botId: string;
  botName: string;
  token: string;
};
