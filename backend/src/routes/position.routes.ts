import { Router } from "express";
import { randomUUID } from "crypto";
import prisma from "../config/prisma";

import {
    create,
    generate,
    list,
    getOne,
    update,
    remove
} from "../controllers/position.controller";


const router = Router();


// =====================================================
// CREATE ONE POSITION
// =====================================================

// Registro controlado de una posición individual. No crea usuarios ni mueve equipos.
router.post("/manual", async (req, res) => {
  try {
    const code = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const areaName = typeof req.body?.areaName === "string" ? req.body.areaName.trim().toUpperCase() : "";
    const wing = typeof req.body?.wing === "string" ? req.body.wing.trim().toUpperCase() : "";
    const floor = req.body?.floorNumber;
    if (!/^[A-Z0-9 -]{1,70}$/.test(code) || !areaName || areaName.length > 80 || !["WEST", "EAST", "CENTRAL", "OTRA"].includes(wing) || !Number.isInteger(floor) || floor < 0 || floor > 4 || name.length > 100) {
      return res.status(400).json({ message: "Datos inválidos: verifica código, piso, división y área." });
    }
    // ID único por piso y división; nunca depender solo de un código repetido.
    const uniqueCode = `P${floor}-${wing}-${code}`;
    const output = await prisma.$transaction(async tx => {
      const exists = await tx.position.findUnique({ where: { code: uniqueCode } });
      if (exists) return { duplicate: true, position: null };
      const locationName = `Piso ${floor} - ${wing}`;
      let location = await tx.mapLocation.findFirst({ where: { name: locationName, floorNumber: floor, wing } });
      if (!location) location = await tx.mapLocation.create({ data: { name: locationName, type: "FLOOR_WING", floorNumber: floor, wing } });
      let area = await tx.area.findFirst({ where: { locationId: location.id, name: areaName } });
      if (!area) area = await tx.area.create({ data: { locationId: location.id, name: areaName } });
      const position = await tx.position.create({ data: { code: uniqueCode, name: name || code, locationId: location.id, areaId: area.id, wing, status: "PENDING_VERIFICATION" } });
      return { duplicate: false, position };
    });
    if (output.duplicate) return res.status(409).json({ message: "Esta posición ya existe en ese piso y división." });
    return res.status(201).json(output.position);
  } catch (error) {
    console.error("Manual position creation failed", error);
    return res.status(500).json({ message: "No se pudo registrar la posición. Revisa el backend." });
  }
});

// F1E: edit location metadata only. Never moves stock, equipment or employees.
router.patch("/:id/metadata", async (req, res) => {
  try {
    const id = String(req.params.id || "");
    const rawCode = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase() : "";
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const areaName = typeof req.body?.areaName === "string" ? req.body.areaName.trim().toUpperCase() : "";
    const wing = typeof req.body?.wing === "string" ? req.body.wing.trim().toUpperCase() : "";
    const floor = req.body?.floorNumber;
    if (!/^[A-Z0-9 -]{1,70}$/.test(rawCode) || !areaName || areaName.length > 80 || name.length > 100 || !["WEST","EAST","CENTRAL","OTRA"].includes(wing) || !Number.isInteger(floor) || floor < 0 || floor > 4) {
      return res.status(400).json({message:"Verifica código, piso, división y área."});
    }
    // Legacy Piso 1 Central positions may be renamed with a full P1-ADMIN-## code.
    // Keep the canonical generated format for all other positions.
    const previousForCode = await prisma.position.findUnique({where:{id},select:{code:true}});
    if (!previousForCode) return res.status(404).json({message:"Posición no encontrada."});
    if (previousForCode.code.toUpperCase().startsWith("P2O-")) return res.status(403).json({message:"Los códigos oficiales P2O están protegidos contra renombrado."});
    const legacyAdminCode = previousForCode.code.startsWith("P1-CENTRAL-") && floor === 1 && wing === "CENTRAL" && /^P1-ADMIN-[0-9]{2}$/.test(rawCode);
    const uniqueCode = legacyAdminCode ? rawCode : `P${floor}-${wing}-${rawCode}`;
    const result = await prisma.$transaction(async tx => {
      const previous = await tx.position.findUnique({where:{id},select:{id:true}});
      if (!previous) return {kind:"missing"};
      const duplicate = await tx.position.findFirst({where:{code:uniqueCode,id:{not:id}},select:{id:true}});
      if (duplicate) return {kind:"duplicate"};
      const locationName = `Piso ${floor} - ${wing}`;
      let location = await tx.mapLocation.findFirst({where:{name:locationName,floorNumber:floor,wing}});
      if (!location) location = await tx.mapLocation.create({data:{name:locationName,type:"FLOOR_WING",floorNumber:floor,wing}});
      let area = await tx.area.findFirst({where:{locationId:location.id,name:areaName}});
      if (!area) area = await tx.area.create({data:{locationId:location.id,name:areaName}});
      const position = await tx.position.update({where:{id},data:{code:uniqueCode,name:name||rawCode,locationId:location.id,areaId:area.id,wing}});
      return {kind:"ok",position};
    });
    if (result.kind === "missing") return res.status(404).json({message:"Posición no encontrada."});
    if (result.kind === "duplicate") return res.status(409).json({message:"Ya existe una posición con ese código en ese piso y división."});
    return res.json(result.position);
  } catch (e) {
    console.error("Position metadata edit failed",e);
    return res.status(500).json({message:"No se pudo editar la posición. Verifica el backend."});
  }
});

