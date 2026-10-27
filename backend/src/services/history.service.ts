// =====================================================
// IT OPERATIONS HUB
// HISTORY SERVICE
// =====================================================



import prisma from "../config/prisma";


// =====================================================
// GET HISTORY
// =====================================================

export async function getHistory() {

    const [
        movements,
        damages,
        inventoryMovements,
        securityLogs
    ] = await Promise.all([

        // -------------------------------------------------
        // EQUIPMENT MOVEMENTS
        // -------------------------------------------------

        prisma.movement.findMany({

            orderBy: {
                createdAt: "desc"
            },

            take: 100,

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

        }),


        // -------------------------------------------------
        // EQUIPMENT DAMAGES
        // -------------------------------------------------

        prisma.damage.findMany({

            orderBy: {
                createdAt: "desc"
            },

            take: 100,

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

        }),


        // -------------------------------------------------
        // INVENTORY MOVEMENTS
        // -------------------------------------------------

        prisma.inventoryMovement.findMany({

            orderBy: {
                createdAt: "desc"
            },

            take: 100,

            include: {

                component: {

                    select: {

                        id: true,
                        type: true,
                        brand: true

                    }

                }

            }

        }),


        // -------------------------------------------------
        // SECURITY LOGS
        // -------------------------------------------------

        prisma.securityLog.findMany({

            orderBy: {
                createdAt: "desc"
            },

            take: 100,

            include: {

                user: {

                    select: {

                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true

                    }

                }

            }

        })

    ]);


    // =====================================================
    // NORMALIZE HISTORY
    // =====================================================

    const history = [

        ...movements.map(
            movement => ({

                id: movement.id,

                type: "EQUIPMENT_MOVEMENT",

                action: movement.action,

                description:
                    `Equipment movement: ${movement.action}`,

                equipment: movement.equipment,

                fromLocation:
                    movement.fromLocation,

                toLocation:
                    movement.toLocation,

                assignedUser:
                    movement.assignedUser,

                createdBy:
                    movement.createdBy,

                createdAt:
                    movement.createdAt

            })
        ),


        ...damages.map(
            damage => ({

                id: damage.id,

                type: "DAMAGE",

                action:
                    damage.status,

                description:
                    damage.description,

                equipment:
                    damage.equipment,

                priority:
                    damage.priority,

                damageType:
                    damage.type,

                reportedBy:
                    damage.reportedBy,

                repairedBy:
                    damage.repairedBy,

                repairedAt:
                    damage.repairedAt,

                cost:
                    damage.cost,

                createdAt:
                    damage.createdAt

            })
        ),


        ...inventoryMovements.map(
            movement => ({

                id: movement.id,

                type: "INVENTORY_MOVEMENT",

                action:
                    movement.type,

                description:
                    movement.reason ??
                    `Inventory movement: ${movement.type}`,

                component:
                    movement.component,

                quantity:
                    movement.quantity,

                previousQuantity:
                    movement.previousQuantity,

                newQuantity:
                    movement.newQuantity,

                createdBy:
                    movement.createdBy,

                createdAt:
                    movement.createdAt

            })
        ),


        ...securityLogs.map(
            log => ({

                id: log.id,

                type: "SECURITY",

                action:
                    log.action,

                description:
                    `Security action: ${log.action}`,

                user:
                    log.user,

                ipAddress:
                    log.ipAddress,

                createdAt:
                    log.createdAt

            })
        )

    ];


    // =====================================================
    // SORT GLOBAL HISTORY
    // =====================================================

    history.sort(

        (a, b) =>

            new Date(
                b.createdAt
            ).getTime()

            -

            new Date(
                a.createdAt
            ).getTime()

    );


    return history.slice(
        0,
        200
    );

}


// =====================================================
// GET HISTORY BY TYPE
// =====================================================

export async function getHistoryByType(
    type: string
) {

    const history =
        await getHistory();

    return history.filter(
        item =>
            item.type === type
    );

}


// =====================================================
// GET RECENT HISTORY
// =====================================================

export async function getRecentHistory(
    limit = 20
) {

    const history =
        await getHistory();

    return history.slice(
        0,
        limit
    );

}