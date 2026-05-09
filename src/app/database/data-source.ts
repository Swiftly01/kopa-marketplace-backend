import { DataSource } from 'typeorm';
import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

console.log(isProduction);
console.log(databaseUrl);
console.log(process.env.DATABASE_PASSWORD);

export const AppDataSource = new DataSource({
  type: 'postgres',

  ssl: isProduction ? { rejectUnauthorized: false } : false,
  /**
   * Production (Railway):
   *   Uses DATABASE_URL provided by Railway.
   *
   * Local Development:
   *   Falls back to your existing DB_HOST, DB_PORT, DB_USERNAME,
   *   DB_PASSWORD, and DB_DATABASE variables.
   */
  ...(databaseUrl
    ? {
        url: databaseUrl,
      }
    : {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'kopa_marketplace',
      }),
  entities: [path.join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '../database/migrations/**/*.{ts,js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  dropSchema: false,
});
