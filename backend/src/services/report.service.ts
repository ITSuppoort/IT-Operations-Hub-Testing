import prisma from "../config/prisma";


// =====================================================
// REPORT SERVICE
// =====================================================
//
// Este servicio genera información consolidada para
// el módulo de REPORTES.
//
// Los datos se calculan directamente desde la base
// de datos.
//
// No modifica ningún registro.
//
// Las consultas se ejecutan de forma controlada y
// secuencial para evitar saturar el pool de conexiones
// de Supabase.
//
// =====================================================


// =====================================================
// EQUIPMENT REPORT
// =====================================================

export async function getEquipmentReport() {

    // -------------------------------------------------
    // Totales principales
    // -------------------------------------------------

    const total =
        await prisma.equipment.count();


    const active =
        await prisma.equipment.count({
            where: {
                status: "ACTIVE"
            }
        });


    const inactive =
        await prisma.equipment.count({
            where: {
                status: "INACTIVE"
            }
        });


    const available =
        await prisma.equipment.count({
            where: {
                condition: "AVAILABLE"
            }
        });


    const assigned =
        await prisma.equipment.count({
            where: {
                condition: "ASSIGNED"
            }
        });


    const damaged =
        await prisma.equipment.count({
            where: {
                condition: "DAMAGED"
            }
        });


    // -------------------------------------------------
    // Equipos por categoría
    // -------------------------------------------------

    const byCategory =
        await prisma.equipment.groupBy({

            by: [
                "category"
            ],

            _count: {
                id: true
            },

            orderBy: {
                category: "asc"
            }

        });


    // -------------------------------------------------
    // Equipos por departamento
    // -------------------------------------------------

    const byDepartment =
        await prisma.equipment.groupBy({

            by: [
                "departmentId"
            ],

            _count: {
                id: true
            },

            orderBy: {
                departmentId: "asc"
            }

        });


    return {

        total,

        active,

        inactive,

        available,

        assigned,

        damaged,

        byCategory,

        byDepartment

    };

}


// =====================================================
// COMPONENT REPORT
// =====================================================

export async function getComponentReport() {

    const components =
        await prisma.component.findMany({

            orderBy: {
                type: "asc"
            }

        });


    const totalTypes =
        components.length;


    const totalUnits =
        components.reduce(

            (total, component) =>
                total + component.quantity,

            0

        );


    const lowStock =
        components.filter(

            component =>
                component.quantity <=
                component.minimumStock

        );


    return {

        totalTypes,

        totalUnits,

        lowStockCount:
            lowStock.length,

        lowStock,

        components

    };

}


// =====================================================
// DAMAGE REPORT
// =====================================================

export async function getDamageReport() {

    // -------------------------------------------------
    // Ejecutamos los conteos de forma secuencial.
    // Esto evita abrir varias consultas simultáneas.
    // -------------------------------------------------

    const total =
        await prisma.damage.count();


    const open =
        await prisma.damage.count({

            where: {
                status: "OPEN"
            }

        });


    const inProgress =
        await prisma.damage.count({

            where: {
                status: "IN_PROGRESS"
            }

        });


    const repaired =
        await prisma.damage.count({

            where: {
                status: "REPAIRED"
            }

        });


    const cancelled =
        await prisma.damage.count({

            where: {
                status: "CANCELLED"
            }

        });


    const highPriority =
        await prisma.damage.count({

            where: {
                priority: "HIGH"
            }

        });


    return {

        total,

        open,

        inProgress,

        repaired,

        cancelled,

        highPriority

    };

}


// =====================================================
// MOVEMENT REPORT
// =====================================================

export async function getMovementReport() {

    const total =
        await prisma.movement.count();


    const movements =
        await prisma.movement.findMany({

            orderBy: {
                createdAt: "desc"
            },

            take: 100

        });


    return {

        total,

        recent: movements

    };

}


// =====================================================
// POSITION REPORT
// =====================================================

export async function getPositionReport() {

    const total =
        await prisma.position.count();


    const empty =
        await prisma.position.count({

            where: {
                status: "EMPTY"
            }

        });


    const occupied =
        await prisma.position.count({

            where: {
                status: {
                    not: "EMPTY"
                }
            }

        });


    return {

        total,

        empty,

        occupied

    };

}


// =====================================================
// GENERAL INVENTORY REPORT
// =====================================================
//
// Este es el reporte general que posteriormente puede
// alimentar una pantalla de Reportes o exportaciones.
//
// IMPORTANTE:
//
// Los módulos NO se ejecutan con Promise.all().
// Se procesan uno por uno para evitar saturar
// el pool de conexiones de Supabase.
//
// =====================================================

export async function getGeneralReport() {

    // -------------------------------------------------
    // EQUIPMENT
    // -------------------------------------------------

    const equipment =
        await getEquipmentReport();


    // -------------------------------------------------
    // COMPONENTS
    // -------------------------------------------------

    const components =
        await getComponentReport();


    // -------------------------------------------------
    // DAMAGES
    // -------------------------------------------------

    const damages =
        await getDamageReport();


    // -------------------------------------------------
    // MOVEMENTS
    // -------------------------------------------------

    const movements =
        await getMovementReport();


    // -------------------------------------------------
    // POSITIONS
    // -------------------------------------------------

    const positions =
        await getPositionReport();


    return {

        generatedAt:
            new Date(),

        equipment,

        components,

        damages,

        movements,

        positions

    };

}