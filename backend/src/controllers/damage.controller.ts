import { Request, Response } from "express";

import {
    createDamage,
    getDamages,
    getDamageById,
    updateDamage,
    deleteDamage,
    registerIndividualDamage
} from "../services/damage.service";


// ================================
// CREATE DAMAGE
// ================================

export async function create(
    req: Request,
    res: Response
) {

    try {

        const damage = await createDamage(
            req.body
        );

        return res.status(201).json(
            damage
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message: "Error creating damage"

        });

    }

}


// ================================
// GET ALL DAMAGES
// ================================

export async function list(
    req: Request,
    res: Response
) {

    try {

        const damages = await getDamages();

        return res.status(200).json(
            damages
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message: "Error loading damages"

        });

    }

}


// ================================
// GET DAMAGE BY ID
// ================================

export async function getOne(
    req: Request,
    res: Response
) {

    try {

        const id = String(
            req.params.id
        );

        const damage = await getDamageById(
            id
        );


        if (!damage) {

            return res.status(404).json({

                message: "Damage record not found"

            });

        }


        return res.status(200).json(
            damage
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message: "Error finding damage"

        });

    }

}


// ================================
// UPDATE DAMAGE
// ================================

export async function update(
    req: Request,
    res: Response
) {

    try {

        const id = String(
            req.params.id
        );

        const damage = await updateDamage(

            id,

            req.body

        );


        return res.status(200).json(
            damage
        );

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message: "Error updating damage"

        });

    }

}


// ================================
// DELETE DAMAGE
// ================================

