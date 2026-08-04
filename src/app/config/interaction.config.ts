import { registerAs } from '@nestjs/config';

export default registerAs('interactionConfig', () => {
  const delayHours = Number(process.env.REVIEW_REQUEST_DELAY_HOURS || 24);

  return {
    reviewRequestDelayMinutes: Number(
      process.env.REVIEW_REQUEST_DELAY_MINUTES || delayHours * 60,
    ),
    reviewEditWindowHours: Number(process.env.REVIEW_EDIT_WINDOW_HOURS || 72),
    deepLinkScheme: process.env.APP_DEEP_LINK_SCHEME || 'kopamarketplace://',
    reviewDeepLinkPath: process.env.REVIEW_DEEP_LINK_PATH || 'review/create',
  };
});
