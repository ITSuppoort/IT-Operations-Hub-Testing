import prisma from "../config/prisma";


// =====================================================
// LOCATIONS
// =====================================================

export async function createLocation(data: any) {

    return await prisma.mapLocation.create({
        data
    });

}


export async function getLocations() {

    return await prisma.mapLocation.findMany({

        orderBy: [
            {
                floorNumber: "asc"
            },
            {
                name: "asc"
            }
        ],

        include: {

            children: true,

            areas: true,

            positions: true

        }

    });

}


export async function getLocationById(id: string) {

    return await prisma.mapLocation.findUnique({

        where: {
            id
        },

        include: {

            children: true,

            areas: {

                include: {

                    positions: true

                }

            },

            positions: true,

            equipment: true

        }

    });

}


export async function updateLocation(
    id: string,
    data: any
) {

    return await prisma.mapLocation.update({

        where: {
            id
        },

        data

    });

}


export async function deleteLocation(id: string) {

    return await prisma.mapLocation.delete({

        where: {
            id
        }

    });

}


// =====================================================
// AREAS
// =====================================================

export async function createArea(data: any) {

    return await prisma.area.create({

        data

    });

}


export async function getAreas() {

    return await prisma.area.findMany({

        orderBy: {
            name: "asc"
        },

        include: {

            location: true,

            positions: true

        }

    });

}


export async function getAreaById(id: string) {

    return await prisma.area.findUnique({

        where: {
            id
        },

        include: {

            location: true,

            positions: {

                include: {

                    equipment: true,

                    assignedUser: true

                }

            }

        }

    });

}


export async function updateArea(
    id: string,
    data: any
) {

    return await prisma.area.update({

        where: {
            id
        },

        data

    });

}


export async function deleteArea(id: string) {

    return await prisma.area.delete({

        where: {
            id
        }

    });

}


// =====================================================
// POSITIONS
// =====================================================

export async function createPosition(data: any) {

    return await prisma.position.create({

        data

    });

}


export async function getPositions() {

    return await prisma.position.findMany({

        orderBy: {
            code: "asc"
        },

        include: {

            location: true,

            area: true,

            assignedUser: true,

            equipment: true

        }

    });

}


export async function getPositionById(id: string) {

    return await prisma.position.findUnique({

        where: {
            id
        },

        include: {

            location: true,

            area: true,

            assignedUser: true,

            equipment: true

        }

    });

}


export async function updatePosition(
    id: string,
    data: any
) {

    return await prisma.position.update({

        where: {
            id
        },

        data

    });

}


export async function deletePosition(id: string) {

    return await prisma.position.delete({

        where: {
            id
        }

    });

}