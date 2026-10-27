const fs = require("fs");

const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
}
`;

fs.writeFileSync(
  "prisma/schema.prisma",
  schema.trim(),
  "utf8"
);

console.log("schema.prisma created with UTF-8 encoding");