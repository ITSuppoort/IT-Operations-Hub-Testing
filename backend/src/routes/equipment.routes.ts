import { Router } from "express";
import { create, list, getOne, update, remove } from "../controllers/equipment.controller";
import prisma from "../config/prisma";

const router = Router();

// Sólo lectura: vinculos individuales confirmados en posiciones.
// No inventa mouse, teclados ni cables por demanda calculada.
router.get("/position-usage", async (_req, res) => {
  try {
    const [positions, links, allocations] = await Promise.all([
      prisma.position.findMany({
        select: {
          id: true,
          code: true,
          location: { select: { name: true } },
          area: { select: { name: true } },
          equipment: { select: { id: true } },
        },
      }),
      prisma.$queryRaw<Array<{ equipment_id: string; position_id: string }>>`
        SELECT equipment_id, position_id FROM public.position_asset_links
      `,
      prisma.$queryRaw<Array<{ allocation_id: string; equipment_id: string; position_id: string }>>`
        SELECT id AS allocation_id, equipment_id, position_id
        FROM public.it_position_lot_allocation
        WHERE quantity > 0
      `,
    ]);
    const map = new Map<string, {equipmentId:string;positionCode:string;locationName:string}>();
    const detailsById = new Map(positions.map(p=>[p.id,p]));
    // Por ID de equipo: mismo accesorio no se cuenta dos veces.
    for (const position of positions) {
      if (!position.equipment?.id) continue;
      const locationName = [position.location?.name,position.area?.name,position.code].filter(Boolean).join(' · ');
      map.set(position.equipment.id,{equipmentId:position.equipment.id,positionCode:position.code,locationName});
    }
    for (const link of links) {
      const position=detailsById.get(link.position_id);
      if (!position || !link.equipment_id) continue;
      const locationName=[position.location?.name,position.area?.name,position.code].filter(Boolean).join(' · ');
      map.set(link.equipment_id,{equipmentId:link.equipment_id,positionCode:position.code,locationName});
    }
    // Unidades confirmadas: cada asignacion es una unidad real, aun cuando
    // varias unidades compartan el mismo equipment_id de un lote antiguo.
    // Si la misma pareja equipo/posicion tambien figura como link directo,
    // prevalece la asignacion para evitar duplicar la existencia.
    const allocationPairs = new Set(allocations.map(a => `${a.equipment_id}::${a.position_id}`));
    const allocationLinks: Array<{ equipmentId:string;positionCode:string;locationName:string;assignmentId:string }> = [];
    for (const allocation of allocations) {
      const position=detailsById.get(allocation.position_id);
      if (!position || !allocation.equipment_id) continue;
      const locationName=[position.location?.name,position.area?.name,position.code].filter(Boolean).join(' · ');
      allocationLinks.push({ equipmentId:allocation.equipment_id, positionCode:position.code, locationName, assignmentId:allocation.allocation_id });
    }
    const directLinks = [...map.values()].filter(v => {
      const position = positions.find(p => p.code === v.positionCode);
      return !position || !allocationPairs.has(`${v.equipmentId}::${position.id}`);
    });
    const values=[...directLinks,...allocationLinks];
    res.json({equipmentIds:[...new Set(values.map(v=>v.equipmentId))],links:values});
  } catch (error) {
    console.error('Error leyendo posiciones en uso',error);
    res.status(500).json({message:'No se pudieron consultar los vínculos de posiciones.'});
  }
});
router.post('/',create);
router.get('/',list);
router.get('/:id',getOne);
router.put('/:id',update);
router.delete('/:id',remove);
export default router;
