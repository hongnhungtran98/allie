import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = [
    {
      name:     "Admin",
      email:    "admin@allianceitsc.com",
      password: "123456",
      role:     Role.ADMIN,
    },
    {
      name:     "Nhung",
      email:    "nhung.tranthihong@allianceitsc.com",
      password: "123456",
      role:     Role.USER,
    },
  ];

  for (const u of users) {
    const passwordHash = await hash(u.password, 12);
    await prisma.user.upsert({
      where:  { email: u.email },
      update: { passwordHash, role: u.role },
      create: { name: u.name, email: u.email, passwordHash, role: u.role },
    });
    console.log(`✓ ${u.email}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