router.post(
    "/",
    create
);


// =====================================================
// GENERATE MULTIPLE POSITIONS
// =====================================================

router.post(
    "/generate",
    generate
);


// =====================================================
// GET ALL POSITIONS
// =====================================================

router.get(
    "/",
    list
);


// =====================================================
// GET ONE POSITION
// =====================================================

router.patch("/:id/person", async (req, res) => {
  try {
    const id = String(req.params.id);
    const personId: unknown = req.body?.inventoryPersonId;
    if (personId !== null && (typeof personId !== "string" || !personId.trim())) {
      return res.status(400).json({ message: "ID de persona inválido" });
    }
    const result = await prisma.$transaction(async tx => {
      const position = await tx.position.findUnique({ where: { id } });
      if (!position) return { status: 404, message: "Posición no encontrada", data: null };
      if (personId !== null) {
        const person = await tx.inventoryPerson.findUnique({ where: { id: personId as string } });
        if (!person || person.status !== "ACTIVE") return { status: 400, message: "Persona inexistente o inactiva", data: null };
        const previous = await tx.position.findFirst({ where: { inventoryPersonId: personId as string, id: { not: id } }, select: { code: true } });
        if (previous) return { status: 409, message: `El usuario ya ocupa ${previous.code}`, data: null };
      }
      await tx.position.update({ where: { id }, data: { inventoryPersonId: personId as string | null, userCell: null } });
      const updated = await tx.position.findUnique({ where: { id }, include: { inventoryPerson: true, location: true, area: true, equipment: true } });
      return { status: 200, message: "", data: updated };
    });
    if (result.status !== 200) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (error) {
    console.error("Position person assignment failed", error);
    return res.status(500).json({ message: "No se pudo modificar la asignación" });
  }
});


// FASE 5: vínculo de un equipo principal individual por posición.
// No cambia cantidades, condición, ubicación física o usuario; mantiene historial.
router.patch("/:id/equipment", async (req, res) => {
  try {
    const id = String(req.params.id);
    const equipmentId: unknown = req.body?.equipmentId;
    if (equipmentId !== null && (typeof equipmentId !== "string" || !equipmentId.trim())) {
      return res.status(400).json({ message: "Selecciona un activo válido o desvincular." });
    }
    const result = await prisma.$transaction(async tx => {
      const position = await tx.position.findUnique({ where: { id }, include: { equipment: true } });
      if (!position) return { status: 404, message: "Posición no encontrada", data: null };
      const prior = position.equipment;
      if ((prior?.id || null) === equipmentId) return { status: 409, message: "No hay ningún cambio que aplicar", data: null };
      let replacement: typeof prior = null;
      if (equipmentId !== null) {
        replacement = await tx.equipment.findUnique({ where: { id: equipmentId as string } });
        if (!replacement) return { status: 404, message: "Activo no encontrado en Inventario", data: null };
        if (replacement.quantity !== 1) return { status: 409, message: "Los lotes requieren gestión de cantidades. Selecciona un equipo individual.", data: null };
        if (replacement.positionId && replacement.positionId !== id) return { status: 409, message: "Ese activo ya está vinculado a otra posición", data: null };
        const state = (replacement.condition || "").toUpperCase();
        if (["DAMAGED", "RETIRED", "DISCARDED", "SCRAPPED", "IN_REPAIR", "REPAIR"].includes(state) || (replacement.status || "").toUpperCase() === "RETIRED") {
          return { status: 409, message: "No puedes asignar un equipo dañado o retirado", data: null };
        }
      }
      if (prior) {
        await tx.equipment.update({ where: { id: prior.id }, data: { positionId: null } });
        await tx.movement.create({ data: { equipmentId: prior.id, action: "POSITION_UNLINK", fromLocation: position.code, toLocation: prior.location || "Sin ubicación registrada", createdBy: "USUARIOS_POSICIONES" } });
      }
      if (replacement) {
        await tx.equipment.update({ where: { id: replacement.id }, data: { positionId: id } });
        await tx.movement.create({ data: { equipmentId: replacement.id, action: "POSITION_LINK", fromLocation: replacement.location || "Sin ubicación registrada", toLocation: position.code, createdBy: "USUARIOS_POSICIONES" } });
      }
      await tx.historyEntry.create({ data: { module: "POSITIONS", entityType: "POSITION", entityId: id, action: "EQUIPMENT_LINK_CHANGED", description: `Equipo principal ${prior?.pcName || prior?.serial || prior?.id || "Sin equipo"} → ${replacement?.pcName || replacement?.serial || replacement?.id || "Sin equipo"}`, oldData: { equipmentId: prior?.id || null }, newData: { equipmentId: replacement?.id || null } } });
      const updated = await tx.position.findUnique({ where: { id }, include: { location: true, area: true, inventoryPerson: true, equipment: true } });
      return { status: 200, message: "", data: updated };
    }, { isolationLevel: "Serializable", timeout: 10000 });
    if (result.status !== 200) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (error) {
    console.error("Position equipment linking failed", error);
    return res.status(409).json({ message: "No se pudo vincular el activo. Actualiza la lista y vuelve a intentar." });
  }
});


// FASE 6: accesorios individuales vinculados sin modificar el equipo principal.
// Requiere tabla position_asset_links (SQL de migración adjunto).
// Server-side category gate. Never trust a role sent by the browser.
function classifyAccessoryText(category: string): string {
  const c = (category || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/MONITOR|DISPLAY|PANTALLA/.test(c)) return 'MONITOR';
  if (/KEYBOARD|TECLADO/.test(c)) return 'KEYBOARD';
  if (/MOUSE|RATON/.test(c)) return 'MOUSE';
  if (/HEADSET|HEADPHONE|AURICULAR|DIADEMA|AUDIFONO/.test(c)) return 'HEADSET';
  if (/WEBCAM|WEB.?CAM|CAMARA/.test(c)) return 'WEBCAM';
  if (/\bUPS\b|NO.?BREAK/.test(c)) return 'UPS';
  if (/DESKTOP|LAPTOP|NOTEBOOK|ALL.?IN.?ONE|COMPUTER|COMPUTADORA|\bPC\b/.test(c)) return 'MAIN';
  return 'OTHER';
}
function accessoryCategory(category: string, type?: string | null): string {
  const explicitCategory = classifyAccessoryText(category);
  return explicitCategory !== 'OTHER' ? explicitCategory : classifyAccessoryText(type || '');
}
type AccessoryRow = { id: string; equipmentId: string; role: string; category: string; brand: string; model: string | null; serial: string | null; pcName: string | null; quantity: number };
const isMissingTable = (e: unknown) => String(e).includes('42P01') || String(e).includes('position_asset_links');
router.get('/:id/accessories', async (req, res) => {
  try {
    const id = String(req.params.id);
    const exists = await prisma.position.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return res.status(404).json({ message: 'Posición no encontrada' });
    const rows = await prisma.$queryRaw<AccessoryRow[]>`
      SELECT l.id, l.equipment_id AS "equipmentId", l.role,
             e.category, e.brand, e.model, e.serial, e."pcName", e.quantity
      FROM position_asset_links l JOIN "Equipment" e ON e.id = l.equipment_id
      WHERE l.position_id = ${id} ORDER BY l.created_at ASC`;
    return res.json(rows);
  } catch (error) {
    console.error('Position accessories read failed', error);
    return res.status(isMissingTable(error) ? 503 : 500).json({ message: 'Accesorios no disponibles. Comprueba si se aplicó la migración SQL de Fase 6.' });
  }
});
router.post('/:id/accessories', async (req, res) => {
  const id = String(req.params.id);
  const equipmentId = typeof req.body?.equipmentId === 'string' ? req.body.equipmentId.trim() : '';
  const role = typeof req.body?.role === 'string' ? req.body.role.trim().toUpperCase() : '';
  const roles = ['MONITOR','KEYBOARD','MOUSE','HEADSET','WEBCAM','UPS','OTHER'];
  if (!equipmentId || !roles.includes(role)) return res.status(400).json({ message: 'Selecciona un accesorio y su tipo.' });
  try {
    const result = await prisma.$transaction(async tx => {
      const position = await tx.position.findUnique({ where: { id }, include: { equipment: true } });
      if (!position) return { status: 404, message: 'Posición no encontrada' };
      const eq = await tx.equipment.findUnique({ where: { id: equipmentId } });
      if (!eq) return { status: 404, message: 'Activo no encontrado' };
      if (eq.quantity !== 1) return { status: 409, message: 'Lote no permitido: esta fase solo admite activos individuales de cantidad 1.' };
      if (accessoryCategory(eq.category, eq.type) !== role) return { status: 422, message: 'Categoria no coincide: el activo es ' + eq.category + ' / ' + (eq.type || 'sin tipo') + ' y seleccionaste ' + role + '.' };
      if (eq.positionId || position.equipment?.id === equipmentId) return { status: 409, message: 'Este activo ya es equipo principal de una posición.' };
      if (['DAMAGED','RETIRED','DISCARDED','SCRAPPED','IN_REPAIR','REPAIR'].includes((eq.condition || '').toUpperCase()) || (eq.status || '').toUpperCase() === 'RETIRED') return { status: 409, message: 'Equipo dañado o retirado no asignable.' };
      const found = await tx.$queryRaw<Array<{id: string}>>`SELECT id FROM position_asset_links WHERE equipment_id = ${equipmentId} LIMIT 1`;
      if (found.length) return { status: 409, message: 'Este activo ya está vinculado como accesorio.' };
      const linkId = randomUUID();
      await tx.$executeRaw`INSERT INTO position_asset_links (id, position_id, equipment_id, role) VALUES (${linkId}, ${id}, ${equipmentId}, ${role})`;
      await tx.historyEntry.create({ data: { module: 'POSITIONS', entityType: 'POSITION', entityId: id, action: 'ACCESSORY_LINK', description: `Accesorio ${role}: ${eq.pcName || eq.serial || eq.brand} vinculado a ${position.code}`, newData: { equipmentId, role } } });
      return { status: 201, message: '' };
    }, { isolationLevel: 'Serializable', timeout: 10000 });
    return res.status(result.status).json(result.status === 201 ? { ok: true } : { message: result.message });
  } catch (error) {
    console.error('Position accessory link failed', error);
    return res.status(isMissingTable(error) ? 503 : 409).json({ message: isMissingTable(error) ? 'Falta aplicar migración de Fase 6.' : 'No se pudo vincular; actualiza la lista y verifica que el equipo siga disponible.' });
  }
});
router.delete('/:id/accessories/:linkId', async (req, res) => {
  const id = String(req.params.id), linkId = String(req.params.linkId);
  try {
    const result = await prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw<Array<{equipmentId:string; role:string}>>`SELECT equipment_id AS "equipmentId", role FROM position_asset_links WHERE id = ${linkId} AND position_id = ${id} LIMIT 1`;
      if (!rows.length) return false;
      await tx.$executeRaw`DELETE FROM position_asset_links WHERE id = ${linkId} AND position_id = ${id}`;
      await tx.historyEntry.create({ data: { module: 'POSITIONS', entityType: 'POSITION', entityId: id, action: 'ACCESSORY_UNLINK', description: `Accesorio ${rows[0].role} desvinculado`, oldData: { equipmentId: rows[0].equipmentId, role: rows[0].role } } });
      return true;
    }, { isolationLevel: 'Serializable', timeout: 10000 });
    return result ? res.json({ ok: true }) : res.status(404).json({ message: 'Vínculo no encontrado' });
  } catch (error) {
    console.error('Position accessory unlink failed', error);
    return res.status(isMissingTable(error) ? 503 : 409).json({ message: 'No se pudo desvincular el accesorio.' });
  }
});


