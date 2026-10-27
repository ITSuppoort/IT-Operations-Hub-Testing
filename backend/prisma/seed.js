"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log("Creating roles...");
    const adminRole = await prisma.role.upsert({
        where: {
            name: "ADMIN"
        },
        update: {},
        create: {
            name: "ADMIN"
        }
    });
    const technicianRole = await prisma.role.upsert({
        where: {
            name: "TECHNICIAN"
        },
        update: {},
        create: {
            name: "TECHNICIAN"
        }
    });
    const permissions = [
        "USER_CREATE",
        "USER_EDIT",
        "USER_DELETE",
        "ASSET_CREATE",
        "ASSET_EDIT",
        "ASSET_VIEW",
        "ASSET_DELETE",
        "REPORT_VIEW",
        "REPORT_EXPORT",
        "SYSTEM_CONFIG"
    ];
    for (const permissionName of permissions) {
        const permission = await prisma.permission.upsert({
            where: {
                name: permissionName
            },
            update: {},
            create: {
                name: permissionName
            }
        });
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: adminRole.id,
                    permissionId: permission.id
                }
            },
            update: {},
            create: {
                roleId: adminRole.id,
                permissionId: permission.id
            }
        });
    }
    console.log("Roles and permissions created");
}
main()
    .then(() => {
    console.log("Seed completed");
})
    .catch((e) => {
    console.error(e);
})
    .finally(async () => {
    await prisma.$disconnect();
});
