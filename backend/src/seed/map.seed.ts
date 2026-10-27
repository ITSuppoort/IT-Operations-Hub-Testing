import prisma from "../config/prisma";

// =====================================================
// IT OPERATIONS HUB
// MAP STRUCTURE SEED
// =====================================================

async function main() {
    console.log("========================================");
    console.log("Starting map structure seed...");
    console.log("========================================");

    // =================================================
    // SÓTANO
    // =================================================

    const basement = await prisma.mapLocation.upsert({
        where: {
            id: "map-sotano",
        },
        update: {
            name: "Sótano",
            type: "BASEMENT",
            floorNumber: -1,
            wing: null,
            parentId: null,
        },
        create: {
            id: "map-sotano",
            name: "Sótano",
            type: "BASEMENT",
            floorNumber: -1,
        },
    });

    const basementSecurity = await prisma.mapLocation.upsert({
        where: {
            id: "map-sotano-security",
        },
        update: {
            name: "Seguridad / Observación",
            type: "AREA_CONTAINER",
            floorNumber: -1,
            wing: null,
            parentId: basement.id,
        },
        create: {
            id: "map-sotano-security",
            name: "Seguridad / Observación",
            type: "AREA_CONTAINER",
            floorNumber: -1,
            parentId: basement.id,
        },
    });

    await prisma.area.upsert({
        where: {
            id: "area-sotano-security",
        },
        update: {
            name: "Seguridad / Observación",
            locationId: basementSecurity.id,
        },
        create: {
            id: "area-sotano-security",
            name: "Seguridad / Observación",
            locationId: basementSecurity.id,
        },
    });

    // =================================================
    // PISO 1
    // =================================================

    const floor1 = await prisma.mapLocation.upsert({
        where: {
            id: "map-piso-1",
        },
        update: {
            name: "Piso 1",
            type: "FLOOR",
            floorNumber: 1,
            wing: null,
            parentId: null,
        },
        create: {
            id: "map-piso-1",
            name: "Piso 1",
            type: "FLOOR",
            floorNumber: 1,
        },
    });

    const floor1East = await prisma.mapLocation.upsert({
        where: {
            id: "map-piso-1-este",
        },
        update: {
            name: "Ala Este",
            type: "WING",
            floorNumber: 1,
            wing: "EAST",
            parentId: floor1.id,
        },
        create: {
            id: "map-piso-1-este",
            name: "Ala Este",
            type: "WING",
            floorNumber: 1,
            wing: "EAST",
            parentId: floor1.id,
        },
    });

    const floor1West = await prisma.mapLocation.upsert({
        where: {
            id: "map-piso-1-oeste",
        },
        update: {
            name: "Ala Oeste",
            type: "WING",
            floorNumber: 1,
            wing: "WEST",
            parentId: floor1.id,
        },
        create: {
            id: "map-piso-1-oeste",
            name: "Ala Oeste",
            type: "WING",
            floorNumber: 1,
            wing: "WEST",
            parentId: floor1.id,
        },
    });

    // Piso 1 - Este
    await createArea(
        "area-p1-este-gaming",
        "Gaming Room",
        floor1East.id
    );

    await createArea(
        "area-p1-este-comedor",
        "Comedor",
        floor1East.id
    );

    // Piso 1 - Oeste
    const floor1WestAreas = [
        ["area-p1-oeste-lobby", "Lobby"],
        ["area-p1-oeste-reclutamiento", "Reclutamiento"],
        ["area-p1-oeste-hr", "HR"],
        ["area-p1-oeste-gerente-hr", "Gerente de HR"],
        ["area-p1-oeste-director-hr", "Director de HR"],
        ["area-p1-oeste-vp-finanzas", "Vicepresidencia de Finanzas"],
        ["area-p1-oeste-presidente-finanzas", "Presidencia de Finanzas"],
        ["area-p1-oeste-conference", "Conference"],
        ["area-p1-oeste-ceo", "CEO"],
        ["area-p1-oeste-training-pod-1", "Training Pod 1"],
        ["area-p1-oeste-training-pod-2", "Training Pod 2"],
        ["area-p1-oeste-training-pod-3", "Training Pod 3"],
        ["area-p1-oeste-work-from-home", "Work From Home"],
    ] as const;

    for (const [id, name] of floor1WestAreas) {
        await createArea(id, name, floor1West.id);
    }

    // =================================================
    // PISO 2
    // =================================================

    const floor2 = await prisma.mapLocation.upsert({
        where: {
            id: "map-piso-2",
        },
        update: {
            name: "Piso 2",
            type: "FLOOR",
            floorNumber: 2,
            wing: null,
            parentId: null,
        },
        create: {
            id: "map-piso-2",
            name: "Piso 2",
            type: "FLOOR",
            floorNumber: 2,
        },
    });

    const floor2East = await prisma.mapLocation.upsert({
        where: {
            id: "map-piso-2-este",
        },
        update: {
            name: "Ala Este",
            type: "WING",
            floorNumber: 2,
            wing: "EAST",
            parentId: floor2.id,
        },
        create: {
            id: "map-piso-2-este",
            name: "Ala Este",
            type: "WING",
            floorNumber: 2,
            wing: "EAST",
            parentId: floor2.id,
        },
    });

    const floor2West = await prisma.mapLocation.upsert({
        where: {
            id: "map-piso-2-oeste",
        },
        update: {
            name: "Ala Oeste",
            type: "WING",
            floorNumber: 2,
            wing: "WEST",
            parentId: floor2.id,
        },
        create: {
            id: "map-piso-2-oeste",
            name: "Ala Oeste",
            type: "WING",
            floorNumber: 2,
            wing: "WEST",
            parentId: floor2.id,
        },
    });

    // Piso 2 - Este
    await createArea(
        "area-p2-este-compras",
        "Compras",
        floor2East.id
    );

    await createArea(
        "area-p2-este-engagement-comunicaciones",
        "Engagement / Comunicaciones / Marketing",
        floor2East.id
    );

    // Piso 2 - Oeste
    await createArea(
        "area-p2-oeste-it",
        "IT",
        floor2West.id
    );

    await createArea(
        "area-p2-oeste-training",
        "Training Room",
        floor2West.id
    );

    // =================================================
    // PISO 3
    // =================================================

    const floor3 = await prisma.mapLocation.upsert({
        where: {
            id: "map-piso-3",
        },
        update: {
            name: "Piso 3",
            type: "FLOOR",
            floorNumber: 3,
            wing: null,
            parentId: null,
        },
        create: {
            id: "map-piso-3",
            name: "Piso 3",
            type: "FLOOR",
            floorNumber: 3,
        },
    });

    const floor3East = await prisma.mapLocation.upsert({
        where: {
            id: "map-piso-3-este",
        },
        update: {
            name: "Ala Este",
            type: "WING",
            floorNumber: 3,
            wing: "EAST",
            parentId: floor3.id,
        },
        create: {
            id: "map-piso-3-este",
            name: "Ala Este",
            type: "WING",
            floorNumber: 3,
            wing: "EAST",
            parentId: floor3.id,
        },
    });

    const floor3West = await prisma.mapLocation.upsert({
        where: {
            id: "map-piso-3-oeste",
        },
        update: {
            name: "Ala Oeste",
            type: "WING",
            floorNumber: 3,
            wing: "WEST",
            parentId: floor3.id,
        },
        create: {
            id: "map-piso-3-oeste",
            name: "Ala Oeste",
            type: "WING",
            floorNumber: 3,
            wing: "WEST",
            parentId: floor3.id,
        },
    });

    // Piso 3 - Este
    await createArea(
        "area-p3-este-gerencia",
        "Gerencia",
        floor3East.id
    );

    await createArea(
        "area-p3-este-conference",
        "Conference Room",
        floor3East.id
    );

    await createArea(
        "area-p3-este-operaciones",
        "Operaciones",
        floor3East.id
    );

    // Piso 3 - Oeste
    await createArea(
        "area-p3-oeste-desarrollo",
        "Desarrollo",
        floor3West.id
    );

    await createArea(
        "area-p3-oeste-vp-pco",
        "VP / PCO",
        floor3West.id
    );

    await createArea(
        "area-p3-oeste-gerencia",
        "Gerencia",
        floor3West.id
    );

    await createArea(
        "area-p3-oeste-operaciones",
        "Operaciones",
        floor3West.id
    );

    // =================================================
    // PISO 4
    // =================================================

    const floor4 = await prisma.mapLocation.upsert({
        where: {
            id: "map-piso-4",
        },
        update: {
            name: "Piso 4",
            type: "FLOOR",
            floorNumber: 4,
            wing: null,
            parentId: null,
        },
        create: {
            id: "map-piso-4",
            name: "Piso 4",
            type: "FLOOR",
            floorNumber: 4,
        },
    });

    const floor4East = await prisma.mapLocation.upsert({
        where: {
            id: "map-piso-4-este",
        },
        update: {
            name: "Ala Este",
            type: "WING",
            floorNumber: 4,
            wing: "EAST",
            parentId: floor4.id,
        },
        create: {
            id: "map-piso-4-este",
            name: "Ala Este",
            type: "WING",
            floorNumber: 4,
            wing: "EAST",
            parentId: floor4.id,
        },
    });

    const floor4West = await prisma.mapLocation.upsert({
        where: {
            id: "map-piso-4-oeste",
        },
        update: {
            name: "Ala Oeste",
            type: "WING",
            floorNumber: 4,
            wing: "WEST",
            parentId: floor4.id,
        },
        create: {
            id: "map-piso-4-oeste",
            name: "Ala Oeste",
            type: "WING",
            floorNumber: 4,
            wing: "WEST",
            parentId: floor4.id,
        },
    });

    // Piso 4 - Este
    await createArea(
        "area-p4-este-administrativas",
        "Oficinas Administrativas",
        floor4East.id
    );

    await createArea(
        "area-p4-este-vp-operaciones",
        "VP / Senior VP Operaciones",
        floor4East.id
    );

    await createArea(
        "area-p4-este-qa",
        "QA",
        floor4East.id
    );

    await createArea(
        "area-p4-este-operaciones",
        "Operaciones",
        floor4East.id
    );

    // Piso 4 - Oeste
    await createArea(
        "area-p4-oeste-wellness",
        "Wellness",
        floor4West.id
    );

    await createArea(
        "area-p4-oeste-auditoria",
        "Auditoría",
        floor4West.id
    );

    await createArea(
        "area-p4-oeste-training",
        "Training",
        floor4West.id
    );

    await createArea(
        "area-p4-oeste-administrativa",
        "Oficina Administrativa",
        floor4West.id
    );

    await createArea(
        "area-p4-oeste-work-from-home",
        "Work From Home",
        floor4West.id
    );

    await createArea(
        "area-p4-oeste-operaciones",
        "Operaciones",
        floor4West.id
    );

    // =================================================
    // GARITAS
    // =================================================

    const gate1 = await prisma.mapLocation.upsert({
        where: {
            id: "map-garita-1",
        },
        update: {
            name: "Garita 1",
            type: "GATE",
            floorNumber: null,
            wing: null,
            parentId: null,
        },
        create: {
            id: "map-garita-1",
            name: "Garita 1",
            type: "GATE",
        },
    });

    const gate2 = await prisma.mapLocation.upsert({
        where: {
            id: "map-garita-2",
        },
        update: {
            name: "Garita 2",
            type: "GATE",
            floorNumber: null,
            wing: null,
            parentId: null,
        },
        create: {
            id: "map-garita-2",
            name: "Garita 2",
            type: "GATE",
        },
    });

    await createArea(
        "area-garita-1",
        "Acceso / Garita 1",
        gate1.id
    );

    await createArea(
        "area-garita-2",
        "Acceso / Garita 2",
        gate2.id
    );

    // =================================================
    // RESULT
    // =================================================

    const locations = await prisma.mapLocation.count();
    const areas = await prisma.area.count();

    console.log("");
    console.log("========================================");
    console.log("MAP STRUCTURE CREATED SUCCESSFULLY");
    console.log("========================================");
    console.log(`Map locations: ${locations}`);
    console.log(`Areas: ${areas}`);
    console.log("========================================");
}

// =====================================================
// HELPER
// =====================================================

async function createArea(
    id: string,
    name: string,
    locationId: string
) {
    return prisma.area.upsert({
        where: {
            id,
        },
        update: {
            name,
            locationId,
        },
        create: {
            id,
            name,
            locationId,
        },
    });
}

// =====================================================
// EXECUTION
// =====================================================

main()
    .catch((error) => {
        console.error("Map seed failed:");
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });