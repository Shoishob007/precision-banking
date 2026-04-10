import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  frontendUrls: (
    process.env.FRONTEND_URLS ??
    "http://localhost:3000,https://precision-banking-xp8e.vercel.app"
  )
    .split(",")
    .map((url) => url.trim()),
};
