import prisma from "../config/prisma";


// ======================================================
// DASHBOARD SUMMARY
// ======================================================

export async function getDashboardSummary() {

    // ==================================================
    // EQUIPMENT
    // ==================================================

    const totalEquipment = await prisma.equipment.count();

    const availableEquipment = await prisma.equipment.count({
        where: {
            status: "ACTIVE",
            condition: "AVAILABLE"
        }
    });

    const assignedEquipment = await prisma.equipment.count({
        where: {
            status: "ACTIVE",
            assignedUser: {
                not: null
            }
        }
    });

    const damagedEquipment = await prisma.equipment.count({
        where: {
            condition: "DAMAGED"
        }
    });

    const inactiveEquipment = await prisma.equipment.count({
        where: {
            status: {
                not: "ACTIVE"
            }
        }
    });


    // ==================================================
    // EQUIPMENT BY CATEGORY
    // ==================================================

    const equipmentByCategory =
        await prisma.equipment.groupBy({

            by: ["category"],

            _count: {
                _all: true
            },

            orderBy: {
                category: "asc"
            }

        });


    // ==================================================
    // EQUIPMENT BY CONDITION
    // ==================================================

    const equipmentByCondition =
        await prisma.equipment.groupBy({

            by: ["condition"],

            _count: {
                _all: true
            },

            orderBy: {
                condition: "asc"
            }

        });


    // ==================================================
    // EQUIPMENT BY STATUS
    // ==================================================

    const equipmentByStatus =
        await prisma.equipment.groupBy({

            by: ["status"],

            _count: {
                _all: true
            },

            orderBy: {
                status: "asc"
            }

        });


    // ==================================================
    // COMPONENT INVENTORY
    // ==================================================

    const totalComponentTypes =
        await prisma.component.count();


    const totalComponentUnits =
        await prisma.component.aggregate({

            _sum: {
                quantity: true
            }

        });


// ==================================================
// LOW STOCK COMPONENTS
// ==================================================

const allComponents =
    await prisma.component.findMany({

        orderBy: {
            quantity: "asc"
        }

    });


const lowStockComponents =
    allComponents.filter(

        component =>
            component.quantity <=
            component.minimumStock

    );

    // ==================================================
    // INVENTORY COMPONENTS
    // ==================================================

    const componentStock =
        await prisma.component.findMany({

            orderBy: [
                {
                    type: "asc"
                },
                {
                    brand: "asc"
                }
            ]

        });


    // ==================================================
    // MOVEMENTS
    // ==================================================

    const totalMovements =
        await prisma.movement.count();


    const movementsByAction =
        await prisma.movement.groupBy({

            by: ["action"],

            _count: {
                _all: true
            },

            orderBy: {
                action: "asc"
            }

        });


    // ==================================================
    // RECENT MOVEMENTS
    // ==================================================

    const recentMovements =
        await prisma.movement.findMany({

            take: 10,

            orderBy: {
                createdAt: "desc"
            },

            include: {

                equipment: {

                    select: {

                        id: true,
                        category: true,
                        brand: true,
                        model: true,
                        serial: true,
                        assetTag: true

                    }

                }

            }

        });


    // ==================================================
    // USERS
    // ==================================================

    const totalUsers =
        await prisma.systemUser.count();


    const activeUsers =
        await prisma.systemUser.count({

            where: {
                status: "ACTIVE"
            }

        });


    // ==================================================
    // RETURN DASHBOARD
    // ==================================================

    return {

        equipment: {

            total: totalEquipment,

            available: availableEquipment,

            assigned: assignedEquipment,

            damaged: damagedEquipment,

            inactive: inactiveEquipment,

            byCategory: equipmentByCategory.map(
                item => ({

                    category: item.category,

                    total: item._count._all

                })
            ),

            byCondition: equipmentByCondition.map(
                item => ({

                    condition: item.condition,

                    total: item._count._all

                })
            ),

            byStatus: equipmentByStatus.map(
                item => ({

                    status: item.status,

                    total: item._count._all

                })
            )

        },


        inventory: {

            componentTypes:
                totalComponentTypes,

            totalUnits:
                totalComponentUnits._sum.quantity ?? 0,

            lowStock:
                lowStockComponents,

            components:
                componentStock

        },


        movements: {

            total:
                totalMovements,

            byAction:
                movementsByAction.map(
                    item => ({

                        action: item.action,

                        total: item._count._all

                    })
                ),

            recent:
                recentMovements

        },


        users: {

            total:
                totalUsers,

            active:
                activeUsers

        }

    };

}