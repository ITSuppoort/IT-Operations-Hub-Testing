/* Fase 14K: Run from backend directory: node scripts/importar-p2o.cjs [--apply]
   Default is read-only preview. Scoped exclusively to Piso 2 WEST.
   Does not remove linked records and aborts if existing conflicting codes are found.
*/
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
try { require('dotenv').config(); } catch {}
const prisma = new PrismaClient();
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogo-p2o.json'), 'utf8'));
const apply = process.argv.includes('--apply');
const replaceEmpty = process.argv.includes('--replace-empty');
const expected = 'P2O-147-POSICIONES';
const saveDir = path.join(__dirname, 'respaldos-p2o');
function fail(message) { throw new Error(message); }
async function main() {
  if (catalog.length !== 147 || new Set(catalog.map(p=>p.code)).size !== 147) fail('Catalogo invalido');
  const locations = await prisma.mapLocation.findMany({where:{floorNumber:2,wing:'WEST'},select:{id:true,name:true,floorNumber:true,wing:true}});
  const ids = locations.map(x=>x.id);
  const old = ids.length ? await prisma.position.findMany({where:{locationId:{in:ids}},include:{equipment:{select:{id:true,serial:true,pcName:true}},area:{select:{name:true}},inventoryPerson:{select:{id:true}},assignedUser:{select:{id:true}}}}) : [];
  const allCodes = await prisma.position.findMany({where:{code:{in:catalog.map(p=>p.code)}},select:{id:true,code:true,locationId:true}});
  const external = allCodes.filter(x=>!ids.includes(x.locationId));
  if (external.length) fail('Codigos P2O usados en otro sector. Abortado: '+external.map(x=>x.code).join(','));
  const linked = old.filter(p=>p.equipment||p.inventoryPersonId||p.assignedUserId||p.inventoryPerson||p.assignedUser);
  const desired = new Set(catalog.map(p=>p.code));
  const legacy = old.filter(p=>!desired.has(p.code));
  console.log(JSON.stringify({sector:'Piso 2 Oeste',catalogo:catalog.length,ubicaciones:locations,existentesSector:old.length,yaCatalogadas:old.filter(p=>desired.has(p.code)).length,fueraCatalogo:legacy.length,conVinculos:linked.length,conVinculosFueraCatalogo:legacy.filter(p=>linked.includes(p)).length},null,2));
  if(!apply){ console.log('MODO VISTA PREVIA. No hubo cambios. Para importar: --apply (sin borrados).'); return; }
  if(process.env.P2O_CONFIRMACION !== expected) fail('Falta confirmar: $env:P2O_CONFIRMACION="'+expected+'"');
  // Backup mandatory BEFORE changes; never store secrets in backup output.
  fs.mkdirSync(saveDir,{recursive:true});
  const stamp = new Date().toISOString().replace(/[:.]/g,'-');
  const backup = path.join(saveDir,'backup-'+stamp+'.json');
  fs.writeFileSync(backup,JSON.stringify({createdAt:new Date().toISOString(),locations,positions:old.map(p=>({id:p.id,code:p.code,name:p.name,status:p.status,wing:p.wing,locationId:p.locationId,areaId:p.areaId,assignedUserId:p.assignedUserId,inventoryPersonId:p.inventoryPersonId,equipmentId:p.equipment?.id||null}))},null,2));
  console.log('RESPALDO: '+backup);
  if (replaceEmpty && legacy.some(p=>linked.includes(p))) fail('Existen posiciones antiguas con usuario o equipo. No se eliminara ninguna.');
  // atomic transaction: create canonical location, areas, missing positions, optional deletion of ONLY unlinked sector legacy
  const result=await prisma.$transaction(async tx=>{
    let loc=await tx.mapLocation.findFirst({where:{name:'Piso 2 - WEST',floorNumber:2,wing:'WEST'}});
    if(!loc)loc=await tx.mapLocation.create({data:{name:'Piso 2 - WEST',floorNumber:2,wing:'WEST',type:'FLOOR_WING'}});
    const areas={};
    for(const a of ['OPERACIONES','SUPERVISION']){
      areas[a]=await tx.area.findFirst({where:{locationId:loc.id,name:a}});
      if(!areas[a])areas[a]=await tx.area.create({data:{locationId:loc.id,name:a}});
    }
    let created=0;
    for(const p of catalog){
      const existing=await tx.position.findUnique({where:{code:p.code},select:{id:true}});
      if(!existing){await tx.position.create({data:{code:p.code,name:p.name,locationId:loc.id,areaId:areas[p.area].id,wing:'WEST',status:'EMPTY'}});created++;}
    }
    let deleted=0;
    if(replaceEmpty){
      // To avoid ambiguous legacy cleanup, require all old rows from single location and no links.
      for(const p of legacy){await tx.position.delete({where:{id:p.id}});deleted++;}
    }
    return {created,deleted,retained:old.length-deleted};
  },{timeout:120000,maxWait:20000});
  console.log('RESULTADO '+JSON.stringify(result));
  if(!replaceEmpty)console.log('Las posiciones anteriores permanecen. Revise vinculos antes de eliminarlas.');
}
main().catch(e=>{console.error('ABORTADO: '+e.message);process.exitCode=1}).finally(async()=>{await prisma.$disconnect()});
