import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

// Fase 1: ledger independiente. Existing Equipment.quantity remains the TOTAL, never decrement it on transfers.
const router = Router();
const buckets = ['WAREHOUSE_AVAILABLE','PRODUCTION','WAREHOUSE_DAMAGED','REPAIR','RETIRED'] as const;
type Bucket = typeof buckets[number];
const allowed = new Set<string>(buckets);
type Balance = {bucket:string; units:number};
const msg = (e:unknown) => e instanceof Error ? e.message : 'Error de inventario';
const positive = (v:unknown) => typeof v === 'number' && Number.isSafeInteger(v) && v > 0;
const string = (v:unknown,max=300) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max;
async function locked(tx:Prisma.TransactionClient,id:string) {
  // Lock a single equipment record: serializes ledger updates even if balances don't yet exist.
  await tx.$queryRaw`SELECT id FROM public."Equipment" WHERE id=${id} FOR UPDATE`;
  const rows = await tx.$queryRaw<{quantity:number;serial:string|null;positionId:string|null}[]>`
    SELECT quantity,serial,"positionId" FROM public."Equipment" WHERE id=${id}`;
  if (!rows.length) throw new Error('Equipo no encontrado.');
  return rows[0];
}
async function balances(tx:Prisma.TransactionClient,id:string) {
  return tx.$queryRaw<Balance[]>`SELECT bucket,units FROM public.it_stock_balance WHERE equipment_id=${id}`;
}
async function event(tx:Prisma.TransactionClient, e:{equipmentId:string;action:string;quantity:number;fromBucket:string|null;toBucket:string;positionId:string|null;reference:string|null;reason:string;actor:string;requestKey:string}) {
  return tx.$queryRaw<{id:string}[]>`INSERT INTO public.it_stock_event(equipment_id,action,quantity,from_bucket,to_bucket,position_id,reference,reason,actor,request_key)
    VALUES(${e.equipmentId},${e.action},${e.quantity},${e.fromBucket},${e.toBucket},${e.positionId},${e.reference},${e.reason},${e.actor},${e.requestKey}) RETURNING id`;
}
function validation(error:unknown) {
  const message=msg(error);
  return /no existe|no encontrado/.test(message.toLowerCase()) ? 404 : /no habilitado|ya existe|duplicad/.test(message.toLowerCase()) ? 409 : 400;
}
router.get('/recent', async (_req:Request,res:Response) => {
 try {
  const rows=await prisma.$queryRaw<Array<{id:string;action:string;quantity:number;from_bucket:string|null;to_bucket:string;position_id:string|null;position_code:string|null;reference:string|null;reason:string;actor:string;created_at:Date;equipment_name:string}>>`
    SELECT e.id::text,e.action,e.quantity,e.from_bucket,e.to_bucket,e.position_id,
      p.code AS position_code,e.reference,e.reason,e.actor,e.created_at,
      CONCAT_WS(' ',q.type,q.brand,q.model) AS equipment_name
    FROM public.it_stock_event e
    JOIN public."Equipment" q ON q.id=e.equipment_id
    LEFT JOIN public."Position" p ON p.id=e.position_id
    ORDER BY e.created_at DESC,e.id DESC LIMIT 50`;
  res.json(rows);
 }catch(e){res.status(500).json({message:msg(e)})}
});
router.get('/overview', async (_req:Request,res:Response) => {
 try {
  const result = await prisma.$queryRaw<Array<{equipment_id:string;bucket:string;units:number}>>`
   SELECT equipment_id,bucket,units FROM public.it_stock_balance ORDER BY equipment_id,bucket`;
  res.json(result);
 } catch(e) {res.status(500).json({message:msg(e)});}
});
router.get('/equipment/:id', async (req:Request,res:Response) => {
 try {
  const id=String(req.params.id);
  const item=await prisma.equipment.findUnique({where:{id},select:{id:true,category:true,brand:true,model:true,serial:true,quantity:true}});
  if(!item) return res.status(404).json({message:'Equipo no encontrado.'});
  const balance=await prisma.$queryRaw<Balance[]>`SELECT bucket,units FROM public.it_stock_balance WHERE equipment_id=${id}`;
  const events=await prisma.$queryRaw<any[]>`SELECT id::text,equipment_id,action,quantity,from_bucket,to_bucket,position_id,reference,reason,actor,created_at
      FROM public.it_stock_event WHERE equipment_id=${id} ORDER BY created_at DESC LIMIT 100`;
  return res.json({item,reconciled:balance.length>0,balances:balance,events});
 } catch(e) {return res.status(500).json({message:msg(e)});}
});
router.post('/opening', async (req:Request,res:Response) => {
 const {equipmentId,opening,reason,actor,requestKey}=req.body||{};
 if(!string(equipmentId,100)||!string(reason,500)||!string(actor,150)||!string(requestKey,100)||!opening||typeof opening!=='object'||Array.isArray(opening))
  return res.status(400).json({message:'Equipo, distribución inicial, motivo, responsable y clave única son obligatorios.'});
 if(Object.keys(opening).some(x=>!allowed.has(x)) || Object.values(opening).some(x=>typeof x!=='number'||!Number.isSafeInteger(x)||Number(x)<0))
  return res.status(400).json({message:'Distribución inicial inválida.'});
 try {
  const result=await prisma.$transaction(async tx=>{
   const existing=await tx.$queryRaw<{id:string}[]>`SELECT id::text FROM public.it_stock_event WHERE request_key=${requestKey}`;
   if(existing.length) return {duplicate:true,eventId:existing[0].id};
   const item=await locked(tx,equipmentId);
   if((await balances(tx,equipmentId)).length) throw new Error('Este activo ya tiene conciliación.');
   const normalized=buckets.map(b=>({bucket:b,units:Number(opening[b]??0)}));
   const total=normalized.reduce((s,b)=>s+b.units,0);
   if(total!==item.quantity) throw new Error(`La distribución (${total}) debe igualar Equipment.quantity (${item.quantity}).`);
   if(item.serial && item.quantity!==1) throw new Error('Un serial individual no puede representar varias unidades.');
   if(item.positionId && normalized.find(x=>x.bucket==='PRODUCTION')!.units===0) throw new Error('Este equipo tiene posición activa: registra por lo menos una unidad en producción.');
   for(const b of normalized) await tx.$executeRaw`INSERT INTO public.it_stock_balance(equipment_id,bucket,units)
       VALUES(${equipmentId},${b.bucket},${b.units})`;
   // One opening event per nonzero bucket, with unique request key for the entire operation.
   let first=true;
   for(const b of normalized.filter(x=>x.units>0)) {
     await event(tx,{equipmentId,action:'OPENING',quantity:b.units,fromBucket:null,toBucket:b.bucket,positionId:null,reference:null,reason,actor,requestKey:first?requestKey:`${requestKey}:${b.bucket}`});
     first=false;
   }
   return {duplicate:false,balances:normalized};
  });
  return res.status(result.duplicate?200:201).json(result);
 }catch(e){return res.status(validation(e)).json({message:msg(e)});}
});
router.post('/transfer',async(req:Request,res:Response)=>{
 const {equipmentId,fromBucket,toBucket,quantity,reason,actor,positionId,reference,requestKey}=req.body||{};
 if(!string(equipmentId,100)||!allowed.has(fromBucket)||!allowed.has(toBucket)||fromBucket===toBucket||!positive(quantity)||!string(reason,500)||!string(actor,150)||!string(reference,250)||!string(requestKey,100)|| (positionId!=null&&!string(positionId,100)))
  return res.status(400).json({message:'Datos de transferencia inválidos.'});
 if(positionId && toBucket!=='PRODUCTION' && fromBucket!=='PRODUCTION') return res.status(400).json({message:'La posición solo corresponde a movimientos que involucren producción.'});
 try {
  const result=await prisma.$transaction(async tx=>{
   const existing=await tx.$queryRaw<{id:string}[]>`SELECT id::text FROM public.it_stock_event WHERE request_key=${requestKey}`;
   if(existing.length)return {duplicate:true,eventId:existing[0].id};
   const item=await locked(tx,equipmentId);
   const b=await balances(tx,equipmentId);
   if(!b.length) throw new Error('Activo no habilitado: concilia las existencias primero.');
   if(item.serial && item.quantity!==1) throw new Error('Serial y cantidad incompatibles.');
   const source=b.find(x=>x.bucket===fromBucket)?.units??0;
   if(source<quantity)throw new Error(`Existencias insuficientes: ${fromBucket} tiene ${source}.`);
   if(positionId) {
     const rows=await tx.$queryRaw<{id:string}[]>`SELECT id FROM public."Position" WHERE id=${positionId}`;
     if(!rows.length)throw new Error('Posición no encontrada.');
   }
   // La migración inicial puede tener solo WAREHOUSE_AVAILABLE. Crear el destino de forma atómica.
   const taken=await tx.$executeRaw`UPDATE public.it_stock_balance
     SET units=units-${quantity},updated_at=now()
     WHERE equipment_id=${equipmentId} AND bucket=${fromBucket} AND units>=${quantity}`;
   if(taken!==1)throw new Error('Saldo de origen modificado; vuelve a consultar antes de confirmar.');
   await tx.$executeRaw`INSERT INTO public.it_stock_balance(equipment_id,bucket,units)
     VALUES(${equipmentId},${toBucket},${quantity})
     ON CONFLICT (equipment_id,bucket) DO UPDATE
     SET units=public.it_stock_balance.units+EXCLUDED.units,updated_at=now()`;
   const e=await event(tx,{equipmentId,action:'TRANSFER',quantity,fromBucket,toBucket,positionId:positionId??null,reference:string(reference,250)?reference:null,reason,actor,requestKey});
   const sum=await tx.$queryRaw<{total:bigint}[]>`SELECT COALESCE(SUM(units),0)::bigint AS total FROM public.it_stock_balance WHERE equipment_id=${equipmentId}`;
   if(Number(sum[0].total)!==item.quantity)throw new Error('Inconsistencia de balance; operación anulada.');
   return {duplicate:false,eventId:e[0].id,fromBalance:source-quantity};
  });
  return res.status(result.duplicate?200:201).json(result);
 }catch(e){return res.status(validation(e)).json({message:msg(e)});}
});
// REPORTES-IT-HUB-2026: consultas de solo lectura; fechas UTC, fin exclusivo.
function reportDates(req:Request){
 const start=String(req.query.start||'');const end=String(req.query.end||'');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))throw new Error('Fechas invalidas (YYYY-MM-DD).');
 const from=new Date(start+'T00:00:00.000Z'),to=new Date(end+'T00:00:00.000Z');
 if(!Number.isFinite(+from)||!Number.isFinite(+to)||+to<=+from||(+to- +from)>366*86400000)throw new Error('Rango invalido o mayor a 366 dias.');
 return {from,to};
}
router.get('/report-summary',async(req:Request,res:Response)=>{
 try{
  const {from,to}=reportDates(req);
  const rows=await prisma.$queryRaw<Array<{action:string;from_bucket:string|null;to_bucket:string|null;operations:bigint;units:bigint}>>`
    SELECT action,from_bucket,to_bucket,COUNT(*)::bigint AS operations,COALESCE(SUM(quantity),0)::bigint AS units
    FROM public.it_stock_event WHERE created_at>=${from} AND created_at<${to}
    GROUP BY action,from_bucket,to_bucket ORDER BY action,from_bucket,to_bucket`;
  const weeks=await prisma.$queryRaw<Array<{week:string;action:string;from_bucket:string|null;to_bucket:string|null;units:bigint}>>`
    SELECT to_char(date_trunc('week',created_at AT TIME ZONE 'UTC'),'YYYY-MM-DD') AS week,
       action,from_bucket,to_bucket,COALESCE(SUM(quantity),0)::bigint AS units
    FROM public.it_stock_event WHERE created_at>=${from} AND created_at<${to}
    GROUP BY 1,2,3,4 ORDER BY 1,2`;
  const metrics=rows.map(r=>({...r,operations:Number(r.operations),units:Number(r.units)}));
  res.json({start:from.toISOString(),endExclusive:to.toISOString(),metrics,weeks:weeks.map(r=>({...r,units:Number(r.units)}))});
 }catch(e){res.status(400).json({message:msg(e)})}
});
router.get('/report-events',async(req:Request,res:Response)=>{
 try{
  const {from,to}=reportDates(req);
  const limit=Math.min(500,Math.max(1,Number(req.query.limit)||100));
  const offset=Number(req.query.offset)||0;
  if(!Number.isSafeInteger(offset)||offset<0||offset>10000000)throw new Error('Paginacion invalida.');
  const rows=await prisma.$queryRaw<Array<{id:string;created_at:Date;action:string;quantity:number;from_bucket:string|null;to_bucket:string|null;position_id:string|null;position_code:string|null;reference:string|null;reason:string;actor:string;equipment_name:string;equipment_id:string}>>`
     SELECT e.id::text,e.created_at,e.action,e.quantity,e.from_bucket,e.to_bucket,
       e.position_id,p.code AS position_code,e.reference,e.reason,e.actor,
       CONCAT_WS(' ',q.type,q.brand,q.model) AS equipment_name,e.equipment_id
     FROM public.it_stock_event e JOIN public."Equipment" q ON q.id=e.equipment_id
     LEFT JOIN public."Position" p ON p.id=e.position_id
     WHERE e.created_at>=${from} AND e.created_at<${to}
     ORDER BY e.created_at ASC,e.id ASC LIMIT ${limit} OFFSET ${offset}`;
  const count=await prisma.$queryRaw<Array<{total:bigint}>>`
   SELECT COUNT(*)::bigint AS total FROM public.it_stock_event WHERE created_at>=${from} AND created_at<${to}`;
  res.json({rows,total:Number(count[0]?.total||0),limit,offset});
 }catch(e){res.status(400).json({message:msg(e)})}
});


