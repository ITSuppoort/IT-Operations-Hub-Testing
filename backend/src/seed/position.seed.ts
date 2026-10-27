import prisma from "../config/prisma";


// =====================================================
// IT OPERATIONS HUB
// POSITION SEED
// =====================================================
//
// Este seed crea las posiciones físicas iniciales
// dentro de las áreas existentes del mapa.
//
// IMPORTANTE:
// - No crea MapLocations.
// - No crea Areas.
// - No crea Equipment.
// - No asigna usuarios.
// - Todas las posiciones comienzan como EMPTY.
// - Puede ejecutarse nuevamente sin duplicar posiciones.
//
// =====================================================


// =====================================================
// CONFIGURACIÓN
// =====================================================

type PositionDefinition = {
    code: string;
    name: string;
    areaId: string;
    locationId: string;
    wing?: string;
};


// =====================================================
// POSICIONES
// =====================================================
//
// Regla inicial:
//
// - 1 posición por área.
// - Training Room tiene 10 posiciones.
// - Todas comienzan EMPTY.
//
// Posteriormente podemos aumentar la cantidad
// de posiciones de cada área según el inventario físico.
//
// =====================================================

const positions: PositionDefinition[] = [

    // =================================================
    // SÓTANO
    // =================================================

    {
        code: "SOT-SEC-01",
        name: "Seguridad / Observación 01",
        areaId: "area-sotano-security",
        locationId: "map-sotano-security"
    },


    // =================================================
    // PISO 1 - ESTE
    // =================================================

    {
        code: "P1-E-GAM-01",
        name: "Gaming Room 01",
        areaId: "area-p1-este-gaming",
        locationId: "map-piso-1-este",
        wing: "EAST"
    },

    {
        code: "P1-E-COM-01",
        name: "Comedor 01",
        areaId: "area-p1-este-comedor",
        locationId: "map-piso-1-este",
        wing: "EAST"
    },


    // =================================================
    // PISO 1 - OESTE
    // =================================================

    {
        code: "P1-O-LOB-01",
        name: "Lobby 01",
        areaId: "area-p1-oeste-lobby",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },

    {
        code: "P1-O-REC-01",
        name: "Reclutamiento 01",
        areaId: "area-p1-oeste-reclutamiento",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },

    {
        code: "P1-O-HR-01",
        name: "HR 01",
        areaId: "area-p1-oeste-hr",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },

    {
        code: "P1-O-GHR-01",
        name: "Gerente de HR 01",
        areaId: "area-p1-oeste-gerente-hr",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },

    {
        code: "P1-O-DHR-01",
        name: "Director de HR 01",
        areaId: "area-p1-oeste-director-hr",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },

    {
        code: "P1-O-VPF-01",
        name: "Vicepresidencia de Finanzas 01",
        areaId: "area-p1-oeste-vp-finanzas",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },

    {
        code: "P1-O-PF-01",
        name: "Presidencia de Finanzas 01",
        areaId: "area-p1-oeste-presidente-finanzas",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },

    {
        code: "P1-O-CON-01",
        name: "Conference 01",
        areaId: "area-p1-oeste-conference",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },

    {
        code: "P1-O-CEO-01",
        name: "CEO 01",
        areaId: "area-p1-oeste-ceo",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },

    {
        code: "P1-O-TP1-01",
        name: "Training Pod 1 - 01",
        areaId: "area-p1-oeste-training-pod-1",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },

    {
        code: "P1-O-TP2-01",
        name: "Training Pod 2 - 01",
        areaId: "area-p1-oeste-training-pod-2",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },

    {
        code: "P1-O-TP3-01",
        name: "Training Pod 3 - 01",
        areaId: "area-p1-oeste-training-pod-3",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },

    {
        code: "P1-O-WFH-01",
        name: "Work From Home 01",
        areaId: "area-p1-oeste-work-from-home",
        locationId: "map-piso-1-oeste",
        wing: "WEST"
    },


    // =================================================
    // PISO 2 - ESTE
    // =================================================

    {
        code: "P2-E-COM-01",
        name: "Compras 01",
        areaId: "area-p2-este-compras",
        locationId: "map-piso-2-este",
        wing: "EAST"
    },

    {
        code: "P2-E-ENG-01",
        name: "Engagement / Comunicaciones / Marketing 01",
        areaId: "area-p2-este-engagement-comunicaciones",
        locationId: "map-piso-2-este",
        wing: "EAST"
    },


    // =================================================
    // PISO 2 - OESTE
    // =================================================

    {
        code: "P2-O-IT-01",
        name: "IT 01",
        areaId: "area-p2-oeste-it",
        locationId: "map-piso-2-oeste",
        wing: "WEST"
    },


    // =================================================
    // TRAINING ROOM
    // =================================================
    //
    // Se conocen específicamente 10 All in One.
    //

    {
        code: "P2-O-TR-01",
        name: "Training Room 01",
        areaId: "area-p2-oeste-training",
        locationId: "map-piso-2-oeste",
        wing: "WEST"
    },

    {
        code: "P2-O-TR-02",
        name: "Training Room 02",
        areaId: "area-p2-oeste-training",
        locationId: "map-piso-2-oeste",
        wing: "WEST"
    },

    {
        code: "P2-O-TR-03",
        name: "Training Room 03",
        areaId: "area-p2-oeste-training",
        locationId: "map-piso-2-oeste",
        wing: "WEST"
    },

    {
        code: "P2-O-TR-04",
        name: "Training Room 04",
        areaId: "area-p2-oeste-training",
        locationId: "map-piso-2-oeste",
        wing: "WEST"
    },

    {
        code: "P2-O-TR-05",
        name: "Training Room 05",
        areaId: "area-p2-oeste-training",
        locationId: "map-piso-2-oeste",
        wing: "WEST"
    },

    {
        code: "P2-O-TR-06",
        name: "Training Room 06",
        areaId: "area-p2-oeste-training",
        locationId: "map-piso-2-oeste",
        wing: "WEST"
    },

    {
        code: "P2-O-TR-07",
        name: "Training Room 07",
        areaId: "area-p2-oeste-training",
        locationId: "map-piso-2-oeste",
        wing: "WEST"
    },

    {
        code: "P2-O-TR-08",
        name: "Training Room 08",
        areaId: "area-p2-oeste-training",
        locationId: "map-piso-2-oeste",
        wing: "WEST"
    },

    {
        code: "P2-O-TR-09",
        name: "Training Room 09",
        areaId: "area-p2-oeste-training",
        locationId: "map-piso-2-oeste",
        wing: "WEST"
    },

    {
        code: "P2-O-TR-10",
        name: "Training Room 10",
        areaId: "area-p2-oeste-training",
        locationId: "map-piso-2-oeste",
        wing: "WEST"
    },


    // =================================================
    // PISO 3 - ESTE
    // =================================================

    {
        code: "P3-E-GER-01",
        name: "Gerencia 01",
        areaId: "area-p3-este-gerencia",
        locationId: "map-piso-3-este",
        wing: "EAST"
    },

    {
        code: "P3-E-CON-01",
        name: "Conference Room 01",
        areaId: "area-p3-este-conference",
        locationId: "map-piso-3-este",
        wing: "EAST"
    },

    {
        code: "P3-E-OPS-01",
        name: "Operaciones 01",
        areaId: "area-p3-este-operaciones",
        locationId: "map-piso-3-este",
        wing: "EAST"
    },


    // =================================================
    // PISO 3 - OESTE
    // =================================================

    {
        code: "P3-O-DEV-01",
        name: "Desarrollo 01",
        areaId: "area-p3-oeste-desarrollo",
        locationId: "map-piso-3-oeste",
        wing: "WEST"
    },

    {
        code: "P3-O-VP-01",
        name: "VP / PCO 01",
        areaId: "area-p3-oeste-vp-pco",
        locationId: "map-piso-3-oeste",
        wing: "WEST"
    },

    {
        code: "P3-O-GER-01",
        name: "Gerencia 01",
        areaId: "area-p3-oeste-gerencia",
        locationId: "map-piso-3-oeste",
        wing: "WEST"
    },

    {
        code: "P3-O-OPS-01",
        name: "Operaciones 01",
        areaId: "area-p3-oeste-operaciones",
        locationId: "map-piso-3-oeste",
        wing: "WEST"
    },


    // =================================================
    // PISO 4 - ESTE
    // =================================================

    {
        code: "P4-E-ADM-01",
        name: "Oficinas Administrativas 01",
        areaId: "area-p4-este-administrativas",
        locationId: "map-piso-4-este",
        wing: "EAST"
    },

    {
        code: "P4-E-VP-OPS-01",
        name: "VP / Senior VP Operaciones 01",
        areaId: "area-p4-este-vp-operaciones",
        locationId: "map-piso-4-este",
        wing: "EAST"
    },

    {
        code: "P4-E-QA-01",
        name: "QA 01",
        areaId: "area-p4-este-qa",
        locationId: "map-piso-4-este",
        wing: "EAST"
    },

    {
        code: "P4-E-OPS-01",
        name: "Operaciones 01",
        areaId: "area-p4-este-operaciones",
        locationId: "map-piso-4-este",
        wing: "EAST"
    },


    // =================================================
    // PISO 4 - OESTE
    // =================================================

    {
        code: "P4-O-WEL-01",
        name: "Wellness 01",
        areaId: "area-p4-oeste-wellness",
        locationId: "map-piso-4-oeste",
        wing: "WEST"
    },

    {
        code: "P4-O-AUD-01",
        name: "Auditoría 01",
        areaId: "area-p4-oeste-auditoria",
        locationId: "map-piso-4-oeste",
        wing: "WEST"
    },

    {
        code: "P4-O-TRA-01",
        name: "Training 01",
        areaId: "area-p4-oeste-training",
        locationId: "map-piso-4-oeste",
        wing: "WEST"
    },

    {
        code: "P4-O-ADM-01",
        name: "Oficina Administrativa 01",
        areaId: "area-p4-oeste-administrativa",
        locationId: "map-piso-4-oeste",
        wing: "WEST"
    },

    {
        code: "P4-O-WFH-01",
        name: "Work From Home 01",
        areaId: "area-p4-oeste-work-from-home",
        locationId: "map-piso-4-oeste",
        wing: "WEST"
    },

    {
        code: "P4-O-OPS-01",
        name: "Operaciones 01",
        areaId: "area-p4-oeste-operaciones",
        locationId: "map-piso-4-oeste",
        wing: "WEST"
    },


    // =================================================
    // GARITAS
    // =================================================

    {
        code: "GAR-01",
        name: "Garita 1",
        areaId: "area-garita-1",
        locationId: "map-garita-1"
    },

    {
        code: "GAR-02",
        name: "Garita 2",
        areaId: "area-garita-2",
        locationId: "map-garita-2"
    }

];


