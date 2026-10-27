import prisma from "../config/prisma";
import { randomUUID } from "crypto";


// ================================
// CREATE EQUIPMENT
// ================================

// FASE5D2-AUTOCODE: Prefijos internos. Los seriales de fabrica nunca se modifican.
const typePrefixes: Record<string, string> = {
  desktop: "TRUEWKS", laptop: "TRUELPT", "all in one": "TRUEWKS", monitor: "TRUEMON"
};

// Registrar el alta y su movimiento en una sola transaccion.
// Los activos anteriores NO se alteran. Componentes por cantidad usan
// Equipment.quantity: el historial enlazado conserva la cantidad en la ficha.
async function createEquipmentWithEntry(data: any) {
  return prisma.$transaction(async (tx) => {
    // Recepciones de productos fungibles: sumar a una ficha ya conciliada.
    // No fusionar serializados, computadoras, lotes sin saldo verificado ni equipos en uso.
    const norm = (value: unknown) => String(value ?? '').trim().toLocaleLowerCase();
    const type = norm(data.type);
    const mergeable = !norm(data.serial) && !norm(data.assetTag) && !norm(data.pcName)
      && !['desktop', 'laptop', 'all in one', 'all-in-one', 'aio'].includes(type)
      && ['active', 'available'].includes(norm(data.status))
      && ['almacen', 'almacén', 'warehouse', 'store', 'bodega'].includes(norm(data.location))
      && !data.positionId && !data.assignedUser && !data.assignedUserId;
    if (mergeable) {
      const incoming = Number(data.quantity ?? 1);
      if (!Number.isSafeInteger(incoming) || incoming < 1) throw new Error('Cantidad de recepción inválida.');
      // Bloqueo transaccional de producto: evita fichas duplicadas por altas simultáneas.
      const fingerprint = [data.category, data.type, data.brand, data.model ?? '', data.condition ?? 'NEW']
        .map(norm).join('|');
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${fingerprint}))::text AS lock_result`;
      const candidates = await tx.equipment.findMany({
        where: { serial: null, positionId: null, assignedUser: null },
        orderBy: { createdAt: 'asc' },
      });
      for (const existing of candidates) {
        if (norm(existing.category) !== norm(data.category) || norm(existing.type) !== type
            || norm(existing.brand) !== norm(data.brand) || norm(existing.model) !== norm(data.model)
            || norm(existing.condition) !== norm(data.condition ?? 'NEW')
            || !['active', 'available'].includes(norm(existing.status))
            || !['almacen', 'almacén', 'warehouse', 'store', 'bodega'].includes(norm(existing.location))
            || norm(existing.serial) || existing.positionId) continue;
        // Una ficha con saldos preexistentes solo se amplía si está totalmente conciliada.
        const sums = await tx.$queryRaw<Array<{ total: bigint; rows: bigint }>>`
          SELECT COALESCE(SUM(units),0)::bigint AS total, COUNT(*)::bigint AS rows
          FROM public.it_stock_balance WHERE equipment_id=${existing.id}`;
        if (!sums.length || Number(sums[0].rows) === 0 || Number(sums[0].total) !== existing.quantity) continue;
        const next = existing.quantity + incoming;
        if (!Number.isSafeInteger(next)) throw new Error('La cantidad total excede el límite permitido.');
        await tx.equipment.update({ where: { id: existing.id }, data: { quantity: next } });
        await tx.$executeRaw`UPDATE public.it_stock_balance SET units=units+${incoming}, updated_at=now()
          WHERE equipment_id=${existing.id} AND bucket='WAREHOUSE_AVAILABLE'`;
        // Si el balance disponible no existía, crearlo (otros balances sí estaban conciliados).
        await tx.$executeRaw`INSERT INTO public.it_stock_balance(equipment_id,bucket,units)
          VALUES(${existing.id},'WAREHOUSE_AVAILABLE',${incoming})
          ON CONFLICT (equipment_id,bucket) DO NOTHING`;
        await tx.$executeRaw`INSERT INTO public.it_stock_event
          (equipment_id,action,quantity,from_bucket,to_bucket,position_id,reference,reason,actor,request_key)
          VALUES(${existing.id},'OPENING',${incoming},NULL,'WAREHOUSE_AVAILABLE',NULL,NULL,
          'Recepción adicional de producto existente','SYSTEM / EQUIPMENT_RECEIPT',${'receipt:'+crypto.randomUUID()})`;
        await tx.movement.create({ data: { equipmentId: existing.id, action: 'ENTRY_NEW',
          fromLocation: 'PROVEEDOR / NUEVO INGRESO', toLocation: 'Almacen',
          assignedUser: null, createdBy: 'SYSTEM / EQUIPMENT_RECEIPT' } });
        return tx.equipment.findUniqueOrThrow({ where: { id: existing.id } });
      }
    }
    const equipment = await tx.equipment.create({ data });
// Una compra NUEVA identificada como disponible en Almacén abre su saldo
    // automáticamente en la misma transacción del alta; sin segunda conciliación.
    // Otros estados/ubicaciones no se presumen disponibles.
    const initialStatus = String(equipment.status || '').toUpperCase();
    const initialLocation = String(equipment.location || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const isWarehouse = /almacen|warehouse|bodega|store/.test(initialLocation);
    const openingBucket = initialStatus === 'RETIRED' ? 'RETIRED'
      : initialStatus === 'DAMAGED' ? 'WAREHOUSE_DAMAGED'
      : ['REPAIR','IN_REPAIR'].includes(initialStatus) ? 'REPAIR'
      : isWarehouse && ['ACTIVE','AVAILABLE'].includes(initialStatus) ? 'WAREHOUSE_AVAILABLE' : null;
    if (openingBucket) {
      const quantity = Number(equipment.quantity);
      if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Cantidad inicial invalida.');
      const record = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public."Equipment" WHERE id=${equipment.id}`;
      if (record.length !== 1) throw new Error('No se pudo verificar el activo creado.');
      await tx.$executeRaw`INSERT INTO public.it_stock_balance (equipment_id,bucket,units)
        VALUES (${equipment.id},${openingBucket},${quantity})`;
      await tx.$executeRaw`INSERT INTO public.it_stock_event
        (equipment_id,action,quantity,from_bucket,to_bucket,position_id,reference,reason,actor,request_key)
        VALUES (${equipment.id},'OPENING',${quantity},NULL,${openingBucket},NULL,NULL,
        'Alta inicial desde Nuevos equipos','SYSTEM / EQUIPMENT_CREATE',${'opening:'+equipment.id})`;
    }
    const damaged = ['DAMAGED', 'REPAIR', 'IN_REPAIR'].includes(String(equipment.status).toUpperCase());
    await tx.movement.create({
      data: {
        equipmentId: equipment.id,
        action: damaged ? 'ENTRY_DAMAGED' : 'ENTRY_NEW',
        fromLocation: 'PROVEEDOR / NUEVO INGRESO',
        toLocation: equipment.location || 'IT / PENDIENTE DE UBICACION',
        assignedUser: null,
        createdBy: 'SYSTEM / EQUIPMENT_CREATE'
      }
    });
    return equipment;
  });
}

