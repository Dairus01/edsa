export type EzraMessageRole = "user" | "assistant";

export type EzraClientMessage = {
  id: string;
  role: EzraMessageRole;
  content: string;
};

export type EzraStoredMessage = EzraClientMessage & {
  timestamp: number;
};

export type EzraChatRequest = {
  messages: EzraClientMessage[];
  sessionId: string;
};

export type EzraApiErrorCode =
  | "AUTHENTICATION_FAILED"
  | "CHAT_DISABLED"
  | "CONCURRENT_REQUEST"
  | "INVALID_CONFIGURATION"
  | "INVALID_ORIGIN"
  | "INVALID_REQUEST"
  | "MODEL_UNAVAILABLE"
  | "NOT_CONFIGURED"
  | "PROVIDER_LIMIT"
  | "PROVIDER_UNAVAILABLE"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "UNEXPECTED_ERROR";

export type EzraApiErrorResponse = {
  error: {
    code: EzraApiErrorCode;
    message: string;
  };
};