// FASE 1: revision fisica PERSISTENTE. No mueve existencias ni certifica el estado oficial.
const reviewKeys = ["computer","monitor","mouse","keyboard","power","video","network","strip","charger"] as const;
const exceptionKeys = ["monitor","power","video"] as const;
router.get("/checklist-review-summary", async (_req,res)=>{
  try {
    const rows=await prisma.$queryRaw<Array<{position_id:string;counts:unknown;profile:string;completed:number;total:number;updated_at:Date}>>`
      SELECT position_id,counts,profile,completed,total,updated_at FROM public.it_position_checklist_review`;
    return res.json(rows.map(row=>({positionId:row.position_id,counts:row.counts,profile:row.profile,completed:row.completed,total:row.total,updatedAt:row.updated_at})));
  }catch(error){console.error('Checklist summary failed',error);return res.status(503).json({message:'Revisiones no disponibles'});}
});
router.get("/:id/checklist-review", async (req, res) => {
  try {
    const id=String(req.params.id);
    const exists=await prisma.position.findUnique({where:{id},select:{id:true}});
    if(!exists)return res.status(404).json({message:"Posición no encontrada"});
    const rows=await prisma.$queryRaw<Array<{counts:unknown;reasons:unknown;profile:string;updated_at:Date;version:number}>>`
      SELECT counts,reasons,profile,updated_at,version FROM public.it_position_checklist_review WHERE position_id=${id} LIMIT 1`;
    return res.json(rows.length?{exists:true,...rows[0]}:{exists:false});
  } catch(error) {
    console.error('Reading checklist review failed',error);
    return res.status(503).json({message:'Revisiones no disponibles. Comprueba que la migración SQL se aplicó.'});
  }
});
router.put("/:id/checklist-review",async(req,res)=>{
  try {
    const id=String(req.params.id);
    const data=req.body??{};
    const counts=data.counts;
    const reasons=data.reasons;
    const profile=data.profile;
    if(!counts||typeof counts!=='object'||Array.isArray(counts)||
       Object.keys(counts).length!==reviewKeys.length||
       !reviewKeys.every(k=>typeof counts[k]==='number'&&Number.isSafeInteger(counts[k])&&counts[k]>=0&&counts[k]<=4)||
       !reasons||typeof reasons!=='object'||Array.isArray(reasons)||
       Object.keys(reasons).length!==exceptionKeys.length||
       !exceptionKeys.every(k=>typeof reasons[k]==='string'&&reasons[k].length<=70)||
       !['desktop','laptop','allinone'].includes(profile))return res.status(400).json({message:'Checklist inválido.'});
    const laptop=profile==='laptop',aio=profile==='allinone';
    const required={computer:1,monitor:aio?0:laptop?1:2,mouse:1,keyboard:1,
      power:aio?1+counts.monitor:laptop?counts.monitor:3,
      video:(laptop||aio)?counts.monitor:2,network:1,strip:(laptop||aio)?0:1,charger:laptop?1:0};
    const max={computer:1,monitor:reasons.monitor==='none'?(aio?0:laptop?1:2):3,mouse:1,keyboard:1,
      power:reasons.power==='none'?(aio?Math.min(4,1+counts.monitor):laptop?counts.monitor:3):4,
      video:reasons.video==='none'?(aio||laptop?counts.monitor:3):4,network:1,strip:1,charger:1};
    if(aio && counts.video>0 && counts.monitor===0)return res.status(400).json({message:'All in One requiere monitor externo para cable de video.'});
    if(reviewKeys.some(k=>counts[k]>max[k]))return res.status(400).json({message:'Una cantidad excede su límite autorizado.'});
    const completed=reviewKeys.filter(k=>counts[k]>=required[k]).length;
    const rows=await prisma.$transaction(async tx=>{
      const pos=await tx.position.findUnique({where:{id},select:{id:true}});
      if(!pos)return null;
      return tx.$queryRaw<Array<{position_id:string;updated_at:Date;version:number}>>`
        INSERT INTO public.it_position_checklist_review(position_id,counts,reasons,profile,completed,total,version,updated_at)
        VALUES(${id},${JSON.stringify(counts)}::jsonb,${JSON.stringify(reasons)}::jsonb,${profile},${completed},9,1,now())
        ON CONFLICT(position_id) DO UPDATE SET counts=EXCLUDED.counts,reasons=EXCLUDED.reasons,
        profile=EXCLUDED.profile,completed=EXCLUDED.completed,total=9,
        version=public.it_position_checklist_review.version+1,updated_at=now()
        RETURNING position_id,updated_at,version`;
    });
    if(!rows)return res.status(404).json({message:'Posición no encontrada'});
    return res.json({ok:true,completed,total:9,isComplete:completed===9,reviewOnly:true,version:rows[0].version,updatedAt:rows[0].updated_at});
  }catch(error){
    console.error('Saving checklist review failed',error);
    return res.status(503).json({message:'No se pudo guardar la revisión. Verifica tabla y conectividad.'});
  }
});