// PARTE 7B: nuevas recepciones sin serial: una ficha por unidad.
// No convierte ni altera los lotes historicos.
const unitCodePrefixes: Record<string,string> = {
  mouse:'MOU', teclado:'TEC', keyboard:'TEC', monitor:'MON', headset:'HDS',
  ups:'UPS', regleta:'REG', 'cable de video':'VID', 'cable de red':'RED',
  'cable de poder':'PWR', 'cable de corriente':'PWR',
  'fuente de alimentacion':'FUE', 'fuente de alimentación':'FUE',
  'cargador de laptop':'CAR', charger:'CAR', cable:'CAB'
};
function normalizeUnitType(value: unknown) {
  return String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
}
async function createIndependentUnits(data: any) {
  const count = Number(data.quantity ?? 1);
  if (!Number.isSafeInteger(count) || count < 1 || count > 200) {
    throw new Error('La recepcion de unidades individuales admite de 1 a 200 por operacion.');
  }
  const type = normalizeUnitType(data.type);
  const prefix = unitCodePrefixes[type] || 'ACC';
  return prisma.$transaction(async tx => {
    // Solo un generador por prefijo a la vez; no reutilizar numeros existentes.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'it-hub-unit-code-'+prefix}))::text AS lock_result`;
    const prior = await tx.equipment.findMany({
      where:{assetTag:{startsWith:prefix+'-'}},select:{assetTag:true}
    });
    const pattern = new RegExp('^'+prefix+'-(\\d+)$','i');
    let next = 1;
    for (const item of prior) {
      const match = String(item.assetTag||'').match(pattern);
      if (match) next = Math.max(next,Number(match[1])+1);
    }
    const received = [];
    const status = String(data.status||'ACTIVE').toUpperCase();
    const location = normalizeUnitType(data.location);
    const warehouse = /almacen|warehouse|bodega|store/.test(location);
    const bucket = status==='RETIRED'?'RETIRED':status==='DAMAGED'?'WAREHOUSE_DAMAGED':
      ['REPAIR','IN_REPAIR'].includes(status)?'REPAIR':
      warehouse&&['ACTIVE','AVAILABLE'].includes(status)?'WAREHOUSE_AVAILABLE':null;
    for(let i=0;i<count;i++) {
      const assetTag = `${prefix}-${String(next+i).padStart(6,'0')}`;
      const item = await tx.equipment.create({data:{...data,quantity:1,serial:null,pcName:null,assetTag}});
      if(bucket){
        await tx.$executeRaw`INSERT INTO public.it_stock_balance(equipment_id,bucket,units)
          VALUES (${item.id},${bucket},1)`;
        await tx.$executeRaw`INSERT INTO public.it_stock_event
          (equipment_id,action,quantity,from_bucket,to_bucket,position_id,reference,reason,actor,request_key)
          VALUES (${item.id},'OPENING',1,NULL,${bucket},NULL,NULL,
          'Alta unitaria Parte 7B','SYSTEM / EQUIPMENT_CREATE',${'opening:'+item.id})`;
      }
      await tx.movement.create({data:{equipmentId:item.id,
        action:['DAMAGED','REPAIR','IN_REPAIR'].includes(status)?'ENTRY_DAMAGED':'ENTRY_NEW',
        fromLocation:'PROVEEDOR / NUEVO INGRESO',
        toLocation:data.location||'IT / PENDIENTE DE UBICACION',
        assignedUser:null,createdBy:'SYSTEM / EQUIPMENT_CREATE'}});
      received.push(item);
    }
    // Mantiene la respuesta compatible con el formulario actual.
    return {...received[0],receivedUnits:received.length,unitIds:received.map(x=>x.id)};
  },{timeout:30000});
}

