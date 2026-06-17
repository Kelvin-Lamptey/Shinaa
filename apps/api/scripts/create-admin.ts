import { prisma } from "@shinaa/database";
import * as bcrypt from "bcrypt";
import { parseArgs } from "util";

async function main() {
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        email: { type: "string" },
        password: { type: "string" },
        name: { type: "string" },
      },
      strict: true,
    });

    const { email, password, name } = values;

    if (!email || !password || !name) {
      console.error("Error: Missing required arguments.");
      console.error("Usage: bun run create-admin --email <email> --password <password> --name <name>");
      process.exit(1);
    }

    console.log(`Creating super_admin user: ${email}...`);

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await prisma.staffUser.create({
      data: {
        email,
        name,
        passwordHash,
        role: "super_admin",
      },
    });

    console.log(`Successfully created super_admin user: ${user.name} (${user.email})`);
  } catch (error: any) {
    console.error("Failed to create super_admin user:", error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
