import prisma from "../config/prisma";


// ================================
// CREATE MOVEMENT
// ================================

export async function createMovement(data: any) {

    return await prisma.movement.create({

        data: {
            equipmentId: data.equipmentId,
            action: data.action,
            fromLocation: data.fromLocation ?? null,
            toLocation: data.toLocation ?? null,
            assignedUser: data.assignedUser ?? null,
            createdBy: data.createdBy ?? null
        }

    });

}


// ================================
// GET ALL MOVEMENTS
// ================================

export async function getMovements() {

    return await prisma.movement.findMany({

        orderBy: {
            createdAt: "desc"
        },

        include: {
            equipment: true
        }

    });

}


// ================================
// GET MOVEMENT BY ID
// ================================

export async function getMovementById(
    id: string
) {

    return await prisma.movement.findUnique({

        where: {
            id
        },

        include: {
            equipment: true
        }

    });

}


// ================================
// DELETE MOVEMENT
// ================================

export async function deleteMovement(
    id: string
) {

    return await prisma.movement.delete({

        where: {
            id
        }

    });

}