// REPORTES FASE 2: incidentes, solo lectura, paginados y filtrados por fecha.
router.get('/report-damages', async (req: Request, res: Response) => {
 try {
  const {from,to}=reportDates(req);
  const offset=Number(req.query.offset??0);
  const limit=Number(req.query.limit??100);
  if(!Number.isSafeInteger(offset)||offset<0||offset>10000000||!Number.isSafeInteger(limit)||limit<1||limit>500)
    return res.status(400).json({message:'Paginacion invalida.'});
  const where={createdAt:{gte:from,lt:to}};
  const [total,items]=await Promise.all([
    prisma.damage.count({where}),
    prisma.damage.findMany({where,orderBy:[{createdAt:'asc'},{id:'asc'}],skip:offset,take:limit,
      include:{equipment:{select:{id:true,type:true,brand:true,model:true,serial:true,quantity:true}}}})
  ]);
  return res.json({total,limit,offset,rows:items.map(d=>({
    id:d.id,created_at:d.createdAt,reported_at:d.reportedAt,repaired_at:d.repairedAt,
    type:d.type,description:d.description,status:d.status,priority:d.priority,
    reported_by:d.reportedBy,repaired_by:d.repairedBy,repair_notes:d.repairNotes,
    equipment_id:d.equipmentId,equipment_name:[d.equipment?.type,d.equipment?.brand,d.equipment?.model].filter(Boolean).join(' '),
    serial:d.equipment?.serial ?? null
  }))});
 }catch(e){return res.status(400).json({message:msg(e)});}
});


