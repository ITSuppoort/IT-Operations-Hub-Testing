import prisma from "../config/prisma";


// ================================
// CREATE DAMAGE
// ================================

export async function createDamage(data: any) {

    return await prisma.damage.create({

        data

    });

}


// ================================
// GET ALL DAMAGES
// ================================

export async function getDamages() {

    return await prisma.damage.findMany({

        orderBy: {

            createdAt: "desc"

        },

        include: {

            equipment: true

        }

    });

}


// ================================
// GET DAMAGE BY ID
// ================================

export async function getDamageById(
    id: string
) {

    return await prisma.damage.findUnique({

        where: {

            id

        },

        include: {

            equipment: true

        }

    });

}


// ================================
// UPDATE DAMAGE
// ================================

export async function updateDamage(
    id: string,
    data: any
) {

    return await prisma.damage.update({

        where: {

            id

        },

        data

    });

}


// ================================
// DELETE DAMAGE
// ================================

export async function deleteDamage(
    id: string
) {

    return await prisma.damage.delete({

        where: {

            id

        }

    });

}
// Fase 3: cambio atomico exclusivo para activos individuales.
export async function registerIndividualDamage(input: {equipmentId:string; faults:string[]; notes?:string; priority:string; reportedBy?:string}) {
  if (!input.equipmentId || !Array.isArray(input.faults) || !input.faults.length) throw new Error('Equipo y falla son obligatorios.');
  if (!['LOW','MEDIUM','HIGH','CRITICAL'].includes(input.priority)) throw new Error('Prioridad no valida.');
  const equipment = await prisma.equipment.findUnique({where:{id:input.equipmentId}});
  if (!equipment) throw new Error('Equipo no encontrado.');
  if (equipment.quantity !== 1) throw new Error('Este activo agrupa varias unidades. Se requiere la fase de separacion por lotes antes de reportar cantidades parciales.');
  return prisma.$transaction(async tx => {
    // Una sola incidencia activa por activo; el historial cerrado se conserva.
    const previous = await tx.damage.findFirst({
      where:{equipmentId:input.equipmentId,status:{notIn:['RESOLVED','REPAIRED','CLOSED','COMPLETED','RETIRED','DISCARDED']}},
      select:{id:true}
    });
    if (previous) throw new Error('Este equipo ya tiene una incidencia activa. Abre su ficha para continuar.');
    const alreadyDamaged = ['DAMAGED','REPAIR','IN_REPAIR'].includes(String(equipment.status).toUpperCase());
    if (['RETIRED','DISCARDED'].includes(String(equipment.status).toUpperCase()))
      throw new Error('El activo esta dado de baja y no se puede reportar.');
    if (!alreadyDamaged) {
      const changed = await tx.equipment.updateMany({
        where:{id:input.equipmentId,quantity:1,status:{notIn:['DAMAGED','REPAIR','IN_REPAIR','RETIRED','DISCARDED']}},
        data:{status:'DAMAGED',condition:'DAMAGED',location:'Almacen IT'}
      });
      if(changed.count!==1) throw new Error('El estado del equipo cambio. Actualiza y vuelve a intentar.');
    }
    const damage=await tx.damage.create({data:{
      equipmentId:input.equipmentId,type:input.faults.join(' · ').slice(0,250),
      description:(input.notes||input.faults.join(' · ')).slice(0,4000),status:'OPEN',priority:input.priority,
      reportedBy:input.reportedBy?.trim()||null
    }});
    // Un activo previamente dañado YA fue clasificado por inventario. No
    // simulamos una segunda entrada física ni cambiamos su ubicación.
    if (!alreadyDamaged) {
      await tx.movement.create({data:{equipmentId:input.equipmentId,action:'ENTRY_DAMAGED',
        fromLocation:equipment.location||'Ubicacion anterior no registrada',toLocation:'Almacen IT',
        assignedUser:equipment.assignedUser||null,createdBy:'SYSTEM / DAMAGE_REPORT'}});
    }
    return damage;
  });
}
