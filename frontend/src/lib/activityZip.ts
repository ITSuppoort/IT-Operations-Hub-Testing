// ZIP sin compresion (formato STORE), compatible con Windows Explorer.
// No contiene respaldo de PostgreSQL: solo exportacion verificable de actividad.
const enc=new TextEncoder();
const u16=(n:number)=>[n&255,(n>>>8)&255];
const u32=(n:number)=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
function crc32(bytes:Uint8Array){let c=0xffffffff;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0}
export function makeActivityZip(files:{name:string;data:string}[]):Blob{
 const locals:number[]=[];const central:number[]=[];let offset=0;
 for(const f of files){
  if(!/^[a-zA-Z0-9_.-]+$/.test(f.name))throw new Error('Nombre de archivo no valido');
  const name=enc.encode(f.name), data=enc.encode(f.data),crc=crc32(data);
  const local=[...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...name,...data];
  locals.push(...local);
  central.push(...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name);
  offset+=local.length;
 }
 const end=[...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(central.length),...u32(locals.length),...u16(0)];
 return new Blob([new Uint8Array([...locals,...central,...end])],{type:'application/zip'});
}