// Registrar daño de una o varias unidades de un lote: transacción única y sin seriales inventados.
router.post('/lot-damage', async(req:Request,res:Response)=>{
 const {equipmentId,quantity,fromBucket,faults,notes,priority,reference,actor,requestKey}=req.body||{};
 if(!string(equipmentId,100)||!positive(quantity)||quantity>100||!['PRODUCTION','WAREHOUSE_AVAILABLE'].includes(fromBucket)||
    !Array.isArray(faults)||!faults.length||faults.length>15||faults.some((v:unknown)=>!string(v,100))||
    !string(notes,1000)||!['LOW','MEDIUM','HIGH','CRITICAL'].includes(priority)||!string(reference,250)||!string(actor,150)||!string(requestKey,150))
  return res.status(400).json({message:'Faltan datos del lote, origen, cantidad, diagnóstico, prioridad o ticket.'});
 try{
  const outcome=await prisma.$transaction(async(tx)=>{
   const already=await tx.$queryRaw<{id:string}[]>`SELECT id::text FROM public.it_stock_event WHERE request_key=${requestKey}`;
   if(already.length)return {duplicate:true,eventId:already[0].id};
   const item=await locked(tx,equipmentId);
   if(item.quantity<=1||item.serial)throw new Error('Para activos individuales utiliza el registro individual.');
   const available=await balances(tx,equipmentId);
   if(!available.length)throw new Error('Lote no conciliado: verifica el saldo en Almacén.');
   const source=available.find(b=>b.bucket===fromBucket)?.units||0;
   if(source<quantity)throw new Error(`No hay suficientes unidades en ${fromBucket}. Disponibles: ${source}.`);
   const taken=await tx.$executeRaw`UPDATE public.it_stock_balance SET units=units-${quantity},updated_at=now()
       WHERE equipment_id=${equipmentId} AND bucket=${fromBucket} AND units>=${quantity}`;
   if(taken!==1)throw new Error('Saldo modificado por otro usuario; actualiza y reintenta.');
   await tx.$executeRaw`INSERT INTO public.it_stock_balance(equipment_id,bucket,units)
       VALUES(${equipmentId},'WAREHOUSE_DAMAGED',${quantity})
       ON CONFLICT(equipment_id,bucket) DO UPDATE SET units=public.it_stock_balance.units+EXCLUDED.units,updated_at=now()`;
   const ids:string[]=[];
   for(let i=0;i<quantity;i++){
     const d=await tx.damage.create({data:{equipmentId,type:faults.join(' | '),description:notes,status:'OPEN',priority,reportedBy:actor}});
     ids.push(d.id);
     await tx.historyEntry.create({data:{module:'DAMAGES',entityType:'Damage',entityId:d.id,action:'REGISTER_LOT_UNIT',description:`Referencia interna del daño ${d.id}; ticket ${reference}; unidad ${i+1}/${quantity}`,newData:{equipmentId,reference,origin:fromBucket,quantity:1,lotDamage:true}}});
   }
   const e=await event(tx,{equipmentId,action:'TRANSFER',quantity,fromBucket,toBucket:'WAREHOUSE_DAMAGED',positionId:null,reference,reason:`Daño registrado: ${faults.join(', ')}. ${notes}`.slice(0,500),actor,requestKey});
   const total=await tx.$queryRaw<{sum:bigint}[]>`SELECT COALESCE(SUM(units),0)::bigint AS sum FROM public.it_stock_balance WHERE equipment_id=${equipmentId}`;
   if(Number(total[0].sum)!==item.quantity)throw new Error('Inconsistencia de balance: se anuló el movimiento.');
   return {duplicate:false,eventId:e[0].id,damageIds:ids,quantity,warehouseDamaged:(available.find(b=>b.bucket==='WAREHOUSE_DAMAGED')?.units||0)+quantity};
  });
  return res.status(outcome.duplicate?200:201).json(outcome);
 }catch(e){return res.status(validation(e)).json({message:msg(e)});}
});

export default router;
