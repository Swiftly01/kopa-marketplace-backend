import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import path from 'path';

// const ENV = process.env.NODE_ENV;
// dotenv.config({
//   path: !ENV ? '.env' : `.env.${ENV}`,
// });

dotenv.config({
  path: process.env.NODE_ENV === 'production' ? '.env' : '.env.development',
});

/**
 * TypeORM Data Source Configuration
 *
 * This file configures the connection to PostgreSQL database.
 * Used for migrations and ORM operations.
 *
 * Environment Variables Required:
 * - DB_HOST: Database host
 * - DB_PORT: Database port
 * - DB_USERNAME: Database user
 * - DB_PASSWORD: Database password
 * - DB_DATABASE: Database name
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  // host: process.env.DATABASE_HOST,
  // port: Number(process.env.DATABASE_PORT),
  // username: process.env.DATABASE_USER,
  // password: process.env.DATABASE_PASSWORD,
  // database: process.env.DATABASE_NAME,
  entities: [path.join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '../database/migrations/**/*.{ts,js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  dropSchema: false,
});
