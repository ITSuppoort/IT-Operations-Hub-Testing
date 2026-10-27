import prisma from "../config/prisma";

// ================================
// CREATE COMPONENT
// ================================

export async function createComponent(data: any) {
    return await prisma.component.create({
        data: {
            type: data.type,
            brand: data.brand ?? null,
            quantity: data.quantity ?? 0,
            minimumStock: data.minimumStock ?? 0
        }
    });
}


// ================================
// GET ALL COMPONENTS
// ================================

export async function getComponents() {
    return await prisma.component.findMany({
        orderBy: {
            createdAt: "desc"
        }
    });
}


// ================================
// GET COMPONENT BY ID
// ================================

export async function getComponentById(id: string) {
    return await prisma.component.findUnique({
        where: {
            id
        }
    });
}


// ================================
// UPDATE COMPONENT
// ================================

export async function updateComponent(
    id: string,
    data: any
) {
    return await prisma.component.update({
        where: {
            id
        },
        data: {
            type: data.type,
            brand: data.brand ?? null,
            quantity: data.quantity,
            minimumStock: data.minimumStock
        }
    });
}


// ================================
// DELETE COMPONENT
// ================================

export async function deleteComponent(id: string) {
    return await prisma.component.delete({
        where: {
            id
        }
    });
}