export async function createEquipment(data: any) {
  // Lotes accesorios: aun cuando no exista serial se crean unidades reales.
  // Los computadores conservan su alta/validacion anterior.
  const unitType = normalizeUnitType(data.type);
  const isMain = ['desktop','laptop','all in one','all-in-one','aio'].includes(unitType);
  if (!isMain) {
    const amount = Number(data.quantity ?? 1);
    if (amount > 1 && (String(data.serial??'').trim() || String(data.assetTag??'').trim())) {
      throw new Error('Un mismo serial o codigo interno no puede identificar varias unidades. Registra la unidad serializada por separado.');
    }
    if (!String(data.serial??'').trim() && !String(data.assetTag??'').trim()) {
      return createIndependentUnits({...data,pcName:null});
    }
  }
  // ALMACEN_F4_PCNAME_BY_SERIAL
  // Solo al CREAR computadoras. No altera registros existentes.
  const f4Type = String(data.type ?? '').trim().toLowerCase();
  const f4Prefix = f4Type === 'laptop' ? 'TRUELPT' :
    f4Type === 'desktop' ? 'TRUEWKS' : null;
  if (f4Prefix) {
    const f4Serial = String(data.serial ?? '').trim().toUpperCase();
    if (!f4Serial) throw new Error('Se requiere numero de serie para computadora.');
    const f4Name = `${f4Prefix}-${f4Serial}`;
    const f4Duplicate = await prisma.equipment.findFirst({ where: { pcName: f4Name }, select: { id: true } });
    if (f4Duplicate) throw new Error('PCNAME ya registrado. Revisa el serial.');
    data = { ...data, pcName: f4Name };
  }
  // FASE 4: PCNAME automatico para computadoras nuevas. Serial manual.
  // No modifica equipos existentes ni sustituye el codigo de activo assetTag.
  const pcType = String(data.type ?? '').trim().toLowerCase();
  const pcPrefix = pcType === 'laptop' ? 'TRUELPT' :
    pcType === 'desktop' ? 'TRUEWKS' : null;
  if (pcPrefix) {
    const manualSerial = String(data.serial ?? '').trim();
    if (!manualSerial) throw new Error('Se requiere serial para generar el PCNAME.');
    if (!data.pcName || !String(data.pcName).trim()) {
      data = { ...data, pcName: `${pcPrefix}-${manualSerial.toUpperCase()}` };
    }
  }
  if (f4Type === 'all in one') {
    const requestedPcName = typeof data.pcName === 'string' ? data.pcName.trim() : '';
    if (requestedPcName) {
      const duplicate = await prisma.equipment.findFirst({ where: { pcName: { equals: requestedPcName, mode: 'insensitive' } }, select: { id: true } });
      if (duplicate) throw new Error('PCNAME ya registrado. Escribe uno diferente.');
    }
    data = { ...data, pcName: requestedPcName || null };
  }
  const kind = typeof data.type === "string" ? data.type.trim().toLowerCase() : "";
  const prefix = typePrefixes[kind];
  // Lotes sin serie de monitores: no generar assetTag antes de buscar coincidencia.
  if (kind === "monitor" && !String(data.serial ?? "").trim() && !String(data.assetTag ?? "").trim()) {
    return createEquipmentWithEntry(data);
  }
  // Se respetan siempre los codigos ingresados explicitamente.
  if (!prefix || (typeof data.assetTag === "string" && data.assetTag.trim())) {
    return createEquipmentWithEntry(data);
  }
  // Un indice UNIQUE de assetTag en PostgreSQL arbitra escrituras concurrentes.
  // Reintentar solo colisiones en assetTag, sin consultar ni cambiar equipos existentes.
  for (let attempt = 0; attempt < 12; attempt++) {
    const items = await prisma.equipment.findMany({
      where: { assetTag: { startsWith: prefix + "-" } }, select: { assetTag: true }
    });
    let max = 0;
    const codePattern = new RegExp("^" + prefix + "-(\\d+)$", "i");
    for (const item of items) {
      const match = item.assetTag?.match(codePattern);
      if (match) { const n = Number(match[1]); if (Number.isSafeInteger(n)) max = Math.max(max, n); }
    }
    const assetTag = `${prefix}-${String(max + 1).padStart(4, "0")}`;
    try {
      return await createEquipmentWithEntry({ ...data, assetTag,
          pcName: kind === 'all in one' ? (data.pcName || null) : (typeof data.pcName === 'string' && data.pcName.trim() ? data.pcName : assetTag) });
    } catch (error: unknown) {
      const collision = error && typeof error === "object" && "code" in error && error.code === "P2002";
      const target = collision && "meta" in (error as object) ? (error as { meta?: { target?: unknown } }).meta?.target : undefined;
      const onAssetTag = Array.isArray(target) ? target.includes("assetTag") : String(target ?? "").includes("assetTag");
      if (!collision || !onAssetTag) throw error;
    }
  }
  throw new Error("No fue posible asignar un codigo unico. Intenta nuevamente.");
}
// ================================
// GET ALL EQUIPMENT
// ================================

