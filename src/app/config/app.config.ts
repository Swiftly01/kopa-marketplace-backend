import { registerAs } from '@nestjs/config';

export default registerAs('appConfig', () => ({
  environment: process.env || 'production',
  apiVersion: process.env.API_VERSION,
}));
