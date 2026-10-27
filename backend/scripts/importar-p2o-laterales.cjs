/* Fase 14L - importador conservador 23 posiciones laterales. Default = lectura. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {PrismaClient}=require('@prisma/client');
try{require('dotenv').config()}catch{}
const prisma=new PrismaClient();
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'catalogo-p2o-laterales.json'),'utf8'));
const apply=process.argv.includes('--apply');
const codes=catalog.map(x=>x.code);
const isLinked=p=>Boolean(p.equipment || p.inventoryPersonId || p.assignedUserId || p.inventoryPerson || p.assignedUser);
async function main(){
 if(catalog.length!==23 || new Set(codes).size!==23 || catalog.some(x=>!/^P2O-(IT|POD4|ENF|VP|PM)-\d{2}$/.test(x.code))) throw Error('Catalogo de 23 invalido');
 const locations=await prisma.mapLocation.findMany({where:{floorNumber:2,wing:'WEST'},select:{id:true,name:true,floorNumber:true,wing:true}});
 if(locations.length!==1 || locations[0].name!=='Piso 2 - WEST')throw Error('Sector ambiguo: requiere una ubicacion Piso 2 - WEST unica. No se modifica nada.');
 const loc=locations[0];
 const existing=await prisma.position.findMany({where:{locationId:loc.id},include:{equipment:{select:{id:true}},inventoryPerson:{select:{id:true}},assignedUser:{select:{id:true}}}});
 const collisions=await prisma.position.findMany({where:{code:{in:codes}},select:{id:true,code:true,locationId:true}});
 if(collisions.some(p=>p.locationId!==loc.id))throw Error('Hay codigos registrados fuera de Piso 2 Oeste; abortado');
 const legacy=existing.filter(p=>/^P2O-(TI|TR4)-\d{2}$/.test(p.code));
 if(legacy.length)throw Error('Existen codigos laterales con nomenclatura anterior: '+legacy.map(p=>p.code).join(', ')+'. No crear duplicados. Es necesario migrar nombres conservando IDs.');
 const lookup=new Set(existing.map(x=>x.code));
 const official=existing.filter(p=>/^P2O-/.test(p.code));
 const other=existing.filter(p=>!/^P2O-/.test(p.code));
 const base=existing.filter(p=>/^P2O-R1-/.test(p.code));
 const report={sector:loc.name,catalogoLaterales:23,yaCreadas:codes.filter(c=>lookup.has(c)).length,pendientes:codes.filter(c=>!lookup.has(c)),posicionesActualesSector:existing.length,oficialesP2O:official.length,posicionesR1:base.length,otrasPosiciones:other.map(p=>({code:p.code,conVinculos:isLinked(p)})),eliminacionesPrevistas:0};
 console.log(JSON.stringify(report,null,2));
 if(!apply){console.log('VISTA PREVIA: cero escrituras. Para crear pendientes: --apply');return;}
 if(process.env.P2O_LATERALES_CONFIRMACION!=='P2O-23-CONFIRMADO')throw Error('Confirmacion requerida: $env:P2O_LATERALES_CONFIRMACION="P2O-23-CONFIRMADO"');
 if(base.length!==147)throw Error('Se esperan las 147 posiciones R1 antes de importar laterales. No se modifico nada.');
 const dir=path.join(__dirname,'respaldos-p2o');fs.mkdirSync(dir,{recursive:true});
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');const backup=path.join(dir,'backup-laterales-'+stamp+'.json');
 fs.writeFileSync(backup,JSON.stringify({createdAt:new Date().toISOString(),location:loc,positions:existing.map(p=>({id:p.id,code:p.code,name:p.name,status:p.status,locationId:p.locationId,areaId:p.areaId,assignedUserId:p.assignedUserId,inventoryPersonId:p.inventoryPersonId,equipmentId:p.equipment?.id||null}))},null,2));
 console.log('RESPALDO DE POSICIONES: '+backup);
 const result=await prisma.$transaction(async tx=>{
  const areaIds={};for(const name of [...new Set(catalog.map(x=>x.area))]){
   let area=await tx.area.findFirst({where:{locationId:loc.id,name}});
   if(!area)area=await tx.area.create({data:{locationId:loc.id,name}});
   areaIds[name]=area.id;
  }
  let created=0;
  for(const item of catalog){
   const e=await tx.position.findUnique({where:{code:item.code}});
   if(e){if(e.locationId!==loc.id)throw Error('Codigo externo: '+item.code);continue;}
   await tx.position.create({data:{code:item.code,name:item.name,locationId:loc.id,areaId:areaIds[item.area],wing:'WEST',status:'EMPTY'}});created++;
  }
  return {created,deleted:0};
 },{timeout:120000,maxWait:20000});
 console.log('RESULTADO: '+JSON.stringify(result));
 const final=await prisma.position.count({where:{locationId:loc.id,code:{startsWith:'P2O-'}}});
 console.log('TOTAL CODIGOS P2O EN SECTOR: '+final);
 console.log('No se borraron posiciones antiguas ni se cambiaron asignaciones.');
}
main().catch(e=>{console.error('ABORTADO: '+e.message);process.exitCode=1}).finally(async()=>{await prisma.$disconnect()});
