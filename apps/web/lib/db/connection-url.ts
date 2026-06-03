export function normalizePostgresJsConnectionUrl(connectionUrl: string) {
  if (!connectionUrl) {
    return "";
  }

  try {
    const url = new URL(connectionUrl);

    if (url.protocol === "postgres:" || url.protocol === "postgresql:") {
      // postgres-js can hang against Neon pooler URLs with channel_binding=require.
      // TLS stays required through sslmode=require.
      url.searchParams.delete("channel_binding");
    }

    return url.toString();
  } catch {
    return connectionUrl;
  }
}

export function getPostgresJsConnectionUrl() {
  return normalizePostgresJsConnectionUrl(
    process.env.POSTGRES_URL ??
      process.env.DATABASE_URL ??
      process.env.POSTGRES_PRISMA_URL ??
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.DATABASE_URL_UNPOOLED ??
      "",
  );
}
