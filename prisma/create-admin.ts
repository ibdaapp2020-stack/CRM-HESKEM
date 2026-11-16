// Creates (or updates) a STAFF user WITHOUT touching any other data.
// Usage: npx tsx prisma/create-admin.ts <email> <password> [name]
import { PrismaClient } from "../src/lib/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [email, password, name = "מנהל IBDA"] = process.argv.slice(2);
  if (!email || !password) {
    throw new Error("Usage: npx tsx prisma/create-admin.ts <email> <password> [name]");
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, role: "STAFF", name },
    create: { email: email.toLowerCase(), passwordHash, role: "STAFF", name },
  });
  console.log(`OK: STAFF user ready -> ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
