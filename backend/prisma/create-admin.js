"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("=================================");
    console.log(" Creating First Administrator");
    console.log("=================================");
    const firstName = "Engel";
    const lastName = "Feliz";
    const email = "Engel@itsupport.com";
    const backupEmail = "efeliz@trueshore.com";
    // Password temporal generada
    const temporaryPassword = "ITHub@2026!Admin01";
    console.log("");
    console.log("Generating password hash...");
    const passwordHash = await bcrypt_1.default.hash(temporaryPassword, 12);
    const adminRole = await prisma.role.findUnique({
        where: {
            name: "ADMIN"
        }
    });
    if (!adminRole) {
        throw new Error("ADMIN role not found. Run seed first.");
    }
    const user = await prisma.systemUser.create({
        data: {
            firstName,
            lastName,
            email,
            backupEmail,
            passwordHash,
            status: "ACTIVE",
            roleId: adminRole.id
        }
    });
    await prisma.securityLog.create({
        data: {
            userId: user.id,
            action: "INITIAL_ADMIN_CREATED",
            ipAddress: "LOCAL"
        }
    });
    console.log("");
    console.log("Administrator created successfully");
    console.log("---------------------------------");
    console.log("Email:");
    console.log(email);
    console.log("");
    console.log("Temporary password:");
    console.log(temporaryPassword);
    console.log("---------------------------------");
}
main()
    .catch((error) => {
    console.error(error);
})
    .finally(async () => {
    await prisma.$disconnect();
});
