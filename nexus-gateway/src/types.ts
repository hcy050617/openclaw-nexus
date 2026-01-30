/**
 * Bot connection types
 */
export type BotInfo = {
  id: string;
  name: string;
  token: string;
  connectedAt: Date;
  lastPingAt: Date;
};

export type MessageToBot = {
  type: "chat";
  id: string;
  content: string;
  from: string;
  replyTo?: string;
  timestamp: number;
};

export type MessageFromBot = {
  type: "reply";
  id: string;
  replyTo: string;
  content: string;
  done: boolean;
  timestamp: number;
};

export type BotRegisterMessage = {
  type: "register";
  botId: string;
  botName: string;
  token: string;
};

export type BotPongMessage = {
  type: "pong";
};

export type GatewayPingMessage = {
  type: "ping";
};

export type BotMessage = MessageFromBot | BotRegisterMessage | BotPongMessage;
export type GatewayMessage = MessageToBot | GatewayPingMessage;

/**
 * User/Frontend types
 */
export type UserChatRequest = {
  message: string;
  target?: string; // bot id, defaults to first available
  conversationId?: string;
};

export type UserChatResponse = {
  id: string;
  content: string;
  botId: string;
  done: boolean;
  timestamp: number;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type UserInfo = {
  username: string;
  displayName: string;
};

export type UserSession = {
  token: string;
  user: UserInfo;
  createdAt: number;
  expiresAt: number;
};
