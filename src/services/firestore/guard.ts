export type MigrationEnv = {
  FIRESTORE_EMULATOR_HOST?: string;
  DATABASE_URL?: string;
  MIGRATION_ALLOW_REMOTE_READ?: string;
  MIGRATION_CONFIRM?: string;
};

const placeholder = (url: string) =>
  !url.startsWith("postgres") || url.includes("USER:PASSWORD") || url.includes("@HOST");

function databaseHost(url: string) {
  try {
    return new URL(url.replace(/^postgresql:/, "http:")).hostname;
  } catch {
    return "";
  }
}

/** Returns a refusal code, or null when a local dry-run is allowed. */
export function migrationBlockReason(env: MigrationEnv, args: string[] = []) {
  if (!env.FIRESTORE_EMULATOR_HOST) return "no-emulator";
  const url = env.DATABASE_URL ?? "";
  if (placeholder(url)) return "placeholder-database";
  const host = databaseHost(url);
  const remote = host !== "" && host !== "localhost" && host !== "127.0.0.1";
  if (remote && env.MIGRATION_ALLOW_REMOTE_READ !== "yes") return "remote-database";
  if (args.includes("--write") && env.MIGRATION_CONFIRM !== "emulator") return "write-not-confirmed";
  return null;
}
