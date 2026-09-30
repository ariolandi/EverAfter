// Imported first by index.ts so later modules see the variables when they load.
try {
  process.loadEnvFile();
} catch {
  // No .env file; rely on the real environment.
}
