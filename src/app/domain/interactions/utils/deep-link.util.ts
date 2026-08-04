import { ConfigService } from '@nestjs/config';

export function buildReviewDeepLink(
  configService: ConfigService,
  params: { productId: string; sellerId: string; interactionId: string },
): string {
  const scheme = configService.get<string>(
    'interactionConfig.deepLinkScheme',
    'kopamarketplace://',
  );
  const path = configService.get<string>(
    'interactionConfig.reviewDeepLinkPath',
    'review/create',
  );

  const query = new URLSearchParams({
    productId: params.productId,
    sellerId: params.sellerId,
    interactionId: params.interactionId,
  }).toString();

  const normalizedScheme = scheme.endsWith('://') ? scheme : `${scheme}://`;

  return `${normalizedScheme}${path}?${query}`;
}
