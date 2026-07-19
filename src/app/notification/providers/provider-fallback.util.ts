import {
  ChannelSendPayload,
  ChannelSendResult,
  IChannelProvider,
} from '../interfaces/channel-provider.interface';

export interface ProviderAttemptOutcome {
  result: ChannelSendResult | null;
  errors: string[];
}

export async function sendWithProviderFallback(
  providers: IChannelProvider[],
  recipients: string[],
  payload: Omit<ChannelSendPayload, 'to'>,
) {
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const results = await Promise.all(
        recipients.map((to) => provider.send({ ...payload, to })),
      );
      return { result: results[0], errors };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${provider.name}: ${message}`);
    }
  }

  return { result: null, errors };
}
