import { Router } from 'express';
import { randomUUID } from 'crypto';
import prisma from '../config/prisma';

// Parte 4. Ledger + asignaciones atomicas, conservando Equipment.quantity.
const router = Router();
type Lot = {id:string; category:string; type:string|null; brand:string; model:string|null; quantity:number; available:number; production:number; reconciled:boolean};
const message = (e:unknown) => e instanceof Error ? e.message : String(e);
function classify(category:string,type:string|null){
 const c=`${category} ${type||''}`.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(/MONITOR|DISPLAY|PANTALLA/.test(c))return 'MONITOR';
 if(/TECLADO|KEYBOARD/.test(c))return 'KEYBOARD';
 if(/MOUSE|RATON/.test(c))return 'MOUSE';
 if(/HEADSET|HEADPHONE|AURICULAR|DIADEMA|AUDIFONO/.test(c))return 'HEADSET';
 if(/REGLETA|POWER STRIP|MULTITOMA/.test(c))return 'STRIP';
 if(/CARGADOR|CHARGER|ADAPTADOR.*(CORRIENTE|LAPTOP)/.test(c))return 'CHARGER';
 if(/CABLE/.test(c)&&/PODER|POWER|CORRIENTE|FUENTE/.test(c))return 'POWER';
 if(/CABLE/.test(c)&&/RED|ETHERNET|LAN|RJ45/.test(c))return 'NETWORK';
 if(/HDMI|DISPLAYPORT|VGA|CABLE.*VIDEO/.test(c))return 'VIDEO';
 if(/WEBCAM|CAMARA/.test(c))return 'WEBCAM';
 if(/\bUPS\b|NO.?BREAK/.test(c))return 'UPS';
 if(/LAPTOP|DESKTOP|ALL.?IN.?ONE|COMPUTADORA|NOTEBOOK/.test(c))return 'MAIN';
 return 'OTHER';
}
const valid = (s:unknown) => typeof s==='string' && s.trim().length>0 && s.length<=100;
router.get('/catalog',async (_req,res)=>{
 try{
  const lots=await prisma.$queryRaw<Lot[]>`
   SELECT e.id,e.category,e.type,e.brand,e.model,e.quantity,
   COALESCE(MAX(CASE WHEN b.bucket='WAREHOUSE_AVAILABLE' THEN b.units END),0)::int AS available,
   COALESCE(MAX(CASE WHEN b.bucket='PRODUCTION' THEN b.units END),0)::int AS production,
   COUNT(b.bucket)>0 AS reconciled
   FROM public."Equipment" e LEFT JOIN public.it_stock_balance b ON b.equipment_id=e.id
   WHERE e.quantity>=1 AND e.status NOT IN ('RETIRED','DISCARDED')
   GROUP BY e.id,e.category,e.type,e.brand,e.model,e.quantity
   ORDER BY e.category,e.brand,e.model`;
  return res.json(lots.map(l=>({...l,role:classify(l.category,l.type)})).filter(l=>l.role!=='MAIN'));
 }catch(e){return res.status(503).json({message:'No se pudo leer el inventario: '+message(e)})}
});
router.get('/positions',async(_req,res)=>{
 try {const rows=await prisma.position.findMany({select:{id:true,code:true,name:true},orderBy:{code:'asc'}});return res.json(rows)}
 catch(e){return res.status(500).json({message:message(e)})}
});
router.get('/assigned',async(_req,res)=>{
 try{
  const rows=await prisma.$queryRaw<Array<{id:string;equipmentId:string;positionId:string;code:string;role:string;quantity:number;category:string;brand:string;model:string|null}>>`
  SELECT a.id,a.equipment_id AS "equipmentId",a.position_id AS "positionId",p.code,a.role,a.quantity,e.category,e.brand,e.model
  FROM public.it_position_lot_allocation a JOIN public."Position" p ON p.id=a.position_id
  JOIN public."Equipment" e ON e.id=a.equipment_id ORDER BY p.code,e.brand,e.model`;
  return res.json(rows);
 }catch(e){return res.status(503).json({message:'Falta migracion Parte 4 o no disponible: '+message(e)})}
});
router.post('/assign',async(req,res)=>{
 const {equipmentId,positionId,requestKey,expectedRole}=req.body||{};
 const qty=Number(req.body?.quantity??1);
 if(!Number.isInteger(qty)||qty<1||qty>20)return res.status(400).json({message:"Cantidad invalida (1 a 20)."});
 if(!valid(equipmentId)||!valid(positionId)||!valid(requestKey))return res.status(400).json({message:'Falta equipo, posicion o identificador de operacion.'});
 try{
 const result=await prisma.$transaction(async tx=>{
  const [eq]=await tx.$queryRaw<Array<{id:string;quantity:number;serial:string|null;category:string;type:string|null;status:string;condition:string;positionId:string|null}>>`
    SELECT id,quantity,serial,category,type,status,condition,"positionId" FROM public."Equipment" WHERE id=${equipmentId} FOR UPDATE`;
  if(!eq)return {code:404,message:'Producto no encontrado.'};
  const existing=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM public.it_stock_event WHERE request_key=${requestKey} LIMIT 1`;
  if(existing.length)return {code:200,message:'Operacion ya registrada; no se duplico.',duplicate:true};
  if(eq.positionId||(eq.serial&&eq.quantity!==1))return {code:409,message:'El equipo no es elegible para asignacion desde Almacen.'};
  const role=classify(eq.category,eq.type);
  if(role==='MAIN')return {code:409,message:'Computadoras principales deben ser individuales.'};
  if(eq.quantity===1 && qty!==1)return {code:409,message:'Este equipo es una unidad individual; solo se puede asignar una unidad.'};
  if(expectedRole!==role)return {code:409,message:'El producto no corresponde a la categoría seleccionada.'};
  if(['DAMAGED','RETIRED','DISCARDED','SCRAPPED','IN_REPAIR','REPAIR'].includes(eq.condition.toUpperCase())||eq.status.toUpperCase()==='RETIRED')return {code:409,message:'Producto no asignable por su estado.'};
  const p=await tx.position.findUnique({where:{id:positionId},select:{code:true}});
  if(!p)return {code:404,message:'Posicion inexistente.'};
  const bal=await tx.$queryRaw<Array<{bucket:string;units:number}>>`SELECT bucket,units FROM public.it_stock_balance WHERE equipment_id=${equipmentId}`;
  if(!bal.length)return {code:409,message:'Lote aun sin conciliacion. No se presume disponible.'};
  if((bal.find(b=>b.bucket==='WAREHOUSE_AVAILABLE')?.units||0)<qty)return {code:409,message:'Sin unidades disponibles en Almacen.'};
  const total=bal.reduce((s,b)=>s+b.units,0);
  if(total!==eq.quantity)return {code:409,message:'Saldos inconsistentes con cantidad total. Revisar conciliacion.'};
  const updated=await tx.$executeRaw`UPDATE public.it_stock_balance SET units=units-${qty},updated_at=now() WHERE equipment_id=${equipmentId} AND bucket='WAREHOUSE_AVAILABLE' AND units>=${qty}`;
  if(updated!==1)return {code:409,message:'Saldo cambiado. Actualiza la lista.'};
  await tx.$executeRaw`INSERT INTO public.it_stock_balance(equipment_id,bucket,units) VALUES (${equipmentId},'PRODUCTION',${qty}) ON CONFLICT(equipment_id,bucket) DO UPDATE SET units=public.it_stock_balance.units+${qty},updated_at=now()`;
  const ids=Array.from({length:qty},()=>randomUUID());
  for(const id of ids){await tx.$executeRaw`INSERT INTO public.it_position_lot_allocation(id,equipment_id,position_id,role,quantity) VALUES(${id},${equipmentId},${positionId},${role},1)`;}
  const id=ids[0];
  await tx.$executeRaw`INSERT INTO public.it_stock_event(equipment_id,action,quantity,from_bucket,to_bucket,position_id,reference,reason,actor,request_key)
    VALUES(${equipmentId},'TRANSFER',${qty},'WAREHOUSE_AVAILABLE','PRODUCTION',${positionId},${id},'Asignacion de lote a posicion','POSITION_LOTS',${requestKey})`;
  await tx.historyEntry.create({data:{module:'POSITIONS',entityType:'POSITION',entityId:positionId,action:'LOT_UNIT_ASSIGN',description:`${role} de lote ${equipmentId} asignado a ${p.code}`,newData:{equipmentId,allocationIds:ids,quantity:qty}}});
  return {code:201,message:'Unidades asignadas correctamente.',allocationIds:ids};
 },{isolationLevel:'Serializable',timeout:12000});
 return res.status(result.code).json(result);
 }catch(e){console.error('Lot assign failed',e);return res.status(409).json({message:'No se completo la asignacion; no se aplicaron movimientos parciales. '+message(e)})}
});
router.post('/return',async(req,res)=>{
 const {allocationId,requestKey}=req.body||{};
 if(!valid(allocationId)||!valid(requestKey))return res.status(400).json({message:'Falta asignacion o identificador de operacion.'});
 try{
 const result=await prisma.$transaction(async tx=>{
  const [a]=await tx.$queryRaw<Array<{id:string;equipment_id:string;position_id:string;role:string;quantity:number}>>`
   SELECT a.* FROM public.it_position_lot_allocation a WHERE id=${allocationId}`;
  if(!a)return {code:404,message:'Asignacion ya no existe.'};
  const [eq]=await tx.$queryRaw<Array<{quantity:number}>>`SELECT quantity FROM public."Equipment" WHERE id=${a.equipment_id} FOR UPDATE`;
  if(!eq)return {code:409,message:'Lote inexistente.'};
  const found=await tx.$queryRaw<Array<{id:string}>>`SELECT id FROM public.it_position_lot_allocation WHERE id=${allocationId} FOR UPDATE`;
  if(!found.length)return {code:409,message:'Asignacion modificada concurrentemente.'};
  const b=await tx.$queryRaw<Array<{bucket:string;units:number}>>`SELECT bucket,units FROM public.it_stock_balance WHERE equipment_id=${a.equipment_id}`;
  if(b.reduce((s,x)=>s+x.units,0)!==eq.quantity)return {code:409,message:'Saldos inconsistentes. Se cancelo la devolucion.'};
  const taken=await tx.$executeRaw`UPDATE public.it_stock_balance SET units=units-1,updated_at=now() WHERE equipment_id=${a.equipment_id} AND bucket='PRODUCTION' AND units>=1`;
  if(taken!==1)return {code:409,message:'No hay saldo de produccion suficiente.'};
  await tx.$executeRaw`INSERT INTO public.it_stock_balance(equipment_id,bucket,units) VALUES(${a.equipment_id},'WAREHOUSE_AVAILABLE',1) ON CONFLICT(equipment_id,bucket) DO UPDATE SET units=public.it_stock_balance.units+1,updated_at=now()`;
  await tx.$executeRaw`DELETE FROM public.it_position_lot_allocation WHERE id=${allocationId}`;
  await tx.$executeRaw`INSERT INTO public.it_stock_event(equipment_id,action,quantity,from_bucket,to_bucket,position_id,reference,reason,actor,request_key)
    VALUES(${a.equipment_id},'TRANSFER',1,'PRODUCTION','WAREHOUSE_AVAILABLE',${a.position_id},${allocationId},'Devolucion confirmada en buen estado','POSITION_LOTS',${requestKey})`;
  await tx.historyEntry.create({data:{module:'POSITIONS',entityType:'POSITION',entityId:a.position_id,action:'LOT_UNIT_RETURN',description:`Devolucion de accesorio ${a.role} del lote ${a.equipment_id}`,oldData:{allocationId,equipmentId:a.equipment_id,quantity:1}}});
  return {code:200,message:'Unidad devuelta a Almacen.'};
 },{isolationLevel:'Serializable',timeout:12000});
 return res.status(result.code).json(result);
 }catch(e){console.error('Lot return failed',e);return res.status(409).json({message:'No se completo la devolucion; no se aplicaron cambios parciales. '+message(e)})}
});
export default router;
