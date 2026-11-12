import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

const dbUrl = process.env.DATABASE_URL || "";
const prismaDir = path.join(process.cwd(), "prisma");
const targetSchema = path.join(prismaDir, "schema.prisma");
const postgresSchema = path.join(prismaDir, "schema.postgresql.prisma");

if (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://")) {
  if (fs.existsSync(postgresSchema)) {
    fs.copyFileSync(postgresSchema, targetSchema);
    console.log("🐘 Detected PostgreSQL DATABASE_URL — switched prisma/schema.prisma to postgresql provider.");
  }
} else {
  console.log("🗃️ Using SQLite provider in prisma/schema.prisma.");
}