// =====================================================
// MAIN SEED
// =====================================================

async function main() {

    console.log("========================================");
    console.log("Starting position structure seed...");
    console.log("========================================");
    console.log("");


    let created = 0;
    let existing = 0;


    // =================================================
    // VALIDATE AREAS
    // =================================================

    for (const position of positions) {

        const area = await prisma.area.findUnique({

            where: {
                id: position.areaId
            }

        });


        if (!area) {

            throw new Error(
                `Area not found: ${position.areaId}`
            );

        }

    }


    // =================================================
    // CREATE POSITIONS
    // =================================================

    for (const position of positions) {

        const existingPosition =
            await prisma.position.findUnique({

                where: {
                    code: position.code
                }

            });


        if (existingPosition) {

            existing++;

            continue;

        }


        await prisma.position.create({

            data: {

                code: position.code,

                name: position.name,

                locationId: position.locationId,

                areaId: position.areaId,

                wing: position.wing,

                status: "EMPTY"

            }

        });


        created++;

    }


    // =================================================
    // SUMMARY
    // =================================================

    console.log("");
    console.log("========================================");
    console.log("POSITION STRUCTURE CREATED SUCCESSFULLY");
    console.log("========================================");

    console.log(
        `Positions configured: ${positions.length}`
    );

    console.log(
        `Positions created: ${created}`
    );

    console.log(
        `Positions already existed: ${existing}`
    );

    console.log("========================================");

}


// =====================================================
// EXECUTION
// =====================================================

main()

    .catch((error) => {

        console.error("");
        console.error("========================================");
        console.error("POSITION SEED FAILED");
        console.error("========================================");

        console.error(error);

        process.exit(1);

    })

    .finally(async () => {

        await prisma.$disconnect();

    });