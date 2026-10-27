import prisma from "../config/prisma";


// =====================================================
// IT OPERATIONS HUB
// MAP OVERVIEW SERVICE
// =====================================================
//
// Este servicio obtiene toda la estructura necesaria
// para construir el mapa desde el frontend:
//
// MapLocation
//      ↓
// Area
//      ↓
// Position
//      ↓
// Equipment
//      ↓
// User
//
// IMPORTANTE:
//
// Este servicio es SOLO de lectura.
// No crea, modifica ni elimina información.
//
// =====================================================


// =====================================================
// GET COMPLETE MAP OVERVIEW
// =====================================================

export async function getMapOverview() {

    // =================================================
    // LOAD ALL MAP LOCATIONS
    // =================================================

    const locations =
        await prisma.mapLocation.findMany({

            orderBy: [

                {
                    floorNumber: "asc"
                },

                {
                    wing: "asc"
                },

                {
                    name: "asc"
                }

            ],

            include: {

                // =====================================
                // AREAS
                // =====================================

                areas: {

                    orderBy: {

                        name: "asc"

                    },

                    include: {

                        // =============================
                        // POSITIONS
                        // =============================

                        positions: {

                            orderBy: {

                                code: "asc"

                            },

                            include: {

                                // =========================
                                // ASSIGNED USER
                                // =========================

                                assignedUser: {

                                    select: {

                                        id: true,

                                        firstName: true,

                                        lastName: true,

                                        email: true

                                    }

                                },

                                // =========================
                                // EQUIPMENT
                                // =========================

                                equipment: {

                                    select: {

                                        id: true,

                                        category: true,

                                        brand: true,

                                        model: true,

                                        serial: true,

                                        assetTag: true,

                                        condition: true,

                                        status: true,

                                        assignedUserId: true,

                                        departmentId: true

                                    }

                                }

                            }

                        }

                    }

                }

            }

        });


    // =================================================
    // RETURN MAP STRUCTURE
    // =================================================

    return locations;

}


// =====================================================
// GET MAP SUMMARY
// =====================================================
//
// Devuelve estadísticas generales del mapa.
//
// Ejemplo:
//
// {
//     locations: 16,
//     areas: 39,
//     positions: 48,
//     occupiedPositions: 20,
//     emptyPositions: 28,
//     equipmentAssigned: 20
// }
//
// =====================================================

export async function getMapSummary() {

    // =================================================
    // COUNT LOCATIONS
    // =================================================

    const locations =
        await prisma.mapLocation.count();


    // =================================================
    // COUNT AREAS
    // =================================================

    const areas =
        await prisma.area.count();


    // =================================================
    // COUNT POSITIONS
    // =================================================

    const positions =
        await prisma.position.count();


    // =================================================
    // COUNT EMPTY POSITIONS
    // =================================================

    const emptyPositions =
        await prisma.position.count({

            where: {

                status: "EMPTY"

            }

        });


    // =================================================
    // COUNT OCCUPIED POSITIONS
    // =================================================

    const occupiedPositions =
        await prisma.position.count({

            where: {

                status: {
                    not: "EMPTY"
                }

            }

        });


    // =================================================
    // COUNT EQUIPMENT ASSIGNED TO POSITIONS
    // =================================================

    const equipmentAssigned =
        await prisma.equipment.count({

            where: {

                positionId: {
                    not: null
                }

            }

        });


    // =================================================
    // RETURN SUMMARY
    // =================================================

    return {

        locations,

        areas,

        positions,

        occupiedPositions,

        emptyPositions,

        equipmentAssigned

    };

}