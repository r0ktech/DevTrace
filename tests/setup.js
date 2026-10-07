// Test environment. Database tests run against a dedicated database whose
// name must contain "test" so a development database is never truncated.
process.env.TOKEN_ENCRYPTION_KEY ||= "test-encryption-key";
process.env.NEXTAUTH_SECRET ||= "test-secret";
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "postgresql://localhost:5432/devtrace_test";
// Empty (not deleted) so a local .env loaded by Prisma cannot enable Redis in tests
process.env.REDIS_URL = "";

if (!/test/i.test(new URL(process.env.DATABASE_URL).pathname)) {
  throw new Error(`Refusing to run tests against non-test database: ${process.env.DATABASE_URL}`);
}
