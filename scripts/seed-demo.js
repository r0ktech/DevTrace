// Seeds (or refreshes) the fictional demo account.
import { PrismaClient } from "@prisma/client";
import { seedDemo } from "../src/server/demo/seed.js";

const prisma = new PrismaClient();

try {
  const counts = await seedDemo(prisma);
  console.log("Demo account seeded:", counts);
} catch (error) {
  console.error("Failed to seed demo account:", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
