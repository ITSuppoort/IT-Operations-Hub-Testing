"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiRequest } from "../../../lib/api";

type Position = { code: string; area: string };
type Pin = { x: number; y: number };
type Saved = { version: 1; floor: 1; pins: Record<string, Pin> };
type RealPosition = { id: string; code: string; name?: string | null; inventoryPersonId?: string | null; inventoryPerson?: {id:string;firstName:string;lastName:string} | null; equipment?: {pcName?:string|null;serial?:string|null;category?:string|null;type?:string|null} | null; location?:{floorNumber?:number|null} | null };
type ReviewSummary = {positionId:string; completed:number;total:number;counts?:Record<string,number>};
type SeatState = "empty" | "incomplete" | "complete" | "occupied" | "unknown";
const COLORS: Record<SeatState,string> = {empty:"#f43f5e",incomplete:"#f59e0b",complete:"#10b981",occupied:"#38bdf8",unknown:"#94a3b8"};
const LABELS: Record<SeatState,string> = {empty:"Vacía / sin equipo",incomplete:"Incompleta / requiere revisión",complete:"Completa / libre",occupied:"Completa / en uso",unknown:"Sin verificar"};
const STORE = "it-hub:piso1-premium:calibracion:v1";
const positions: Position[] = [
  {
    "code": "P1-F01",
    "area": "Finanzas"
  },
  {
    "code": "P1-F02",
    "area": "Finanzas"
  },
  {
    "code": "P1-F03",
    "area": "Finanzas"
  },
  {
    "code": "P1-F04",
    "area": "Finanzas"
  },
  {
    "code": "P1-F05",
    "area": "Finanzas"
  },
  {
    "code": "P1-F06",
    "area": "Finanzas"
  },
  {
    "code": "P1-FVP",
    "area": "Finanzas"
  },
  {
    "code": "P1-CEO",
    "area": "Dirección"
  },
  {
    "code": "P1-HRG",
    "area": "Recursos Humanos"
  },
  {
    "code": "P1-H01",
    "area": "Recursos Humanos"
  },
  {
    "code": "P1-H02",
    "area": "Recursos Humanos"
  },
  {
    "code": "P1-H03",
    "area": "Recursos Humanos"
  },
  {
    "code": "P1-H04",
    "area": "Recursos Humanos"
  },
  {
    "code": "P1-EX01",
    "area": "Exámenes AIO"
  },
  {
    "code": "P1-EX02",
    "area": "Exámenes AIO"
  },
  {
    "code": "P1-R01",
    "area": "Reclutamiento"
  },
  {
    "code": "P1-R02",
    "area": "Reclutamiento"
  },
  {
    "code": "P1-R03",
    "area": "Reclutamiento"
  },
  {
    "code": "P1-R04",
    "area": "Reclutamiento"
  },
  {
    "code": "P1-REC01",
    "area": "Recepción"
  },
  {
    "code": "P1-REC02",
    "area": "Recepción"
  },
  {
    "code": "P1-T1-01",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-02",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-03",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-04",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-05",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-06",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-07",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-08",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-09",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-10",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-11",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-12",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-13",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-14",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-15",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-16",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-17",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-18",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-19",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T1-20",
    "area": "Training Pod 1"
  },
  {
    "code": "P1-T2-01",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-02",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-03",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-04",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-05",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-06",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-07",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-08",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-09",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-10",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-11",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-12",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-13",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-14",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-15",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-16",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-17",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-18",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-19",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T2-20",
    "area": "Training Pod 2"
  },
  {
    "code": "P1-T3-01",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-02",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-03",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-04",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-05",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-06",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-07",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-08",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-09",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-10",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-11",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-12",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-13",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-14",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-15",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-16",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-17",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-18",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-19",
    "area": "Training Pod 3"
  },
  {
    "code": "P1-T3-20",
    "area": "Training Pod 3"
  }
];
const initial: Record<string, Pin> = {};
const buttonStyle: React.CSSProperties = { background: "#173451", color: "#e5f5ff", border: "1px solid #47718d", borderRadius: 8, padding: "9px 12px", cursor: "pointer" };
const clamp = (n: number) => Math.round(Math.max(0, Math.min(100, n)) * 1000) / 1000;
function validPins(raw: unknown): Record<string, Pin> {
  if (!raw || typeof raw !== "object") throw new Error("Formato de coordenadas inválido");
  const doc = raw as Partial<Saved>;
  if (doc.version !== 1 || doc.floor !== 1 || !doc.pins || typeof doc.pins !== "object") throw new Error("El archivo no corresponde a la calibración del Piso 1");
  const allowed = new Set(positions.map(p => p.code));
  const next: Record<string, Pin> = {};
  for (const [code, v] of Object.entries(doc.pins)) {
    if (!allowed.has(code)) { if (code === "P1-HRD") continue; throw new Error(`Código desconocido: ${code}`); }
    if (!v || typeof v.x !== "number" || typeof v.y !== "number" || !Number.isFinite(v.x) || !Number.isFinite(v.y) || v.x < 0 || v.x > 100 || v.y < 0 || v.y > 100) throw new Error(`Coordenada incorrecta: ${code}`);
    next[code] = { x: clamp(v.x), y: clamp(v.y) };
  }
  return next;
}
export default function Piso1Premium() {
  const [pins, setPins] = useState<Record<string, Pin>>(initial);
  const [realPositions,setRealPositions] = useState<RealPosition[]>([]);
  const [reviews,setReviews] = useState<ReviewSummary[]>([]);
  const [apiError,setApiError] = useState("");
  const [reviewsReady,setReviewsReady] = useState(false);
  const [loading,setLoading] = useState(true);
  const [selected, setSelected] = useState("P1-R01");
  const [edit, setEdit] = useState(true);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("Todas");
  const [zoom, setZoom] = useState(1);
  const [message, setMessage] = useState("Selecciona un código y luego haz clic en el centro de su computadora en el plano.");
  const [ready, setReady] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORE);
      if (saved) setPins(validPins(JSON.parse(saved)));
    } catch { setMessage("La calibración previa no pudo cargarse; puedes importar una copia JSON."); }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { window.localStorage.setItem(STORE, JSON.stringify({ version: 1, floor: 1, pins })); } catch { setMessage("No se pudo guardar en el navegador. Exporta JSON para conservar el trabajo."); } }, [pins, ready]);
  useEffect(() => {
    let active = true;
    async function refresh() {
      if (active) setLoading(true);
      try {
        const [a,b] = await Promise.all([
          apiRequest("/positions",{cache:"no-store"}),
          apiRequest("/positions/checklist-review-summary",{cache:"no-store"})
        ]);
        if (!a.ok) throw new Error(`API posiciones HTTP ${a.status}`);
        const ps: unknown = await a.json();
        if (!Array.isArray(ps)) throw new Error("La API de posiciones no devolvió una lista");
        if (active) { setRealPositions(ps as RealPosition[]); setApiError(""); }
        if (b.ok) {
          const rs: unknown = await b.json();
          if (active) { setReviews(Array.isArray(rs)?rs as ReviewSummary[]:[]);setReviewsReady(Array.isArray(rs)); }
        } else if (active) {setReviewsReady(false);setReviews([]);}
      } catch(e) {
        if (active) {setApiError(e instanceof Error?e.message:"Error de consulta");setReviewsReady(false);setRealPositions([]);}
      } finally {if(active)setLoading(false);}
    }
    void refresh();
    const focus=()=>{void refresh()};
    window.addEventListener("focus",focus);
    return ()=>{active=false;window.removeEventListener("focus",focus)};
  },[]);
  const realByCode = useMemo(()=>new Map(realPositions.filter(p=>p.code?.startsWith("P1-")).map(p=>[p.code.toUpperCase(),p])),[realPositions]);
  const reviewById = useMemo(()=>new Map(reviews.map(r=>[r.positionId,r])),[reviews]);
  function stateOf(code:string): SeatState {
    const p=realByCode.get(code.toUpperCase());
    if(!p || !reviewsReady)return "unknown";
    const r=reviewById.get(p.id);
    const equipment=Boolean(p.equipment);
    const person=Boolean(p.inventoryPersonId || p.inventoryPerson?.id);
    if(!r)return equipment||person?"incomplete":"empty";
    if(r.total>0 && r.completed>=r.total)return person?"occupied":"complete";
    return equipment||person||Object.values(r.counts||{}).some(n=>n>0)?"incomplete":"empty";
  }
  const counts = positions.reduce((a,p)=>{a[stateOf(p.code)]++;return a;},{empty:0,incomplete:0,complete:0,occupied:0,unknown:0} as Record<SeatState,number>);
  const currentReal=realByCode.get(selected.toUpperCase());
  const currentReview=currentReal?reviewById.get(currentReal.id):undefined;
  const areas = useMemo(() => ["Todas", ...Array.from(new Set(positions.map(p => p.area)))], []);
  const visible = useMemo(() => positions.filter(p => (area === "Todas" || p.area === area) && `${p.code} ${p.area}`.toLowerCase().includes(query.toLowerCase())), [area, query]);
  const completed = positions.filter(p => !!pins[p.code]).length;
  const chosen = positions.find(p => p.code === selected);
  function mapClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!edit || !imageRef.current || (event.target as HTMLElement).closest("[data-pin]")) return;
    const bounds = imageRef.current.getBoundingClientRect();
    const x = clamp(((event.clientX - bounds.left) / bounds.width) * 100);
    const y = clamp(((event.clientY - bounds.top) / bounds.height) * 100);
    setPins(prev => ({ ...prev, [selected]: { x, y } }));
    setMessage(`${selected}: posición visual registrada (${x}%, ${y}%). Solo se guarda en tu navegador.`);
    const idx = positions.findIndex(p => p.code === selected);
    const next = positions.slice(idx + 1).find(p => !pins[p.code]);
    if (next) setSelected(next.code);
  }
  function exportJson() {
    const data: Saved = { version: 1, floor: 1, pins };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "Piso1-Posiciones-Calibradas.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importJson(file?: File) {
    if (!file) return;
    try { setPins(validPins(JSON.parse(await file.text()))); setMessage("Archivo importado. Verifica visualmente las posiciones antes de continuar."); }
    catch (error) { setMessage(`No importado: ${error instanceof Error ? error.message : "archivo inválido"}`); }
  }
  return <main style={{ background: "#07111f", color: "#e5f2ff", minHeight: "100vh", fontFamily: "Arial, sans-serif", padding: 18 }}>
    <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
      <div><h1 style={{ margin: 0, fontSize: 22 }}>Piso 1 · Mapa Premium · 81 posiciones reales</h1><div style={{ color: "#a8bdd6", fontSize: 12, marginTop: 5 }}>Vista piloto independiente · lectura desde API de inventario · no modifica PostgreSQL</div></div>
      <Link href="/map" style={buttonStyle}>Regresar al Floor Editor</Link>
    </header>
    <section style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
      <label>Posición <select value={selected} onChange={e => setSelected(e.target.value)} style={{ ...buttonStyle, maxWidth: 245 }}>{positions.map(p => <option key={p.code} value={p.code}>{p.code} · {p.area}</option>)}</select></label>
      <label style={{ display: "flex", alignItems: "center", gap: 5 }}><input type="checkbox" checked={edit} onChange={e => setEdit(e.target.checked)}/> Modo calibración</label>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar código o área" aria-label="Buscar posiciones" style={{ ...buttonStyle, minWidth: 180 }} />
      <select value={area} onChange={e => setArea(e.target.value)} aria-label="Filtrar área" style={buttonStyle}>{areas.map(a => <option key={a}>{a}</option>)}</select>
      <button style={buttonStyle} onClick={() => setZoom(z => Math.max(.7, Math.round((z - .1) * 100) / 100))}>− Zoom</button>
      <span>{Math.round(zoom * 100)}%</span>
      <button style={buttonStyle} onClick={() => setZoom(z => Math.min(2, Math.round((z + .1) * 100) / 100))}>+ Zoom</button>
      <button style={buttonStyle} onClick={exportJson}>Exportar JSON</button>
      <button style={buttonStyle} onClick={() => inputRef.current?.click()}>Importar JSON</button>
      <input ref={inputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={e => { void importJson(e.target.files?.[0]); e.target.value = ""; }}/>
    </section>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
      {(Object.keys(counts) as SeatState[]).map(st=><div key={st} title={LABELS[st]} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 11px",border:"1px solid #3b536d",borderRadius:9}}><span style={{width:9,height:9,borderRadius:20,background:COLORS[st]}}/>{LABELS[st]}: <b>{counts[st]}</b></div>)}
      <span style={{fontSize:12,color:apiError?"#fda4af":"#a7cadc",alignSelf:"center"}}>{loading?"Consultando inventario...":apiError?`Sin datos reales: ${apiError}`:!reviewsReady?"Checklist no disponible: estados sin verificar":"Datos reales cargados"}</span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 15, marginBottom: 10, flexWrap: "wrap" }}><b>{completed}/{positions.length} puntos calibrados</b><span style={{ color: "#7ed4ef" }}>Seleccionado: {chosen?.code} · {chosen?.area}</span><span style={{ color: "#f5d694", fontSize: 12 }}>{message}</span></div>
    <div style={{ overflow: "auto", border: "1px solid #355a78", borderRadius: 12, background: "#0b192a", padding: 8 }}>
      <div ref={imageRef} onClick={mapClick} style={{ width: `${zoom * 100}%`, minWidth: 870, margin: "auto", position: "relative", cursor: edit ? "crosshair" : "default" }}>
        <img src="/p1-premium/floor1-render.webp" alt="Render arquitectónico del Piso 1, solo de referencia" draggable={false} style={{ width: "100%", display: "block", userSelect: "none" }}/>
        {visible.filter(p => pins[p.code]).map(p => <button key={p.code} type="button" data-pin title={`${p.code} · ${p.area} · ${LABELS[stateOf(p.code)]}`} aria-label={`Seleccionar ${p.code}`} onClick={e => { e.stopPropagation(); setSelected(p.code); setMessage(`${p.code} · ${p.area}. Para reubicar, haz clic en el escritorio correcto.`); }} style={{ position: "absolute", left: `${pins[p.code].x}%`, top: `${pins[p.code].y}%`, width: 17, height: 17, transform: "translate(-50%,-50%)", background: selected === p.code ? "#fbbf24" : COLORS[stateOf(p.code)], border: "2px solid white", borderRadius: "50%", boxShadow: "0 0 0 3px #007ca78a,0 2px 7px #000", cursor: "pointer" }} />)}
      </div>
    </div>
    <section style={{marginTop:12,border:"1px solid #3b536d",padding:14,borderRadius:10,display:"grid",gap:6}}>
      <b>Ficha de posición seleccionada: {selected}</b>
      <span>Área: {chosen?.area || "No encontrada"}</span>
      <span>Estado: <strong style={{color:COLORS[stateOf(selected)]}}>{LABELS[stateOf(selected)]}</strong></span>
      <span>Registro real: {currentReal?currentReal.name || currentReal.code:"No disponible en la respuesta de la API"}</span>
      <span>Colaborador: {currentReal?.inventoryPerson ? `${currentReal.inventoryPerson.firstName} ${currentReal.inventoryPerson.lastName}` : currentReal?.inventoryPersonId?"Asignado (nombre no disponible)":"Sin asignación confirmada"}</span>
      <span>Equipo: {currentReal?.equipment ? [currentReal.equipment.pcName,currentReal.equipment.serial].filter(Boolean).join(" · ") || "Registrado" : "No registrado en esta respuesta"}</span>
      <span>Checklist: {currentReview?`${currentReview.completed}/${currentReview.total} revisiones completadas`:"Sin revisión disponible"}</span>
      <span style={{fontSize:11,color:"#aec3d8"}}>Los estados usan las mismas reglas generales del FloorSectorView actual. No se presume que un accesorio específico falte sin confirmación del checklist. El modo calibración solo mueve marcadores locales.</span>
    </section>
    <section style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ color: "#a1b5ca", fontSize: 12 }}>Coordenadas guardadas en este navegador; exporta JSON como respaldo. Los 81 códigos coinciden con el catálogo registrado. El plano sigue siendo una imagen de referencia.</span>
      <button style={{ ...buttonStyle, background: "#4a2631" }} onClick={() => { if (!pins[selected]) return; setPins(prev => { const next = { ...prev }; delete next[selected]; return next; }); setMessage(`Se retiró únicamente la coordenada DEMO de ${selected}`); }}>Quitar punto seleccionado</button>
    </section>
  </main>;
}