export async function remove(
    req: Request,
    res: Response
) {

    try {

        const id = String(
            req.params.id
        );

        await deleteDamage(
            id
        );


        return res.status(200).json({

            message: "Damage deleted"

        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({

            message: "Error deleting damage"

        });

    }

}
export async function registerIndividual(req: Request,res: Response) {
  try {
    const body=req.body||{};
    const faults=Array.isArray(body.faults)?body.faults.filter((s:unknown)=>typeof s==='string'&&s.trim()).slice(0,15):[];
    const damage=await registerIndividualDamage({equipmentId:String(body.equipmentId||''),faults,notes:String(body.notes||''),priority:String(body.priority||'MEDIUM'),reportedBy:String(body.reportedBy||'')});
    return res.status(201).json(damage);
  } catch(e) {
    const message=e instanceof Error?e.message:'Error registrando daño';
    return res.status(400).json({message});
  }
}

// Solo metadatos: nunca cambia estado, unidades, ubicacion, fecha ni inventario.
export async function patchDamageMetadata(req: Request,res: Response) {
  try {
    const body=req.body||{};
    const allowed=['type','description','priority','reportedBy','repairedBy','repairNotes'];
    if(Object.keys(body).some(key=>!allowed.includes(key))) return res.status(400).json({message:'Campo no permitido para editar la ficha.'});
    const text=(key:string,max:number)=>{
      if(typeof body[key]!=='string'||body[key].length>max) throw new Error('Valor invalido: '+key);
      return body[key].trim();
    };
    const type=text('type',500), description=text('description',4000), priority=text('priority',16);
    if(!type||!description||!['LOW','MEDIUM','HIGH','CRITICAL'].includes(priority)) throw new Error('Falla, diagnostico o prioridad invalidos.');
    const reportedBy=text('reportedBy',120)||null,repairedBy=text('repairedBy',120)||null,repairNotes=text('repairNotes',4000)||null;
    const prisma=(await import('../config/prisma')).default;
    const damage=await prisma.damage.update({where:{id:String(req.params.id)},data:{type,description,priority,reportedBy,repairedBy,repairNotes},include:{equipment:true}});
    return res.json(damage);
  } catch(error) {
    const message=error instanceof Error?error.message:'Error editando ficha';
    if(typeof error==='object'&&error!==null&&'code' in error&&error.code==='P2025') return res.status(404).json({message:'Incidencia no encontrada'});
    return res.status(400).json({message});
  }
}

// FASE 7: transiciones verificadas, transaccionales y con bitacora.
export async function transitionDamage(req: Request, res: Response) {
  const action = String(req.body?.action || '');
  const reason = String(req.body?.reason || '').trim();
  if (!['REPAIR', 'AVAILABLE', 'RETIRE'].includes(action)) return res.status(400).json({message:'Accion no permitida'});
  if (action === 'RETIRE' && reason.length < 12) return res.status(400).json({message:'La baja requiere un motivo de al menos 12 caracteres'});
  if (reason.length > 1000) return res.status(400).json({message:'Motivo demasiado largo'});
  const prisma = (await import('../config/prisma')).default;
  try {
    const result = await prisma.$transaction(async tx => {
      const d = await tx.damage.findUnique({where:{id:String(req.params.id)},include:{equipment:true}});
      if (!d) throw new Error('Incidencia no encontrada');
      if (d.equipment.quantity !== 1) throw new Error('Lotes bloqueados: solo activos individuales');
      const oldStatus = d.status.toUpperCase();
      const equipmentStatus = d.equipment.status.toUpperCase();
      if (['DISCARDED','RETIRED','CLOSED','COMPLETED'].includes(oldStatus) || ['RETIRED','DISCARDED'].includes(equipmentStatus)) throw new Error('Caso o activo retirado; operacion bloqueada');
      if (action === 'REPAIR' && !['OPEN','PENDING','IN_PROGRESS','REPAIR','IN_REPAIR','DIAGNOSIS','REPAIRABLE'].includes(oldStatus)) throw new Error('El caso no admite marcar reparado');
      if (action === 'AVAILABLE' && oldStatus !== 'REPAIRED') throw new Error('Primero debe marcar el caso como reparado');
      if (action === 'RETIRE' && !['OPEN','PENDING','IN_PROGRESS','REPAIR','IN_REPAIR','DIAGNOSIS','REPAIRABLE','IRREPARABLE','REPAIRED'].includes(oldStatus)) throw new Error('Caso no apto para baja');
      if (!['DAMAGED','REPAIR','IN_REPAIR'].includes(equipmentStatus)) throw new Error('Estado del activo no coincide con la incidencia; operacion bloqueada');
      const next = action === 'REPAIR' ? 'REPAIRED' : action === 'AVAILABLE' ? 'RESOLVED' : 'DISCARDED';
      const changed = await tx.damage.updateMany({where:{id:d.id,status:d.status},data:{status:next,...(action==='REPAIR'?{repairedAt:new Date()}:{}),...(action==='RETIRE'?{repairNotes:[d.repairNotes,`BAJA DEFINITIVA: ${reason}`].filter(Boolean).join('\n').slice(0,4000)}:{})}});
      if (changed.count !== 1) throw new Error('Otro usuario modifico este caso; actualiza la pantalla');
      if (action !== 'REPAIR') {
        const equipmentUpdated = await tx.equipment.updateMany({where:{id:d.equipmentId,status:d.equipment.status,quantity:1},data: action==='AVAILABLE'?{status:'AVAILABLE',condition:'AVAILABLE',location:'Almacen IT'}:{status:'RETIRED',condition:'DAMAGED',location:'BAJA DEFINITIVA'}});
        if (equipmentUpdated.count !== 1) throw new Error('El equipo cambio de estado; actualiza la pantalla');
        await tx.movement.create({data:{equipmentId:d.equipmentId,action:action==='AVAILABLE'?'RETURN_AVAILABLE':'RETIRE_DAMAGED',fromLocation:d.equipment.location||'Almacen IT',toLocation:action==='AVAILABLE'?'Almacen IT':'BAJA DEFINITIVA',createdBy:'DAMAGE_MANAGEMENT'}});
      }
      await tx.historyEntry.create({data:{module:'DAMAGES',entityType:'Damage',entityId:d.id,action:action==='REPAIR'?'MARK_REPAIRED':action==='AVAILABLE'?'RETURN_AVAILABLE':'RETIRE_ASSET',description:reason||'Transicion confirmada desde Daños y Reparaciones',oldData:{damageStatus:d.status,equipmentStatus:d.equipment.status},newData:{damageStatus:next,equipmentStatus:action==='REPAIR'?d.equipment.status:action==='AVAILABLE'?'AVAILABLE':'RETIRED'}}});
      return tx.damage.findUnique({where:{id:d.id},include:{equipment:true}});
    });
    return res.json(result);
  } catch(err) { const message=err instanceof Error?err.message:'Error procesando accion';return res.status(409).json({message}); }
}

export async function getDamageHistory(req: Request,res: Response) {
  try {
    const prisma=(await import('../config/prisma')).default;
    const id=String(req.params.id);
    const damage=await prisma.damage.findUnique({where:{id},select:{id:true}});
    if(!damage) return res.status(404).json({message:'Incidencia no encontrada'});
    const history=await prisma.historyEntry.findMany({where:{module:'DAMAGES',entityType:'Damage',entityId:id},orderBy:{createdAt:'asc'},select:{id:true,action:true,description:true,createdAt:true}});
    return res.json(history);
  } catch { return res.status(500).json({message:'No se pudo cargar el historial'}); }
}
