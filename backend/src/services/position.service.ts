import prisma from "../config/prisma";


// =====================================================
// CREATE POSITION
// =====================================================

export async function createPosition(data: any) {

    return await prisma.position.create({

        data

    });

}


// =====================================================
// GET ALL POSITIONS
// =====================================================

export async function getPositions() {

    return await prisma.position.findMany({

        orderBy: {
            code: "asc"
        },

        include: {

            location: true,

            area: true,

            assignedUser: true,
            inventoryPerson: true,

            equipment: true

        }

    });

}


// =====================================================
// GET POSITION BY ID
// =====================================================

export async function getPositionById(
    id: string
) {

    return await prisma.position.findUnique({

        where: {
            id
        },

        include: {

            location: true,

            area: true,

            assignedUser: true,
            inventoryPerson: true,

            equipment: true

        }

    });

}


// =====================================================
// UPDATE POSITION
// =====================================================

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


// =====================================================
// DELETE POSITION
// =====================================================

export async function deletePosition(
    id: string
) {

    return await prisma.position.delete({

        where: {
            id
        }

    });

}


// =====================================================
// GENERATE MULTIPLE POSITIONS
// =====================================================

export async function generatePositions(data: {

    locationId: string;

    areaId: string;

    prefix: string;

    quantity: number;

    startNumber?: number;

    wing?: string;

}) {

    const {
        locationId,
        areaId,
        prefix,
        quantity,
        startNumber = 1,
        wing
    } = data;


    // =================================================
    // VALIDATE QUANTITY
    // =================================================

    if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 500
    ) {

        throw new Error(
            "Quantity must be between 1 and 500"
        );

    }


    // =================================================
    // VALIDATE PREFIX
    // =================================================

    const cleanPrefix =
        prefix
            .trim()
            .toUpperCase();


    if (!cleanPrefix) {

        throw new Error(
            "Prefix is required"
        );

    }


    // =================================================
    // CHECK LOCATION
    // =================================================

    const location =
        await prisma.mapLocation.findUnique({

            where: {
                id: locationId
            }

        });


    if (!location) {

        throw new Error(
            "Map location not found"
        );

    }


    // =================================================
    // CHECK AREA
    // =================================================

    const area =
        await prisma.area.findUnique({

            where: {
                id: areaId
            }

        });


    if (!area) {

        throw new Error(
            "Area not found"
        );

    }


    // =================================================
    // VALIDATE AREA / LOCATION RELATION
    // =================================================

    if (
        area.locationId !== locationId
    ) {

        throw new Error(
            "Area does not belong to the selected location"
        );

    }


    // =================================================
    // BUILD POSITIONS
    // =================================================

    const positions = [];

    for (
        let i = 0;
        i < quantity;
        i++
    ) {

        const number =
            startNumber + i;


        const code =
            `${cleanPrefix}-${String(number).padStart(3, "0")}`;


        positions.push({

            code,

            name:
                `Position ${code}`,

            locationId,

            areaId,

            wing:
                wing ||
                location.wing ||
                null,

            status:
                "EMPTY"

        });

    }


    // =================================================
    // CHECK EXISTING CODES
    // =================================================

    const codes =
        positions.map(
            position => position.code
        );


    const existing =
        await prisma.position.findMany({

            where: {

                code: {
                    in: codes
                }

            },

            select: {

                code: true

            }

        });


    if (existing.length > 0) {

        const existingCodes =
            existing.map(
                position => position.code
            );


        throw new Error(
            `The following position codes already exist: ${existingCodes.join(", ")}`
        );

    }


    // =================================================
    // CREATE POSITIONS IN TRANSACTION
    // =================================================

    return await prisma.$transaction(

        positions.map(
            position =>
                prisma.position.create({

                    data: position

                })
        )

    );

}