export async function getEquipments(){

    return await prisma.equipment.findMany({

        orderBy:{

            createdAt:"desc"

        },

        include:{

            movements:true

        }

    });

}



// ================================
// GET EQUIPMENT BY ID
// ================================

export async function getEquipmentById(
    id:string
){

    return await prisma.equipment.findUnique({

        where:{

            id

        },

        include:{

            movements:true

        }

    });

}



// ================================
// UPDATE EQUIPMENT
// ================================

export async function updateEquipment(
    id:string,
    data:any
){

    return await prisma.equipment.update({

        where:{

            id

        },

        data

    });

}



// ================================
// DELETE EQUIPMENT
// ================================

export async function deleteEquipment(id: string) {
  // Fail closed: legacy history, position bindings and the Parte 4 stock ledger.
  // A stock ledger record is retained as evidence even when its balance is zero.
  return prisma.$transaction(async tx => {
    const [locked] = await tx.$queryRaw<Array<{id:string;positionId:string|null;assignedUserId:string|null}>>`
      SELECT id, "positionId", "assignedUserId" FROM public."Equipment" WHERE id=${id} FOR UPDATE`;
    if (!locked) return null;
    if (locked.positionId || locked.assignedUserId) return "HAS_HISTORY" as const;
    const existing = await tx.equipment.findUnique({
      where: { id }, select: {
        movements: { select: { id: true }, take: 1 },
        damages: { select: { id: true }, take: 1 }
      }
    });
    if (!existing || existing.movements.length || existing.damages.length) return "HAS_HISTORY" as const;
    const [links, lots, balances, events] = await Promise.all([
      tx.$queryRaw<Array<{id:string}>>`SELECT id FROM public.position_asset_links WHERE equipment_id=${id} LIMIT 1`,
      tx.$queryRaw<Array<{id:string}>>`SELECT id FROM public.it_position_lot_allocation WHERE equipment_id=${id} LIMIT 1`,
      tx.$queryRaw<Array<{bucket:string}>>`SELECT bucket FROM public.it_stock_balance WHERE equipment_id=${id} LIMIT 1`,
      tx.$queryRaw<Array<{id:string}>>`SELECT id FROM public.it_stock_event WHERE equipment_id=${id} LIMIT 1`
    ]);
    if (links.length || lots.length || balances.length || events.length) return "HAS_HISTORY" as const;
    return tx.equipment.delete({ where: { id } });
  }, { isolationLevel: 'Serializable' });
}
