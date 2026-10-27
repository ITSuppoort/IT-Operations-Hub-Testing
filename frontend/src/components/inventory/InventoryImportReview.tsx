'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileSpreadsheet, UploadCloud, X } from 'lucide-react'

type Existing = { serial?: string; type?: string }
type Entry = { line: number; type: string; brand: string; model: string; serial: string; quantity: string; state: string; location: string; errors: string[]; warnings: string[] }
const aliases: Record<string,string[]> = {
  type:['tipo','type','categoria','category','tipo de activo'], brand:['marca','brand'],model:['modelo','model'],serial:['serial','serie','numero de serie'],
  quantity:['cantidad','quantity','qty'],state:['estado','status','estado inicial'],location:['ubicacion','location','almacen','warehouse']
}
const normalize=(v:string)=>v.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[_\-]+/g,' ').replace(/\s+/g,' ')
function csvRows(content:string):string[][] {
  const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false
  for(let i=0;i<content.length;i++){
    const ch=content[i]
    if(ch==='"') {if(quoted&&content[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
    else if(!quoted&&(ch===','||ch===';'||ch==='\t')){row.push(cell);cell=''}
    else if(!quoted&&(ch==='\n'||ch==='\r')){if(ch==='\r'&&content[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}
    else cell+=ch
  }
  row.push(cell);if(row.some(x=>x.trim()))rows.push(row)
  return rows
}
function parseCsv(content:string, existing:Existing[]):Entry[] {
  const all=csvRows(content.replace(/^\uFEFF/,''));if(!all.length)throw new Error('El archivo está vacío.')
  const headers=all[0].map(normalize)
  const find=(key:string)=>headers.findIndex(header=>aliases[key].includes(header))
  if(find('type')<0||find('quantity')<0)throw new Error('Faltan columnas obligatorias: Tipo y Cantidad.')
  const current=new Set(existing.map(e=>normalize(e.serial||'')).filter(Boolean));const seen=new Set<string>()
  return all.slice(1).map((cells,i)=>{
    const get=(k:string)=>{const index=find(k);return index<0?'':(cells[index]||'').trim()}
    const type=get('type'),brand=get('brand'),model=get('model'),serial=get('serial'),quantity=get('quantity'),state=get('state'),location=get('location')
    const errors:string[]=[],warnings:string[]=[];const n=Number(quantity)
    if(!type)errors.push('Falta tipo')
    if(!Number.isSafeInteger(n)||n<1||n>1000)errors.push('Cantidad inválida (1–1000)')
    if(!brand)warnings.push('Marca pendiente')
    if(!location)warnings.push('Ubicación sin especificar')
    if(!state)warnings.push('Estado sin especificar')
    if(['desktop','laptop','all in one','headset'].includes(normalize(type))&&!serial)warnings.push('Serial pendiente de verificar')
    if(serial){const value=normalize(serial);if(current.has(value))errors.push('Serial ya registrado');if(seen.has(value))errors.push('Serial duplicado en archivo');seen.add(value)}
    return {line:i+2,type,brand,model,serial,quantity,state,location,errors,warnings}
  })
}
export default function InventoryImportReview({existing,onClose}:{existing:Existing[];onClose:()=>void}){
  const [rows,setRows]=useState<Entry[]>([]),[error,setError]=useState(''),[filename,setFilename]=useState('')
  const totals=useMemo(()=>({valid:rows.filter(r=>!r.errors.length&&!r.warnings.length).length,review:rows.filter(r=>!r.errors.length&&r.warnings.length>0).length,invalid:rows.filter(r=>r.errors.length>0).length}),[rows])
  const upload=async(file:File|undefined)=>{
    if(!file)return
    setFilename(file.name);setRows([]);setError('')
    if(!/\.csv$/i.test(file.name)){setError('Esta etapa admite CSV exportado desde Excel. El archivo .xlsx se habilitará al incorporar el lector seguro de Excel.');return}
    if(file.size>5_000_000){setError('Archivo demasiado grande. Máximo 5 MB para esta revisión.');return}
    try{const content=await file.text();const parsed=parseCsv(content,existing);if(parsed.length>5000)throw new Error('Máximo 5,000 filas por revisión.');setRows(parsed)}catch(e){setError(e instanceof Error?e.message:'No se pudo leer el archivo')}
  }
  return <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-md sm:p-6" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <section role="dialog" aria-modal="true" aria-label="Revisión previa de importación" className="inv-panel w-full max-w-5xl overflow-hidden rounded-2xl shadow-2xl" style={{maxHeight:'90vh',display:'flex',flexDirection:'column'}}>
      <header className="flex items-start justify-between gap-3 border-b border-white/10 p-5"><div><p className="inv-kicker text-xs tracking-widest">IMPORTACIÓN CONTROLADA / IMPORT PREVIEW</p><h2 className="mt-1 text-xl font-bold">Revisar archivo antes de importar</h2><p className="inv-muted mt-1 text-xs">Ninguna fila se guardará en esta fase. No modifica la API ni el inventario.</p></div><button className="inv-btn" type="button" aria-label="Cerrar" onClick={onClose}><X size={18}/></button></header>
      <div className="overflow-y-auto p-5">
        <label className="inv-category flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-center"><UploadCloud size={26}/><strong>Seleccionar CSV exportado desde Excel</strong><span className="inv-muted text-xs">Columnas mínimas: Tipo y Cantidad. Otras columnas pueden faltar y se mostrarán como pendientes.</span><input type="file" accept=".csv,text/csv" className="sr-only" onChange={e=>void upload(e.target.files?.[0])}/></label>
        {filename&&<p className="inv-muted mt-3 text-xs"><FileSpreadsheet size={14} className="mr-1 inline"/>{filename}</p>}
        {error&&<p role="alert" className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
        {rows.length>0&&<><div className="mt-4 grid grid-cols-3 gap-2"><div className="inv-category"><CheckCircle2 size={16}/><strong className="block text-xl">{totals.valid}</strong><span className="inv-muted text-xs">Completas</span></div><div className="inv-category"><AlertTriangle size={16}/><strong className="block text-xl">{totals.review}</strong><span className="inv-muted text-xs">Pendientes</span></div><div className="inv-category"><X size={16}/><strong className="block text-xl">{totals.invalid}</strong><span className="inv-muted text-xs">Con errores</span></div></div>
        <div className="mt-4 overflow-x-auto"><table className="inv-table w-full min-w-[700px] text-left text-xs"><thead><tr>{['Fila','Tipo','Marca','Modelo','Serie','Cantidad','Estado','Ubicación','Revisión'].map(h=><th key={h} className="px-3 py-2">{h}</th>)}</tr></thead><tbody>{rows.slice(0,250).map(r=><tr key={r.line}><td className="px-3 py-3">{r.line}</td>{[r.type,r.brand,r.model,r.serial,r.quantity,r.state,r.location].map((v,i)=><td className="px-3 py-3" key={i}>{v||'—'}</td>)}<td className="px-3 py-3">{r.errors.length?<span className="text-rose-400">{r.errors.join('; ')}</span>:r.warnings.length?<span className="text-amber-400">{r.warnings.join('; ')}</span>:<span className="text-emerald-400">Completa</span>}</td></tr>)}</tbody></table></div>{rows.length>250&&<p className="inv-muted mt-2 text-xs">Vista limitada a las primeras 250 filas; el resumen cuenta todas.</p>}</>}
      </div><footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4"><span className="inv-muted text-xs">Revisión local · Sin guardar · Sin cambios en producción</span><button className="inv-btn inv-primary" type="button" onClick={onClose}>Cerrar revisión</button></footer>
    </section>
  </div>
}
