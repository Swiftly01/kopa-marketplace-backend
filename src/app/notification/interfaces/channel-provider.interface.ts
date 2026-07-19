export interface ChannelSendPayload {
  to: string;
  title?: string;
  body: string;
  html?: string;
  data?: Record<string, unknown>;
}

export interface ChannelSendResult {
  providerMessageId: string;
  providerName: string;
}

export interface IChannelProvider {
  readonly name: string;
  send(payload: ChannelSendPayload): Promise<ChannelSendResult>;
}