router.get(
    "/:id",
    getOne
);


// =====================================================
// UPDATE POSITION
// =====================================================

router.put(
    "/:id",
    update
);


// =====================================================
// DELETE POSITION
// =====================================================

router.delete("/:id", async (req, res) => {
  try {
    const id = String(req.params.id);
    const confirmCode = typeof req.body?.confirmCode === "string" ? req.body.confirmCode.trim() : "";
    const result = await prisma.$transaction(async tx => {
      const pos = await tx.position.findUnique({where:{id},include:{equipment:true}});
      if (!pos) return {status:404,message:"La posición no existe."};
      if (pos.code.toUpperCase().startsWith("P2O-")) return {status:403,message:"La posición pertenece al catálogo oficial P2O y está protegida."};
      if (!confirmCode || confirmCode !== pos.code) return {status:400,message:"Confirmación incorrecta: vuelve a seleccionar la posición."};
      if (pos.inventoryPersonId || pos.assignedUserId || pos.equipment || pos.userCell?.trim() || pos.equipmentCell?.trim()) return {status:409,message:"La posición tiene usuario, equipo o datos vinculados. Desvincúlalos antes de eliminar."};
      // Revisar también referencias de tablas auxiliares incluso si no figuran en el modelo Prisma.
      const blockers = await Promise.all([
        tx.$queryRawUnsafe<Array<{n:bigint}>>('SELECT count(*)::bigint AS n FROM "PositionAccessory" WHERE "positionId" = $1',id).catch(()=>null),
        tx.$queryRawUnsafe<Array<{n:bigint}>>('SELECT count(*)::bigint AS n FROM "PositionLotAllocation" WHERE "positionId" = $1',id).catch(()=>null)
      ]);
      // Si la existencia de las tablas es desconocida, la FK de PostgreSQL sigue siendo protección final.
      if(blockers.some(rows=>rows && Number(rows[0]?.n||0)>0))return {status:409,message:"Esta posición tiene accesorios o lotes vinculados. Primero retira esas relaciones."};
      await tx.position.delete({where:{id}});
      return {status:200,message:"Posición eliminada correctamente."};
    });
    return res.status(result.status).json({message:result.message});
  } catch (error) {
    console.error("Error al eliminar posición:",error);
    const e = error as {code?:string;meta?:{modelName?:string;field_name?:string}};
    const isReference = e?.code === "P2003" || e?.code === "P2014";
    return res.status(409).json({message:isReference ? "La posición conserva referencias de historial, checklist u otras tablas. No se borrará ningún historial automáticamente. Revisa las relaciones pendientes con IT." : "No fue posible eliminar la posición. Revisa los registros asociados en el backend."});
  }
});


export default router;