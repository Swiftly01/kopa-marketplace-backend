import type { Request } from 'express';

// absolute request url, used to build pagination links
export const fullUrl = (req: Request): string =>
  `${req.protocol}://${req.get('host')}${req.originalUrl}`;
