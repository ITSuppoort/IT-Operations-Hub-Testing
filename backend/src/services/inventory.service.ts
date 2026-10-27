import prisma from "../config/prisma";


// =====================================================
// INVENTORY SERVICE
// =====================================================
//
// Este servicio controla los cambios de stock.
//
// ENTRY
//      Entrada de inventario
//
// EXIT
//      Salida de inventario
//
// ADJUSTMENT
//      Ajuste manual del stock
//
// IMPORTANTE:
// Los cambios de cantidad y el registro del movimiento
// se realizan dentro de una misma transacción.
//
// =====================================================


// =====================================================
// CREATE INVENTORY ENTRY
// =====================================================
//
// Agrega unidades al stock.
//
// Ejemplo:
//
// Stock actual: 10
// Entrada:      5
// Nuevo stock:  15
//
// =====================================================

export async function createInventoryEntry(
    componentId: string,
    quantity: number,
    reason?: string,
    createdBy?: string
) {

    if (quantity <= 0) {

        throw new Error(
            "Quantity must be greater than zero"
        );

    }


    return await prisma.$transaction(async (tx) => {

        const component =
            await tx.component.findUnique({

                where: {
                    id: componentId
                }

            });


        if (!component) {

            throw new Error(
                "Component not found"
            );

        }


        const previousQuantity =
            component.quantity;


        const newQuantity =
            previousQuantity + quantity;


        const updatedComponent =
            await tx.component.update({

                where: {
                    id: componentId
                },

                data: {

                    quantity: newQuantity

                }

            });


        const movement =
            await tx.inventoryMovement.create({

                data: {

                    componentId,

                    type: "ENTRY",

                    quantity,

                    previousQuantity,

                    newQuantity,

                    reason,

                    createdBy

                }

            });


        return {

            component: updatedComponent,

            movement

        };

    });

}


// =====================================================
// CREATE INVENTORY EXIT
// =====================================================
//
// Retira unidades del stock.
//
// Ejemplo:
//
// Stock actual: 10
// Salida:       3
// Nuevo stock:  7
//
// No permitimos que el inventario quede negativo.
//
// =====================================================

export async function createInventoryExit(
    componentId: string,
    quantity: number,
    reason?: string,
    createdBy?: string
) {

    if (quantity <= 0) {

        throw new Error(
            "Quantity must be greater than zero"
        );

    }


    return await prisma.$transaction(async (tx) => {

        const component =
            await tx.component.findUnique({

                where: {
                    id: componentId
                }

            });


        if (!component) {

            throw new Error(
                "Component not found"
            );

        }


        const previousQuantity =
            component.quantity;


        if (quantity > previousQuantity) {

            throw new Error(
                "Insufficient stock"
            );

        }


        const newQuantity =
            previousQuantity - quantity;


        const updatedComponent =
            await tx.component.update({

                where: {
                    id: componentId
                },

                data: {

                    quantity: newQuantity

                }

            });


        const movement =
            await tx.inventoryMovement.create({

                data: {

                    componentId,

                    type: "EXIT",

                    quantity,

                    previousQuantity,

                    newQuantity,

                    reason,

                    createdBy

                }

            });


        return {

            component: updatedComponent,

            movement

        };

    });

}


// =====================================================
// CREATE INVENTORY ADJUSTMENT
// =====================================================
//
// Establece manualmente una nueva cantidad.
//
// Ejemplo:
//
// Stock registrado: 10
// Conteo físico:    8
// Nuevo stock:      8
//
// =====================================================

export async function createInventoryAdjustment(
    componentId: string,
    newQuantity: number,
    reason?: string,
    createdBy?: string
) {

    if (newQuantity < 0) {

        throw new Error(
            "Quantity cannot be negative"
        );

    }


    return await prisma.$transaction(async (tx) => {

        const component =
            await tx.component.findUnique({

                where: {
                    id: componentId
                }

            });


        if (!component) {

            throw new Error(
                "Component not found"
            );

        }


        const previousQuantity =
            component.quantity;


        const updatedComponent =
            await tx.component.update({

                where: {
                    id: componentId
                },

                data: {

                    quantity: newQuantity

                }

            });


        const movement =
            await tx.inventoryMovement.create({

                data: {

                    componentId,

                    type: "ADJUSTMENT",

                    quantity:
                        Math.abs(
                            newQuantity -
                            previousQuantity
                        ),

                    previousQuantity,

                    newQuantity,

                    reason,

                    createdBy

                }

            });


        return {

            component: updatedComponent,

            movement

        };

    });

}


// =====================================================
// GET ALL INVENTORY MOVEMENTS
// =====================================================

export async function getInventoryMovements() {

    return await prisma.inventoryMovement.findMany({

        orderBy: {

            createdAt: "desc"

        },

        include: {

            component: true

        }

    });

}


// =====================================================
// GET MOVEMENT HISTORY FOR ONE COMPONENT
// =====================================================

export async function getComponentInventoryHistory(
    componentId: string
) {

    return await prisma.inventoryMovement.findMany({

        where: {

            componentId

        },

        orderBy: {

            createdAt: "desc"

        },

        include: {

            component: true

        }

    });

}


// =====================================================
// GET LOW STOCK COMPONENTS
// =====================================================
//
// Devuelve componentes cuyo stock actual está por
// debajo o igual al mínimo configurado.
//
// =====================================================

export async function getLowStockComponents() {

    const components =
        await prisma.component.findMany({

            orderBy: {

                quantity: "asc"

            }

        });


    return components.filter(

        component =>
            component.quantity <=
            component.minimumStock

    );

}