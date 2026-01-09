import { z } from 'zod';

const EnvSchema = z.object({
  MYSQL_HOST: z.string().min(1).default('127.0.0.1'),
  MYSQL_PORT: z.coerce.number().int().positive().default(3306),
  MYSQL_USER: z.string().min(1).default('root'),
  MYSQL_PASSWORD: z.string().optional().default(''),
  MYSQL_DATABASE: z.string().min(1).default('chadconnect'),
  ADMIN_COOKIE_NAME: z.string().min(1).default('cc_admin_session'),
  ADMIN_SESSION_DAYS: z.coerce.number().int().positive().default(7),
});

export const env = EnvSchema.parse({
  MYSQL_HOST: process.env.MYSQL_HOST,
  MYSQL_PORT: process.env.MYSQL_PORT,
  MYSQL_USER: process.env.MYSQL_USER,
  MYSQL_PASSWORD: process.env.MYSQL_PASSWORD,
  MYSQL_DATABASE: process.env.MYSQL_DATABASE,
  ADMIN_COOKIE_NAME: process.env.ADMIN_COOKIE_NAME,
  ADMIN_SESSION_DAYS: process.env.ADMIN_SESSION_DAYS,
});
