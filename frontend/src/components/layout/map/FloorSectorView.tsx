'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '../../../lib/api'
import PositionChecklist from '../../users/PositionChecklist'
import Floor4East3D from './Floor4East3D'
import { Building2, DoorOpen, Info, Monitor, X, ZoomIn, ZoomOut, Search, MapPin, UserRound, HardDrive, Headphones, PackageSearch, Pencil, Save, AlertTriangle } from 'lucide-react'

type RealPosition = { id: string; code: string; name?: string | null; wing?: string | null; inventoryPersonId?: string | null; inventoryPerson?: {id: string; firstName: string; lastName: string} | null; location?: {floorNumber?: number | null; wing?: string | null}; equipment?: { pcName?: string | null; serial?: string | null; category?: string; type?: string | null} | null }
type ReviewSummary = { positionId: string; completed: number; total: number; counts?: Record<string, number> }
type SeatState = 'empty' | 'incomplete' | 'complete' | 'occupied' | 'unknown'
const SEAT_META: Record<SeatState, { label: string; tone: string; dot: string }> = {
  empty: { label: 'Vacia / sin equipo', tone: 'ring-rose-500 shadow-[0_0_9px_#f43f5e90]', dot: 'bg-rose-500' },
  incomplete: { label: 'Incompleta', tone: 'ring-amber-400 shadow-[0_0_9px_#f59e0b90]', dot: 'bg-amber-400' },
  complete: { label: 'Completa / libre', tone: 'ring-emerald-400 shadow-[0_0_9px_#10b98190]', dot: 'bg-emerald-400' },
  occupied: { label: 'Completa / en uso', tone: 'ring-sky-500 shadow-[0_0_9px_#0ea5e990]', dot: 'bg-sky-500' },
  unknown: { label: 'Sin verificar', tone: 'ring-slate-400/60', dot: 'bg-slate-400' },
}
function SeatIndicator({ code, statuses }: { code?: string; statuses?: Record<string, SeatState> }) {
  if (!code || !statuses) return null
  const official = code.startsWith('P2O-') || code.startsWith('P2E-') || (code.startsWith('P3O-') || code.startsWith('P4O-') || code.startsWith('P4E-') || code.startsWith('P3E-')) ? code : `P2O-${code}`
  const state = statuses[official] || 'unknown'
  const meta = SEAT_META[state]
  return <span aria-label={`${official}: ${meta.label}`} title={`${official} · ${meta.label}`} className={`pointer-events-none absolute right-[2px] top-[2px] z-40 h-[8px] w-[8px] rounded-full ring-1 ring-slate-900/70 ${meta.dot} shadow-sm`} />
}
function AssignedPersonBubble({ code, assignedNames }: { code?: string; assignedNames?: Record<string, string> }) {
  if (!code || !assignedNames) return null
  const official = code.startsWith('P2O-') || code.startsWith('P2E-') || (code.startsWith('P3O-') || code.startsWith('P4O-') || code.startsWith('P4E-') || code.startsWith('P3E-')) ? code : `P2O-${code}`
  const name = assignedNames[official]?.trim().replace(/\s+/g, ' ')
  if (!name) return null

  const words = name.split(' ')
  const first = words[0]
  const lastInitial = words.length > 1 ? `${words[words.length - 1].charAt(0)}.` : ''
  const shortName = [first, lastInitial].filter(Boolean).join(' ')
  // A repeated full name is not an identity: use the position suffix only as a visual differentiator.
  // Actual identity must still come from the assigned person's database record.
  // Compare compact labels, not just identical full names: Carlos Moreno and Carlos Martinez collide as Carlos M.
  const normalizedShort = shortName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()
  const collision = Object.values(assignedNames).filter(value => {
    const parts = value.trim().replace(/\s+/g, ' ').split(' ')
    const compact = [parts[0], parts.length > 1 ? `${parts[parts.length - 1].charAt(0)}.` : ''].filter(Boolean).join(' ')
    return compact.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase() === normalizedShort
  }).length > 1
  const seatSuffix = official.split('-').pop() || official
  const label = collision ? `${shortName} · ${seatSuffix}` : shortName

  return <span aria-label={`Usuario asignado: ${name}; posición ${official}`} title={`${name} · ${official}`}
    className="pointer-events-none absolute bottom-[12px] left-[1px] right-[1px] z-30 flex min-w-0 items-center justify-center rounded bg-[#073653]/95 px-[1px] py-[1px] text-center text-[7px] font-semibold leading-[9px] text-white shadow-sm">
    <span className="block max-w-full truncate">{label}</span>
    <span aria-hidden="true" className="absolute bottom-full left-1/2 z-[90] mb-1 hidden w-max max-w-[180px] -translate-x-1/2 whitespace-normal rounded-md border border-cyan-400/70 bg-[#061c37] px-2 py-1 text-center text-[11px] font-semibold leading-4 text-white shadow-lg group-hover:block">{name}<span className="block text-[9px] text-cyan-200">{official}</span></span>
  </span>
}

function seatRing(code?: string, statuses?: Record<string, SeatState>) {
  if (!code || !statuses) return ''
  const official = code.startsWith('P2O-') || code.startsWith('P2E-') || (code.startsWith('P3O-') || code.startsWith('P4O-') || code.startsWith('P4E-') || code.startsWith('P3E-')) ? code : `P2O-${code}`
  return `ring-2 ring-inset ${SEAT_META[statuses[official] || 'unknown'].tone}`
}

type RealPerson = {id: string; firstName: string; lastName: string; employeeId: string; status: string}

type Props = { floor: 2 | 3 | 4; wing: 'Oeste' | 'Este' }
type Cell = { name: string; kind: 'row' | 'service'; spots: number }

function makeCells(floor: number, wing: 'Oeste' | 'Este'): Cell[] {
  if (floor === 2) {
    return wing === 'Oeste'
      ? [...Array.from({ length: 9 }, (_, i) => ({ name: `Row ${9 - i}`, kind: 'row' as const, spots: 0 }))]
      : [...Array.from({ length: 7 }, (_, i) => ({ name: `Row ${i + 1}`, kind: 'row' as const, spots: 0 }))]
  }

  if (floor === 3 && wing === 'Oeste') {
    return [...Array.from({ length: 10 }, (_, i) => ({ name: `Row ${i + 1}`, kind: 'row' as const, spots: 0 }))]
  }

  if (floor === 3 && wing === 'Este') {
    return Array.from({ length: 9 }, (_, i) => ({ name: `Row ${i + 1}`, kind: 'row' as const, spots: 0 }))
  }

  if (floor === 4 && wing === 'Oeste') {
    return Array.from({ length: 10 }, (_, i) => ({ name: `Row ${i + 1}`, kind: 'row' as const, spots: 0 }))
  }
  if (floor === 4 && wing === 'Este') {
    return Array.from({ length: 9 }, (_, i) => ({ name: `Row ${i + 1}`, kind: 'row' as const, spots: 0 }))
  }

  return [
    ...Array.from({ length: 6 }, (_, i) => ({ name: `Area provisional ${i + 1}`, kind: 'row' as const, spots: 12 })),
    { name: 'Area de servicios (pendiente)', kind: 'service', spots: 0 },
  ]
}


// Numeracion fisica de Piso 2 Oeste, segun plano de referencia del usuario.
// La pantalla se muestra de izquierda a derecha: Row 9 ... Row 1.
// Los asientos se recorren en el grid: izquierda, derecha; siguiente nivel.
const WEST2_SEAT_CODES: Record<number, string[]> = {
  9: ['R1-E07', 'R1-E01', 'R1-E08', 'R1-E02', 'R1-E09', 'R1-E03', 'R1-E10', 'R1-E04', 'R1-E11', 'R1-E05', 'R1-E12', 'R1-E06'],
  8: ['R1-D19', 'R1-D13', 'R1-D20', 'R1-D14', 'R1-D21', 'R1-D15', 'R1-D22', 'R1-D16', 'R1-D23', 'R1-D17', 'R1-D24', 'R1-D18'],
  7: ['R1-D07', 'R1-D01', 'R1-D08', 'R1-D02', 'R1-D09', 'R1-D03', 'R1-D10', 'R1-D04', 'R1-D11', 'R1-D05', 'R1-D12', 'R1-D06'],
  6: ['R1-C19', 'R1-C13', 'R1-C20', 'R1-C14', 'R1-C21', 'R1-C15', 'R1-C22', 'R1-C16', 'R1-C23', 'R1-C17', 'R1-C24', 'R1-C18'],
  5: ['R1-C07', 'R1-C01', 'R1-C08', 'R1-C02', 'R1-C09', 'R1-C03', 'R1-C10', 'R1-C04', 'R1-C11', 'R1-C05', 'R1-C12', 'R1-C06'],
  4: ['R1-B19', 'R1-B13', 'R1-B20', 'R1-B14', 'R1-B21', 'R1-B15', 'R1-B22', 'R1-B16', 'R1-B23', 'R1-B17', 'R1-B24', 'R1-B18'],
  3: ['R1-B01', 'R1-B07', 'R1-B02', 'R1-B08', 'R1-B03', 'R1-B09', 'R1-B04', 'R1-B10', 'R1-B05', 'R1-B11', 'R1-B06', 'R1-B12'],
  2: ['R1-A19', 'R1-A13', 'R1-A20', 'R1-A14', 'R1-A21', 'R1-A15', 'R1-A22', 'R1-A16', 'R1-A23', 'R1-A17', 'R1-A24', 'R1-A18'],
  1: ['R1-A07', 'R1-A01', 'R1-A08', 'R1-A02', 'R1-A09', 'R1-A03', 'R1-A10', 'R1-A04', 'R1-A11', 'R1-A05', 'R1-A12', 'R1-A06'],
}
const WEST2_SUPERVISOR_CODES: Record<number, [string, string]> = {
  9: ['R1-F09', 'R1-F18'],
  8: ['R1-F08', 'R1-F17'],
  7: ['R1-F07', 'R1-F16'],
  6: ['R1-F06', 'R1-F15'],
  5: ['R1-F05', 'R1-F14'],
  4: ['R1-F04', 'R1-F13'],
  3: ['R1-F03', 'R1-F12'],
  2: ['R1-F02', 'R1-F11'],
  1: ['R1-F01', 'R1-F10'],
}
const WEST2_WALL_CODES: Record<string, string[]> = {
  'Row 10': ['R1-G01', 'R1-G02', 'R1-G03'],
  'Row 11': ['R1-G04', 'R1-G05', 'R1-G06', 'R1-G07', 'R1-G08', 'R1-G09'],
  'Row 12': ['R1-G10', 'R1-G11', 'R1-G12', 'R1-G13', 'R1-G14', 'R1-G15'],
  'Row 13': ['R1-G16', 'R1-G17', 'R1-G18', 'R1-G19', 'R1-G20', 'R1-G21'],
}

const WEST_WALL = [
  { name: 'Row 10', spots: 3 },
  { name: 'Row 11', spots: 6 },
  { name: 'Row 12', spots: 6 },
  { name: 'Row 13', spots: 6 },
]

const WEST_LEFT_ROOMS = [
  {
    name: 'VP y Project Manager',
    spots: 2,
    sub: 'Dos puestos distintos',
    accent: 'bg-[#d9f1ff]',
  },
  {
    name: 'Departamento de TI',
    spots: 10,
    sub: '10 puestos de tecnologia',
    accent: 'bg-[#dcf5e8]',
  },
]

const WEST_RIGHT_ROOMS = [
  {
    name: 'Enfermeria',
    spots: 1,
    sub: 'Zona medica con 1 PC',
    accent: 'bg-[#eaf8ef]',
  },
  {
    name: 'Area de entrenamiento',
    spots: 10,
    sub: '10 equipos All in One',
    accent: 'bg-[#efe4ff]',
  },
]

// Fase 14Y.9: codigos existentes en PostgreSQL derivados del plano R2.
// Orden de celdas: izquierda/derecha, de arriba hacia abajo.
const EAST2_ROW_CODES: Record<number, string[]> = {
  1: ["P2E-A1", "P2E-A7", "P2E-A2", "P2E-A8", "P2E-A3", "P2E-A9", "P2E-A4", "P2E-A10", "P2E-A5", "P2E-A11", "P2E-A6", "P2E-A12"],
  2: ["P2E-A13", "P2E-A19", "P2E-A14", "P2E-A20", "P2E-A15", "P2E-A21", "P2E-A16", "P2E-A22", "P2E-A17", "P2E-A23", "P2E-A18", "P2E-A24"],
  3: ["P2E-B1", "P2E-B7", "P2E-B2", "P2E-B8", "P2E-B3", "P2E-B9", "P2E-B4", "P2E-B10", "P2E-B5", "P2E-B11", "P2E-B6", "P2E-B12"],
  4: ["P2E-B13", "P2E-B19", "P2E-B14", "P2E-B20", "P2E-B15", "P2E-B21", "P2E-B16", "P2E-B22", "P2E-B17", "P2E-B23", "P2E-B18", "P2E-B24"],
  5: ["P2E-C06", "P2E-C07", "P2E-C05", "P2E-C08", "P2E-C04", "P2E-C09", "P2E-C03", "P2E-C10", "P2E-C02", "P2E-C11", "P2E-C01", "P2E-C12"],
  6: ["P2E-C13", "P2E-C19", "P2E-C14", "P2E-C20", "P2E-C15", "P2E-C21", "P2E-C16", "P2E-C22", "P2E-C17", "P2E-C23", "P2E-C18", "P2E-C24"],
  7: ["P2E-D01", "P2E-D07", "P2E-D02", "P2E-D08", "P2E-D03", "P2E-D09", "P2E-D04", "P2E-D10", "P2E-D05", "P2E-D11", "P2E-D06", "P2E-D12"],
}
const EAST2_SUPERVISORS: Record<number, [string, string]> = {
  1: ["P2E-F1", "P2E-F7"],
  2: ["P2E-F2", "P2E-F9"],
  3: ["P2E-F3", "P2E-F11"],
  4: ["P2E-F4", "P2E-F10"],
  5: ["P2E-F05", "P2E-F12"],
  6: ["P2E-F06", "P2E-F13"],
  7: ["P2E-F08", "P2E-F14"],
}
const EAST2_BOTTOM_CODES: Record<string, string[]> = {
  "Row 8": ["P2E-E1", "P2E-E2", "P2E-E3", "P2E-E4", "P2E-E5", "P2E-E6"],
  "Row 9": ["P2E-E7", "P2E-E8", "P2E-E9", "P2E-E10", "P2E-E11", "P2E-E12"],
  "Row 10": ["P2E-E19", "P2E-E18", "P2E-E17", "P2E-E16", "P2E-E15", "P2E-E14", "P2E-E13"],
}
const EAST2_OFFICE_CODES: Record<string, string[]> = {
  // La quinta mesa del dibujo NO forma parte de los cuatro puestos de Compras.
  // Mantener visible pero pendiente de correspondencia fisica; nunca registrar en DB.
  'Compras': ['P2E-COMPRAS-01', 'P2E-COMPRAS-02', 'P2E-COMPRAS-03', 'P2E-COMPRAS-04'],
  'Direccion Marketing y Engagement': ['P2E-MARKETING-01', 'P2E-ENGAGEMENT-01'],
  'Marketing + Engagement': ['P2E-MARKETING-02', 'P2E-MARKETING-03', 'P2E-MARKETING-04', 'P2E-ENGAGEMENT-02', 'P2E-ENGAGEMENT-03'],
}

const EAST_BOTTOM_ROWS = [
  { name: 'Row 8', spots: 6 },
  { name: 'Row 9', spots: 6 },
  { name: 'Row 10', spots: 7 },
]

const EAST_RIGHT_ROOMS = [
  {
    name: 'Compras',
    spots: 4,
    sub: '4 posiciones de Compras',
    accent: 'bg-[#d9f1ff]',
  },
  {
    name: 'Direccion Marketing y Engagement',
    spots: 2,
    sub: 'Directora de marketing y directora de engagement',
    accent: 'bg-[#efe4ff]',
  },
  {
    name: 'Marketing + Engagement',
    spots: 5,
    sub: 'Oficina combinada - 5 personas',
    accent: 'bg-[#dcf5e8]',
  },
]

// Piso 3 Oeste: correspondencia con 214 codigos realmente registrados.
const P3O_ROW_CODES: Record<number, string[]> = {"1": ["P3O-R1-G09", "P3O-R1-G01", "P3O-R1-G10", "P3O-R1-G02", "P3O-R1-G11", "P3O-R1-G03", "P3O-R1-G12", "P3O-R1-G04", "P3O-R1-G13", "P3O-R1-G05", "P3O-R1-G14", "P3O-R1-G06", "P3O-R1-G15", "P3O-R1-G07", "P3O-R1-G16", "P3O-R1-G08"], "2": ["P3O-R1-F17", "P3O-R1-F09", "P3O-R1-F18", "P3O-R1-F10", "P3O-R1-F19", "P3O-R1-F11", "P3O-R1-F20", "P3O-R1-F12", "P3O-R1-F21", "P3O-R1-F13", "P3O-R1-F22", "P3O-R1-F14", "P3O-R1-F23", "P3O-R1-F15", "P3O-R1-F24", "P3O-R1-F16"], "3": ["P3O-R1-F01", "P3O-R1-E17", "P3O-R1-F02", "P3O-R1-E18", "P3O-R1-F03", "P3O-R1-E19", "P3O-R1-F04", "P3O-R1-E20", "P3O-R1-F05", "P3O-R1-E21", "P3O-R1-F06", "P3O-R1-E22", "P3O-R1-F07", "P3O-R1-E23", "P3O-R1-F08", "P3O-R1-E24"], "4": ["P3O-R1-E09", "P3O-R1-E01", "P3O-R1-E10", "P3O-R1-E02", "P3O-R1-E11", "P3O-R1-E03", "P3O-R1-E12", "P3O-R1-E04", "P3O-R1-E13", "P3O-R1-E05", "P3O-R1-E14", "P3O-R1-E06", "P3O-R1-E15", "P3O-R1-E07", "P3O-R1-E16", "P3O-R1-E08"], "5": ["P3O-R1-D17", "P3O-R1-D09", "P3O-R1-D18", "P3O-R1-D10", "P3O-R1-D19", "P3O-R1-D11", "P3O-R1-D20", "P3O-R1-D12", "P3O-R1-D21", "P3O-R1-D13", "P3O-R1-D22", "P3O-R1-D14", "P3O-R1-D23", "P3O-R1-D15", "P3O-R1-D24", "P3O-R1-D16"], "6": ["P3O-R1-D01", "P3O-R1-C17", "P3O-R1-D02", "P3O-R1-C18", "P3O-R1-D03", "P3O-R1-C19", "P3O-R1-D04", "P3O-R1-C20", "P3O-R1-D05", "P3O-R1-C21", "P3O-R1-D06", "P3O-R1-C22", "P3O-R1-D07", "P3O-R1-C23", "P3O-R1-D08", "P3O-R1-C24"], "7": ["P3O-R1-C09", "P3O-R1-C01", "P3O-R1-C10", "P3O-R1-C02", "P3O-R1-C11", "P3O-R1-C03", "P3O-R1-C12", "P3O-R1-C04", "P3O-R1-C13", "P3O-R1-C05", "P3O-R1-C14", "P3O-R1-C06", "P3O-R1-C15", "P3O-R1-C07", "P3O-R1-C16", "P3O-R1-C08"], "8": ["P3O-R1-B17", "P3O-R1-B09", "P3O-R1-B18", "P3O-R1-B10", "P3O-R1-B19", "P3O-R1-B11", "P3O-R1-B20", "P3O-R1-B12", "P3O-R1-B21", "P3O-R1-B13", "P3O-R1-B22", "P3O-R1-B14", "P3O-R1-B23", "P3O-R1-B15", "P3O-R1-B24", "P3O-R1-B16"], "9": ["P3O-R1-B01", "P3O-R1-A17", "P3O-R1-B02", "P3O-R1-A18", "P3O-R1-B03", "P3O-R1-A19", "P3O-R1-B04", "P3O-R1-A20", "P3O-R1-B05", "P3O-R1-A21", "P3O-R1-B06", "P3O-R1-A22", "P3O-R1-B07", "P3O-R1-A23", "P3O-R1-B08", "P3O-R1-A24"], "10": ["P3O-R1-A09", "P3O-R1-A01", "P3O-R1-A10", "P3O-R1-A02", "P3O-R1-A11", "P3O-R1-A03", "P3O-R1-A12", "P3O-R1-A04", "P3O-R1-A13", "P3O-R1-A05", "P3O-R1-A14", "P3O-R1-A06", "P3O-R1-A15", "P3O-R1-A07", "P3O-R1-A16", "P3O-R1-A08"]}
const P3O_UPPER_CODES: string[] = ["P3O-R1-I24", "P3O-R1-I23", "P3O-R1-I22", "P3O-R1-I21", "P3O-R1-I20", "P3O-R1-I19", "P3O-R1-I18", "P3O-R1-I17", "P3O-R1-I16", "P3O-R1-I15", "P3O-R1-I14", "P3O-R1-I13", "P3O-R1-I12", "P3O-R1-I11", "P3O-R1-I10", "P3O-R1-I09", "P3O-R1-I08", "P3O-R1-I07", "P3O-R1-I06", "P3O-R1-I05", "P3O-R1-I04", "P3O-R1-I03", "P3O-R1-I02", "P3O-R1-I01", "P3O-R1-H24", "P3O-R1-H23", "P3O-R1-H22", "P3O-R1-H21"]
const P3O_LOWER_CODES: string[] = ["P3O-R1-J18", "P3O-R1-J17", "P3O-R1-J16", "P3O-R1-J15", "P3O-R1-J14", "P3O-R1-J13", "P3O-R1-J12", "P3O-R1-J11", "P3O-R1-J10", "P3O-R1-J09", "P3O-R1-J08", "P3O-R1-J07", "P3O-R1-J20", "P3O-R1-G17", "P3O-R1-J21", "P3O-R1-J22", "P3O-R1-G18", "P3O-R1-J06", "P3O-R1-J05", "P3O-R1-J04", "P3O-R1-J03", "P3O-R1-J02", "P3O-R1-J01"]
const P3O_SIDE_CODES: string[] = ["P3O-R1-H05", "P3O-R1-H08", "P3O-R1-H01"]
// IDs internos únicos: la etiqueta del plano puede repetirse; el ID de PostgreSQL no.
const P3O_SUPERVISORS: Record<number, [string | undefined, string]> = Object.fromEntries(
  Array.from({length:10}, (_,i) => { const row = i + 1; return [row, [[3,5,10].includes(row) ? undefined : `P3O-SUP-R${String(row).padStart(2,'0')}-TOP`, `P3O-SUP-R${String(row).padStart(2,'0')}-BOTTOM`]] })
)
const P3O_ADMIN_PROJECT = ['P3O-ADMIN-PROY-01','P3O-ADMIN-PROY-02','P3O-ADMIN-PROY-03','P3O-ADMIN-PROY-04']
const P3O_ADMIN_DIRECTORS = ['P3O-ADMIN-DIR-01','P3O-ADMIN-DIR-02']
const P3O_ADMIN_MANAGER = ['P3O-ADMIN-GER-01']
const P3O_LATERAL_FIRST = 'P3O-LAT-R19-01'
const P3O_BOTTOM_LAST = 'P3O-INF-R18-06'
const P3O_SUPERVISOR_COUNT = 17
const P3O_EXPECTED_VISIBLE = 214 + P3O_SUPERVISOR_COUNT + 2 + 7 // 240 físicos dibujados
const p3oLabel = (code: string) => code === P3O_LATERAL_FIRST ? 'R1-J01' : code === P3O_BOTTOM_LAST ? 'R1-J23' : code.startsWith('P3O-SUP-') ? 'POS. Supervisión' : seatDisplayCode(code)
const isRealP3OCode = (code?: string) => !!code && /^P3O-(?:R1-[A-Z]\d+|SUP-R\d{2}-(?:TOP|BOTTOM)|LAT-R19-01|INF-R18-06|ADMIN-(?:PROY|DIR)-\d{2}|ADMIN-GER-01)$/.test(code)
const seatDisplayCode = (code: string) => code.startsWith('P2E-') ? code.replace(/^P2E-/, 'R2-') : (code.startsWith('P3O-') || code.startsWith('P4O-') || code.startsWith('P4E-') || code.startsWith('P3E-')) ? code.slice(4) : code

const THIRD_WEST_TOP_ROWS = [
  { name: 'Row 11', spots: 6 },
  { name: 'Row 12', spots: 6 },
  { name: 'Row 13', spots: 6 },
  { name: 'Row 14', spots: 6 },
]

const THIRD_WEST_BOTTOM_ROWS = [
  { name: 'Row 15', spots: 6 },
  { name: 'Row 16', spots: 6 },
  { name: 'Row 17', spots: 6 },
  { name: 'Row 18', spots: 6 },
]

const THIRD_WEST_LATERAL_OFFICE = {
  name: 'Oficina de proyectos',
  spots: 4,
  sub: 'Nombre pendiente de confirmar',
  accent: 'bg-[#eef6ff]',
}

const THIRD_WEST_LATERAL_ROW = { name: 'Row 19', spots: 4 }

const THIRD_WEST_OFFICES = [
  {
    name: 'VP Operaciones + Director Operaciones',
    spots: 2,
    sub: 'Dos puestos ejecutivos',
    accent: 'bg-[#d9f1ff]',
  },
  {
    name: 'Gerente de Operaciones',
    spots: 1,
    sub: 'Puesto ejecutivo individual',
    accent: 'bg-[#efe4ff]',
  },
  {
    name: 'Area de reuniones',
    spots: 0,
    sub: 'Espacio sin estaciones fijas; uso solo para reuniones',
    accent: 'bg-[#dcf5e8]',
  },
]


// Piso 3 Este: 210 puestos físicos del Excel (conservar R1-I en la franja inferior).
const P3E_ADMIN_CODES: Record<string,string[]> = { 'Gerencia': ['P3E-ADM-GERENCIA-01'], 'Sala de reuniones de QA': ['P3E-ADM-QA-01'] }
const P3E_TOP_CODES: string[] = ["P3E-R2-H19", "P3E-R2-H20", "P3E-R2-H21", "P3E-R2-H22", "P3E-R2-G01", "P3E-R2-G02", "P3E-R2-G03", "P3E-R2-G04", "P3E-R2-G05", "P3E-R2-G06", "P3E-R2-G07", "P3E-R2-G08", "P3E-R2-G09", "P3E-R2-G10", "P3E-R2-G11", "P3E-R2-G12", "P3E-R2-G13", "P3E-R2-G14", "P3E-R2-G15", "P3E-R2-G16", "P3E-R2-G17", "P3E-R2-G18", "P3E-R2-G19", "P3E-R2-G20", "P3E-R2-G21", "P3E-R2-G22", "P3E-R2-G23", "P3E-R2-G24"]
const P3E_ROW_CODES: Record<number,string[]> = {"1": ["P3E-R2-A01", "P3E-R2-A09", "P3E-R2-A02", "P3E-R2-A10", "P3E-R2-A03", "P3E-R2-A11", "P3E-R2-A04", "P3E-R2-A12", "P3E-R2-A05", "P3E-R2-A13", "P3E-R2-A06", "P3E-R2-A14", "P3E-R2-A07", "P3E-R2-A15", "P3E-R2-A08", "P3E-R2-A16"], "2": ["P3E-R2-A17", "P3E-R2-B01", "P3E-R2-A18", "P3E-R2-B02", "P3E-R2-A19", "P3E-R2-B03", "P3E-R2-A20", "P3E-R2-B04", "P3E-R2-A21", "P3E-R2-B05", "P3E-R2-A22", "P3E-R2-B06", "P3E-R2-A23", "P3E-R2-B07", "P3E-R2-A24", "P3E-R2-B08"], "3": ["P3E-R2-B09", "P3E-R2-B17", "P3E-R2-B10", "P3E-R2-B18", "P3E-R2-B11", "P3E-R2-B19", "P3E-R2-B12", "P3E-R2-B20", "P3E-R2-B13", "P3E-R2-B21", "P3E-R2-B14", "P3E-R2-B22", "P3E-R2-B15", "P3E-R2-B23", "P3E-R2-B16", "P3E-R2-B24"], "4": ["P3E-R2-C01", "P3E-R2-C09", "P3E-R2-C02", "P3E-R2-C10", "P3E-R2-C03", "P3E-R2-C11", "P3E-R2-C04", "P3E-R2-C12", "P3E-R2-C05", "P3E-R2-C13", "P3E-R2-C06", "P3E-R2-C14", "P3E-R2-C07", "P3E-R2-C15", "P3E-R2-C08", "P3E-R2-C16"], "5": ["P3E-R2-C17", "P3E-R2-D01", "P3E-R2-C18", "P3E-R2-D02", "P3E-R2-C19", "P3E-R2-D03", "P3E-R2-C20", "P3E-R2-D04", "P3E-R2-C21", "P3E-R2-D05", "P3E-R2-C22", "P3E-R2-D06", "P3E-R2-C23", "P3E-R2-D07", "P3E-R2-C24", "P3E-R2-D08"], "6": ["P3E-R2-D09", "P3E-R2-D17", "P3E-R2-D10", "P3E-R2-D18", "P3E-R2-D11", "P3E-R2-D19", "P3E-R2-D12", "P3E-R2-D20", "P3E-R2-D13", "P3E-R2-D21", "P3E-R2-D14", "P3E-R2-D22", "P3E-R2-D15", "P3E-R2-D23", "P3E-R2-D16", "P3E-R2-D24"], "7": ["P3E-R2-E01", "P3E-R2-E09", "P3E-R2-E02", "P3E-R2-E10", "P3E-R2-E03", "P3E-R2-E11", "P3E-R2-E04", "P3E-R2-E12", "P3E-R2-E05", "P3E-R2-E13", "P3E-R2-E06", "P3E-R2-E14", "P3E-R2-E07", "P3E-R2-E15", "P3E-R2-E08", "P3E-R2-E16"], "8": ["P3E-R2-E17", "P3E-R2-F01", "P3E-R2-E18", "P3E-R2-F02", "P3E-R2-E19", "P3E-R2-F03", "P3E-R2-E20", "P3E-R2-F04", "P3E-R2-E21", "P3E-R2-F05", "P3E-R2-E22", "P3E-R2-F06", "P3E-R2-E23", "P3E-R2-F07", "P3E-R2-E24", "P3E-R2-F08"], "9": ["P3E-R2-F09", "P3E-R2-F17", "P3E-R2-F10", "P3E-R2-F18", "P3E-R2-F11", "P3E-R2-F19", "P3E-R2-F12", "P3E-R2-F20", "P3E-R2-F13", "P3E-R2-F21", "P3E-R2-F14", "P3E-R2-F22", "P3E-R2-F15", "P3E-R2-F23", "P3E-R2-F16", "P3E-R2-F24"]}
const P3E_SUP_CODES: Record<number,[string | undefined,string]> = {"1": [undefined, "P3E-R2-H10"], "2": ["P3E-R2-H02", "P3E-R2-H11"], "3": ["P3E-R2-H03", "P3E-R2-H12"], "4": ["P3E-R2-H04", "P3E-R2-H13"], "5": ["P3E-R2-H05", "P3E-R2-H14"], "6": ["P3E-R2-H06", "P3E-R2-H15"], "7": ["P3E-R2-H07", "P3E-R2-H16"], "8": [undefined, "P3E-R2-H17"], "9": ["P3E-R2-H09", "P3E-R2-H18"]}
const P3E_BOTTOM_CODES: string[] = ["P3E-R1-I01", "P3E-R1-I02", "P3E-R1-I03", "P3E-R1-I04", "P3E-R1-I05", "P3E-R1-I06", "P3E-R1-I07", "P3E-R1-I08", "P3E-R1-I09", "P3E-R1-I10", "P3E-R1-I11", "P3E-R1-I12", "P3E-R1-I13", "P3E-R1-I14", "P3E-R1-I15", "P3E-R1-I16", "P3E-R1-I17", "P3E-R1-I18", "P3E-R1-I19", "P3E-R1-I20", "P3E-R1-I21", "P3E-R1-I22"]
const isRealP3ECode = (code?: string) => !!code && /^P3E-(?:R[12]-[A-Z]\d+|ADM-(?:GERENCIA|QA)-01)$/.test(code)

const THIRD_EAST_TOP_ROWS = Array.from({ length: 4 }, (_, i) => ({ name: `Row ${i + 10}`, spots: 6 }))
const THIRD_EAST_BOTTOM_ROWS = [
  { name: 'Row 14', spots: 6 },
  { name: 'Row 15', spots: 6 },
  { name: 'Row 16', spots: 6 },
  { name: 'Row 17', spots: 4 },
]
const THIRD_EAST_OFFICES = [
  { name: 'Sala de reuniones 1', spots: 0, sub: 'Sala sin puestos de trabajo', accent: 'bg-[#d9f1ff]' },
  { name: 'Cuarto de servidores IT', spots: 0, sub: 'Infraestructura de servidores; sin puestos de agente', accent: 'bg-[#dcf5e8]' },
  { name: 'Gerencia', spots: 1, sub: '1 posición administrativa', accent: 'bg-[#efe4ff]' },
  { name: 'Sala de reuniones de QA', spots: 1, sub: '1 posición administrativa de QA', accent: 'bg-[#d9f1ff]' },
]

// P4O: catalogo validado contra el plano fisico de Excel; Row19 H23/H24 usan IDs internos diferenciados.
const P4O_ROW_CODES: Record<number,string[]> = {"1": ["P4O-R1-G09", "P4O-R1-G01", "P4O-R1-G10", "P4O-R1-G02", "P4O-R1-G11", "P4O-R1-G03", "P4O-R1-G12", "P4O-R1-G04", "P4O-R1-G13", "P4O-R1-G05", "P4O-R1-G14", "P4O-R1-G06", "P4O-R1-G15", "P4O-R1-G07", "P4O-R1-G16", "P4O-R1-G08"], "2": ["P4O-R1-F17", "P4O-R1-F09", "P4O-R1-F18", "P4O-R1-F10", "P4O-R1-F19", "P4O-R1-F11", "P4O-R1-F20", "P4O-R1-F12", "P4O-R1-F21", "P4O-R1-F13", "P4O-R1-F22", "P4O-R1-F14", "P4O-R1-F23", "P4O-R1-F15", "P4O-R1-F24", "P4O-R1-F16"], "3": ["P4O-R1-F01", "P4O-R1-E17", "P4O-R1-F02", "P4O-R1-E18", "P4O-R1-F03", "P4O-R1-E19", "P4O-R1-F04", "P4O-R1-E20", "P4O-R1-F05", "P4O-R1-E21", "P4O-R1-F06", "P4O-R1-E22", "P4O-R1-F07", "P4O-R1-E23", "P4O-R1-F08", "P4O-R1-E24"], "4": ["P4O-R1-E09", "P4O-R1-E01", "P4O-R1-E10", "P4O-R1-E02", "P4O-R1-E11", "P4O-R1-E03", "P4O-R1-E12", "P4O-R1-E04", "P4O-R1-E13", "P4O-R1-E05", "P4O-R1-E14", "P4O-R1-E06", "P4O-R1-E15", "P4O-R1-E07", "P4O-R1-E16", "P4O-R1-E08"], "5": ["P4O-R1-D17", "P4O-R1-D09", "P4O-R1-D18", "P4O-R1-D10", "P4O-R1-D19", "P4O-R1-D11", "P4O-R1-D20", "P4O-R1-D12", "P4O-R1-D21", "P4O-R1-D13", "P4O-R1-D22", "P4O-R1-D14", "P4O-R1-D23", "P4O-R1-D15", "P4O-R1-D24", "P4O-R1-D16"], "6": ["P4O-R1-D01", "P4O-R1-C17", "P4O-R1-D02", "P4O-R1-C18", "P4O-R1-D03", "P4O-R1-C19", "P4O-R1-D04", "P4O-R1-C20", "P4O-R1-D05", "P4O-R1-C21", "P4O-R1-D06", "P4O-R1-C22", "P4O-R1-D07", "P4O-R1-C23", "P4O-R1-D08", "P4O-R1-C24"], "7": ["P4O-R1-C09", "P4O-R1-C01", "P4O-R1-C10", "P4O-R1-C02", "P4O-R1-C11", "P4O-R1-C03", "P4O-R1-C12", "P4O-R1-C04", "P4O-R1-C13", "P4O-R1-C05", "P4O-R1-C14", "P4O-R1-C06", "P4O-R1-C15", "P4O-R1-C07", "P4O-R1-C16", "P4O-R1-C08"], "8": ["P4O-R1-B17", "P4O-R1-B09", "P4O-R1-B18", "P4O-R1-B10", "P4O-R1-B19", "P4O-R1-B11", "P4O-R1-B20", "P4O-R1-B12", "P4O-R1-B21", "P4O-R1-B13", "P4O-R1-B22", "P4O-R1-B14", "P4O-R1-B23", "P4O-R1-B15", "P4O-R1-B24", "P4O-R1-B16"], "9": ["P4O-R1-B01", "P4O-R1-A17", "P4O-R1-B02", "P4O-R1-A18", "P4O-R1-B03", "P4O-R1-A19", "P4O-R1-B04", "P4O-R1-A20", "P4O-R1-B05", "P4O-R1-A21", "P4O-R1-B06", "P4O-R1-A22", "P4O-R1-B07", "P4O-R1-A23", "P4O-R1-B08", "P4O-R1-A24"], "10": ["P4O-R1-A09", "P4O-R1-A01", "P4O-R1-A10", "P4O-R1-A02", "P4O-R1-A11", "P4O-R1-A03", "P4O-R1-A12", "P4O-R1-A04", "P4O-R1-A13", "P4O-R1-A05", "P4O-R1-A14", "P4O-R1-A06", "P4O-R1-A15", "P4O-R1-A07", "P4O-R1-A16", "P4O-R1-A08"]}
const P4O_UPPER_CODES: string[] = ["P4O-R1-I24", "P4O-R1-I23", "P4O-R1-I22", "P4O-R1-I21", "P4O-R1-I20", "P4O-R1-I19", "P4O-R1-I18", "P4O-R1-I17", "P4O-R1-I16", "P4O-R1-I15", "P4O-R1-I14", "P4O-R1-I13", "P4O-R1-I12", "P4O-R1-I11", "P4O-R1-I10", "P4O-R1-I09", "P4O-R1-I08", "P4O-R1-I07", "P4O-R1-I06", "P4O-R1-I05", "P4O-R1-I04", "P4O-R1-I03", "P4O-R1-I02", "P4O-R1-I01", "P4O-R1-H24", "P4O-R1-H23", "P4O-R1-H22", "P4O-R1-H21", "P4O-R1-K21", "P4O-R1-K20", "P4O-R1-K17", "P4O-R1-K23"]
const P4O_LOWER_CODES: string[] = ["P4O-R1-J24", "P4O-R1-J23", "P4O-R1-J22", "P4O-R1-J21", "P4O-R1-J20", "P4O-R1-J19", "P4O-R1-J18", "P4O-R1-J17", "P4O-R1-J16", "P4O-R1-J15", "P4O-R1-J14", "P4O-R1-J13", "P4O-R1-J12", "P4O-R1-J11", "P4O-R1-J10", "P4O-R1-J09", "P4O-R1-J08", "P4O-R1-J07", "P4O-R1-J06", "P4O-R1-J05", "P4O-R1-J04", "P4O-R1-J03", "P4O-R1-J02", "P4O-R1-J01"]
const P4O_SIDE_CODES: string[] = ["P4O-ROW19-H23", "P4O-ROW19-H24", "P4O-R1-G21", "P4O-R1-G24"]
const P4O_SUPERVISOR_CODES: Record<number,[string,string]> = {"1": ["P4O-R1-H10", "P4O-R1-H20"], "2": ["P4O-SUP-TOP-R02", "P4O-R1-H19"], "3": ["P4O-R1-H08", "P4O-R1-H18"], "4": ["P4O-R1-H07", "P4O-R1-H17"], "5": ["", "P4O-R1-H16"], "6": ["P4O-R1-H05", "P4O-R1-H15"], "7": ["P4O-R1-H04", "P4O-R1-H14"], "8": ["P4O-R1-H03", "P4O-R1-H13"], "9": ["P4O-R1-H02", "P4O-R1-H12"], "10": ["P4O-R1-H01", "P4O-R1-H11"]}
const P4O_ADMIN_CODES: string[] = ["P4O-ADM-ONE-SCORE-01", "P4O-ADM-ONE-SCORE-02", "P4O-ADM-AUDIT-TRAINING-01", "P4O-ADM-AUDIT-TRAINING-02", "P4O-ADM-WORK-01", "P4O-ADM-WORK-02", "P4O-ADM-WORK-03", "P4O-ADM-INDIVIDUAL-01"]
const P4O_TOP_ROWS = [{name:'Perimetro superior 1',spots:7},{name:'Perimetro superior 2',spots:7},{name:'Perimetro superior 3',spots:7},{name:'Perimetro superior 4',spots:7},{name:'Perimetro superior 5',spots:4}]

const FOURTH_WEST_TOP_ROWS = Array.from({ length: 4 }, (_, i) => ({ name: `Row ${i + 11}`, spots: 7 }))
const FOURTH_WEST_BOTTOM_ROWS = Array.from({ length: 4 }, (_, i) => ({ name: `Row ${i + 15}`, spots: 6 }))
const FOURTH_WEST_SIDE_ROW = { name: 'Row 19', spots: 4 }
const FOURTH_WEST_LEFT = [
  { name: 'One Score / Psicologia', spots: 2, sub: '2 puestos visuales', accent: 'bg-[#e4dcfa]' },
  { name: 'Auditoria y Training', spots: 2, sub: '2 puestos provisionales', accent: 'bg-[#d9f1ff]' },
]
const FOURTH_WEST_RIGHT = [
  { name: 'Oficina Work', spots: 3, sub: '3 personas', accent: 'bg-[#e4dcfa]' },
  { name: 'Oficina individual', spots: 1, sub: '1 persona, nombre pendiente', accent: 'bg-[#f9e7bc]' },
  { name: 'Sala de reuniones', spots: 0, sub: 'Sin puestos de trabajo', accent: 'bg-[#f9e0c5]' },
]

// Piso 4 Este: 217 operativas fisicas + 5 administrativas = 222 vinculables.
// El total 220 en el Excel sigue pendiente de conciliar (+3 puestos sin ubicacion).
const P4E_ROW_CODES: Record<number, string[]> = {"1": ["P4E-R2-A01", "P4E-R2-A09", "P4E-R2-A02", "P4E-R2-A10", "P4E-R2-A03", "P4E-R2-A11", "P4E-R2-A04", "P4E-R2-A12", "P4E-R2-A05", "P4E-R2-A13", "P4E-R2-A06", "P4E-R2-A14", "P4E-R2-A07", "P4E-R2-A15", "P4E-R2-A08", "P4E-R2-A16"], "2": ["P4E-R2-A17", "P4E-R2-B01", "P4E-R2-A18", "P4E-R2-B02", "P4E-R2-A19", "P4E-R2-B03", "P4E-R2-A20", "P4E-R2-B04", "P4E-R2-A21", "P4E-R2-B05", "P4E-R2-A22", "P4E-R2-B06", "P4E-R2-A23", "P4E-R2-B07", "P4E-R2-A24", "P4E-R2-B08"], "3": ["P4E-R2-B09", "P4E-R2-B17", "P4E-R2-B10", "P4E-R2-B18", "P4E-R2-B11", "P4E-R2-B19", "P4E-R2-B12", "P4E-R2-B20", "P4E-R2-B13", "P4E-R2-B21", "P4E-R2-B14", "P4E-R2-B22", "P4E-R2-B15", "P4E-R2-B23", "P4E-R2-B16", "P4E-R2-B24"], "4": ["P4E-R2-C01", "P4E-R2-C09", "P4E-R2-C02", "P4E-R2-C10", "P4E-R2-C03", "P4E-R2-C11", "P4E-R2-C04", "P4E-R2-C12", "P4E-R2-C05", "P4E-R2-C13", "P4E-R2-C06", "P4E-R2-C14", "P4E-R2-C07", "P4E-R2-C15", "P4E-R2-C08", "P4E-R2-C16"], "5": ["P4E-R2-C17", "P4E-R2-D01", "P4E-R2-C18", "P4E-R2-D02", "P4E-R2-C19", "P4E-R2-D03", "P4E-R2-C20", "P4E-R2-D04", "P4E-R2-C21", "P4E-R2-D05", "P4E-R2-C22", "P4E-R2-D06", "P4E-R2-C23", "P4E-R2-D07", "P4E-R2-C24", "P4E-R2-D08"], "6": ["P4E-R2-D09", "P4E-R2-D17", "P4E-R2-D10", "P4E-R2-D18", "P4E-R2-D11", "P4E-R2-D19", "P4E-R2-D12", "P4E-R2-D20", "P4E-R2-D13", "P4E-R2-D21", "P4E-R2-D14", "P4E-R2-D22", "P4E-R2-D15", "P4E-R2-D23", "P4E-R2-D16", "P4E-R2-D24"], "7": ["P4E-R2-E01", "P4E-R2-E09", "P4E-R2-E02", "P4E-R2-E10", "P4E-R2-E03", "P4E-R2-E11", "P4E-R2-E04", "P4E-R2-E12", "P4E-R2-E05", "P4E-R2-E13", "P4E-R2-E06", "P4E-R2-E14", "P4E-R2-E07", "P4E-R2-E15", "P4E-R2-E08", "P4E-R2-E16"], "8": ["P4E-R2-E17", "P4E-R2-F01", "P4E-R2-E18", "P4E-R2-F02", "P4E-R2-E19", "P4E-R2-F03", "P4E-R2-E20", "P4E-R2-F04", "P4E-R2-E21", "P4E-R2-F05", "P4E-R2-E22", "P4E-R2-F06", "P4E-R2-E23", "P4E-R2-F07", "P4E-R2-E24", "P4E-R2-F08"], "9": ["P4E-R2-F09", "P4E-R2-F17", "P4E-R2-F10", "P4E-R2-F18", "P4E-R2-F11", "P4E-R2-F19", "P4E-R2-F12", "P4E-R2-F20", "P4E-R2-F13", "P4E-R2-F21", "P4E-R2-F14", "P4E-R2-F22", "P4E-R2-F15", "P4E-R2-F23", "P4E-R2-F16", "P4E-R2-F24"]}
const P4E_SUP_CODES: Record<number, [string, string]> = {"1": ["", "P4E-R2-H10"], "2": ["P4E-R2-H02", "P4E-R2-H11"], "3": ["P4E-R2-H03", "P4E-R2-H12"], "4": ["P4E-R2-H04", "P4E-PERIMETRO-H13-DUP-01"], "5": ["P4E-R2-H05", "P4E-R2-H14"], "6": ["P4E-R2-H06", "P4E-R2-H15"], "7": ["P4E-R2-H07", "P4E-R2-H16"], "8": ["P4E-R2-H08", "P4E-R2-H17"], "9": ["P4E-R2-H09", "P4E-R2-H18"]}
const P4E_UPPER_CODES: string[] = ["P4E-R2-H25", "P4E-R2-H24", "P4E-R2-H23", "P4E-R2-H13", "P4E-R2-H22", "P4E-R2-H21", "P4E-R2-H20", "P4E-R2-G01", "P4E-R2-G02", "P4E-R2-G03", "P4E-R2-G04", "P4E-R2-G05", "P4E-R2-G06", "P4E-R2-G07", "P4E-R2-G08", "P4E-R2-G09", "P4E-R2-G10", "P4E-R2-G11", "P4E-R2-G12", "P4E-R2-G13", "P4E-R2-G14", "P4E-R2-G15", "P4E-R2-G16", "P4E-R2-G17", "P4E-R2-G18", "P4E-R2-G19", "P4E-R2-G20", "P4E-R2-G21", "P4E-R2-G22", "P4E-R2-G23", "P4E-R2-G24", "P4E-R2-J06"]
const P4E_LOWER_CODES: string[] = ["P4E-R2-I01", "P4E-R2-I02", "P4E-R2-I03", "P4E-R2-I04", "P4E-R2-I05", "P4E-R2-I06", "P4E-R2-I07", "P4E-R2-I08", "P4E-R2-I09", "P4E-R2-I10", "P4E-R2-I11", "P4E-R2-I12", "P4E-R2-I13", "P4E-R2-I14", "P4E-R2-I15", "P4E-R2-I16", "P4E-R2-I17", "P4E-R2-I18", "P4E-R2-I19", "P4E-R2-I20", "P4E-R2-I21", "P4E-R2-I22", "P4E-R2-I23", "P4E-R2-I24"]
const P4E_ADMIN_LEFT: string[] = ["P4E-ADM-INDIVIDUAL-01"]
const P4E_ADMIN_RIGHT: string[][] = [["P4E-ADM-VP-01", "P4E-ADM-GER-OPERACIONES-01"], ["P4E-ADM-GER-QA-01", "P4E-ADM-SUP-QA-01"]]
const P4E_TOP_ROWS = [{name:'Perimetro superior 1',spots:7},{name:'Perimetro superior 2',spots:7},{name:'Perimetro superior 3',spots:7},{name:'Perimetro superior 4',spots:7},{name:'Perimetro superior 5',spots:4}]

const FOURTH_EAST_TOP_ROWS = [
  { name: 'Row 10', spots: 7 },
  { name: 'Row 11', spots: 7 },
  { name: 'Row 12', spots: 7 },
  { name: 'Row 13', spots: 7 },
  { name: 'Row 14', spots: 4 },
]
const FOURTH_EAST_BOTTOM_ROWS = Array.from({ length: 4 }, (_, i) => ({ name: `Row ${i + 15}`, spots: 6 }))
const FOURTH_EAST_LEFT = [
  { name: 'Sala de reunion', spots: 0, sub: 'Sala sin puestos fijos', accent: 'bg-[#f9e0c5]' },
  { name: 'Servidor de IT', spots: 0, sub: 'Cuarto de servidores', accent: 'bg-[#dcf5e8]' },
  { name: 'Oficina individual', spots: 1, sub: 'Una persona - nombre provisional', accent: 'bg-[#e4dcfa]' },
  { name: 'QA / Auditoria', spots: 0, sub: 'Area administrativa - puestos por verificar', accent: 'bg-[#f9e0c5]' },
]
const FOURTH_EAST_RIGHT = [
  { name: 'VP de Operaciones + Gerente de Operaciones', spots: 2, sub: 'Dos personas', accent: 'bg-[#fff0b2]' },
  { name: 'Gerente de QA + Supervisora de QA', spots: 2, sub: 'Dos personas', accent: 'bg-[#d9f1ff]' },
]

function OfficeCard({
  title,
  sub,
  spots,
  accent,
  grow = false,
  premium = false,
  onClick,
  seatCodes,
  onSeatSelect,
  statuses,
  assignedNames,
}: {
  title: string
  sub: string
  spots: number
  accent: string
  grow?: boolean
  premium?: boolean
  onClick: () => void
  seatCodes?: string[]
  onSeatSelect?: (code: string) => void
  statuses?: Record<string, SeatState>
  assignedNames?: Record<string, string>
}) {
  return (
    <div
      className={`relative flex ${grow ? 'flex-1' : ''} min-h-[120px] flex-col rounded-xl border-2 ${premium ? 'border-[#647a8b] ring-2 ring-inset ring-white/70 shadow-[inset_0_0_0_5px_#62798b33,inset_0_0_18px_#0369a11a,0_0_12px_#0ea5e94d]' : 'border-slate-500/80'} ${accent} p-2 text-left shadow transition hover:border-cyan-500 hover:shadow-cyan-500/20`}
    >
      {premium && <><span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-[5px] w-[40%] -translate-x-1/2 rounded-b bg-[linear-gradient(90deg,#64748b,#d8e6ef,#64748b)] shadow-[0_2px_8px_#c7e9ff]" /><span aria-hidden="true" className="pointer-events-none absolute -bottom-[3px] right-[20%] h-[16px] w-[32px] rounded-t border-x-2 border-t-2 border-[#61798b] bg-[#d9ecf1] shadow-[0_-3px_7px_#4dbdf477]" /></>}
      <button type="button" onClick={onClick} className={`w-full rounded-lg px-2 py-2 text-center text-[11px] text-white ${premium ? 'bg-[linear-gradient(90deg,#082948,#145786,#082948)] ring-1 ring-sky-400/70' : 'bg-[#123d67]'}`}>{title}</button>
      <small className="mt-2 text-center text-[10px] text-slate-700">{sub}</small>
      {spots === 0 ? (
        <div className="mt-3 flex flex-1 items-center justify-center p-3">
          <div className="flex h-16 w-full max-w-[170px] items-center justify-center rounded-2xl border-2 border-[#99744b] bg-[#c6a783] shadow-md">
            <span className="text-center text-[11px] font-semibold text-slate-800">Mesa de reuniones</span>
          </div>
        </div>
      ) : <div className="mt-3 grid grid-cols-2 flex-1 content-start gap-1.5">
        {Array.from({ length: spots }, (_, n) => (
          <button type="button" key={n} data-seat-code={seatCodes?.[n] ? (seatCodes[n].startsWith('P2O-') || seatCodes[n].startsWith('P2E-') || seatCodes[n].startsWith('P3O-') || seatCodes[n].startsWith('P4O-') || seatCodes[n].startsWith('P4E-') || seatCodes[n].startsWith('P3E-') ? seatCodes[n] : `P2O-${seatCodes[n]}`) : undefined} onClick={() => onSeatSelect?.(seatCodes?.[n] || `${title} · Puesto ${n + 1}`)} title={seatCodes?.[n]?.startsWith('P2E-PENDIENTE-') ? 'Mesa sin departamento confirmado; no registrada' : seatCodes?.[n] || `${title} · Puesto ${n + 1}`} className={`group relative flex items-center justify-center rounded border border-white/70 py-2 shadow-sm ${seatRing(seatCodes?.[n], statuses)} ${premium ? 'bg-[linear-gradient(#d2aa78,#b98a5b)]' : 'bg-[#c6a783]'}`}>
            {premium ? <span className="block w-full max-w-[58px]"><DeskTop compact /></span> : <Monitor size={14} className="text-blue-900" />}<SeatIndicator code={seatCodes?.[n]} statuses={statuses} /><AssignedPersonBubble code={seatCodes?.[n]} assignedNames={assignedNames} />{seatCodes?.[n] && <span className="absolute bottom-0 left-0 right-0 truncate rounded bg-slate-950/85 px-0.5 text-[8px] font-bold text-white">{seatCodes[n].startsWith('P3O-') || seatCodes[n].startsWith('P3E-') ? p3oLabel(seatCodes[n]) : (seatCodes[n].startsWith('P4O-') || seatCodes[n].startsWith('P4E-')) ? seatDisplayCode(seatCodes[n]) : seatCodes[n].startsWith('P2E-') && !seatCodes[n].startsWith('P2E-PENDIENTE-') ? seatCodes[n].replace('P2E-', '') : seatCodes[n]}</span>}
          </button>
        ))}
      </div>}
    </div>
  )
}


// Vista cenital con mobiliario editable: cada puesto sigue siendo un boton independiente.
function DeskTop({ side = 'right', compact = false }: { side?: 'left' | 'right'; compact?: boolean }) {
  return (
    <span aria-hidden="true" className={`relative flex items-center justify-center ${compact ? 'h-8 w-full' : 'h-full w-full min-h-[43px]'}`}>
      <span className={`absolute inset-x-1 ${compact ? 'top-[2px] h-[18px]' : 'inset-y-[7px]'} rounded-[4px] border border-[#936741] bg-[linear-gradient(90deg,#b78a57,#f3d2a2_42%,#b68655)] shadow-[inset_0_1px_2px_#fff9,0_2px_3px_#132b4655]`} />
      <span className={`absolute z-10 flex flex-col items-center justify-center ${compact ? 'top-[5px] left-1/2 -translate-x-1/2' : side === 'left' ? 'right-[15%]' : 'left-[15%]'}`}>
        <span className="h-[10px] w-[14px] rounded-[2px] border border-[#7ad6ff] bg-[linear-gradient(#06b6f9,#172b5a)] shadow-[0_0_4px_#0284c7]" />
        <span className="mt-[2px] h-[3px] w-[11px] rounded-sm bg-[#25364a]" />
      </span>
      <span className={`absolute z-10 rounded-[5px] border border-[#203146] bg-[linear-gradient(#35485c,#101c2c)] shadow-[0_1px_2px_#0005] ${compact ? 'bottom-0 h-[9px] w-[13px]' : side === 'left' ? 'left-0 h-[17px] w-[11px]' : 'right-0 h-[17px] w-[11px]'}`} />
      {!compact && <>
        <span className={`absolute z-20 h-[11px] w-[7px] rounded-sm bg-[#121e2e] shadow-sm ${side === 'left' ? 'left-[3px]' : 'right-[3px]'}`} />
        <span className={`absolute z-10 h-[6px] w-[3px] rounded-full bg-emerald-500/85 ${side === 'left' ? 'right-[3px]' : 'left-[3px]'}`} />
      </>}
    </span>
  )
}

function MainRow({
  name,
  onSelect,
  seatCount = 12,
  topBlocked = false,
  premium = false,
  seatCodes,
  supervisorCodes,
  statuses,
  assignedNames,
}: {
  name: string
  onSelect: (payload: { name: string; spots: number }) => void
  seatCodes?: string[]
  supervisorCodes?: [string | undefined, string]
  statuses?: Record<string, SeatState>
  assignedNames?: Record<string, string>
  seatCount?: number
  topBlocked?: boolean
  premium?: boolean
}) {
  return (
    <div className={`flex min-h-[620px] flex-col rounded-xl p-1.5 shadow-md ${premium ? "border-2 border-sky-400/70 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_38px,#8aa5b52b_39px),linear-gradient(100deg,#d3e2e6,#f5f3e9_48%,#cbdde6)] shadow-[0_0_16px_rgba(4,130,245,.32)]" : "border border-sky-700/60 bg-[#f4f5ef]"}`}>
      <button type="button" onClick={() => onSelect({ name, spots: 0 })} className={`mb-2 rounded px-1 py-2 text-xs font-bold text-white hover:bg-blue-700 ${premium ? "bg-[#072f56] ring-1 ring-sky-400/70 shadow-[0_0_9px_#0ea5e966]" : "bg-[#08436d]"}`}>
        {name}
      </button>

      {topBlocked ? (
        <div className="mb-2 rounded bg-black px-1 py-3 text-center text-[9px] font-bold tracking-[.18em] text-white">MURO</div>
      ) : (
        <button
          type="button"
          data-seat-code={supervisorCodes?.[0] ? (supervisorCodes[0].startsWith('P2E-') || supervisorCodes[0].startsWith('P4E-') || supervisorCodes[0].startsWith('P3O-') || supervisorCodes[0].startsWith('P4O-') || supervisorCodes[0].startsWith('P3E-') ? supervisorCodes[0] : `P2O-${supervisorCodes[0]}`) : undefined}
          onClick={() => onSelect({ name: supervisorCodes?.[0] || `${name} - Supervisor superior`, spots: 1 })}
          className={`group relative mb-2 rounded border px-1 py-2 text-[9px] font-semibold hover:bg-emerald-200 ${seatRing(supervisorCodes?.[0], statuses)} ${premium ? "border-emerald-400 bg-emerald-200 shadow-[0_0_8px_rgba(16,185,129,.55)]" : "border-emerald-500/50 bg-emerald-100"}`}
        >
          {premium ? <span className="mx-auto block w-[37px] max-w-full rotate-180"><DeskTop compact /></span> : <Monitor size={13} className="mx-auto mb-1 text-blue-700" />}
          <SeatIndicator code={supervisorCodes?.[0]} statuses={statuses} /><AssignedPersonBubble code={supervisorCodes?.[0]} assignedNames={assignedNames} />{supervisorCodes?.[0] ? p3oLabel(supervisorCodes[0]).replace(/^P2E-/, 'R2-') : premium ? 'POS. Supervisión' : 'Supervisor'}
        </button>
      )}

      <div className={`grid flex-1 grid-cols-2 gap-1.5 ${premium ? "rounded-lg border border-slate-400/30 bg-[#18364e]/10 p-1" : ""}`}>
        {Array.from({ length: seatCount }, (_, seat) => (
          <button
            type="button"
            key={seat}
            data-seat-code={seatCodes?.[seat] ? (seatCodes[seat].startsWith('P2E-') || seatCodes[seat].startsWith('P3O-') || seatCodes[seat].startsWith('P4O-') || seatCodes[seat].startsWith('P4E-') || seatCodes[seat].startsWith('P3E-') ? seatCodes[seat] : `P2O-${seatCodes[seat]}`) : undefined}
            onClick={() => onSelect({ name: seatCodes?.[seat] || `${name} · Puesto visual ${seat + 1}`, spots: 0 })}
            title={seatCodes?.[seat] || `${name} - Puesto visual ${seat + 1}`}
            className={`group relative flex flex-col items-center justify-center gap-1 rounded border shadow-sm transition hover:bg-sky-200 hover:ring-2 hover:ring-cyan-400 ${seatRing(seatCodes?.[seat], statuses)} ${premium ? "border-amber-700/40 bg-[linear-gradient(90deg,#d2b085,#e1be91_48%,#cf9f70)] shadow-[inset_0_1px_2px_#fff8,0_2px_4px_#07213d55]" : "border-sky-300 bg-[#d9b68b]"}`}
          >
            {premium ? <DeskTop side={seat % 2 === 0 ? 'left' : 'right'} /> : <Monitor size={15} className="text-blue-800" />}
            <SeatIndicator code={seatCodes?.[seat]} statuses={statuses} /><AssignedPersonBubble code={seatCodes?.[seat]} assignedNames={assignedNames} />{seatCodes?.[seat] && <span className="absolute bottom-[-1px] z-30 rounded-t bg-slate-950/85 px-0.5 text-[8px] font-bold leading-[11px] text-white">{seatDisplayCode(seatCodes[seat])}</span>}
          </button>
        ))}
      </div>

      <button
        type="button"
        data-seat-code={supervisorCodes?.[1] ? (supervisorCodes[1].startsWith('P2E-') || supervisorCodes[1].startsWith('P3O-') || supervisorCodes[1].startsWith('P4O-') || supervisorCodes[1].startsWith('P3E-') ? supervisorCodes[1] : `P2O-${supervisorCodes[1]}`) : undefined}
        onClick={() => onSelect({ name: supervisorCodes?.[1] || `${name} - Supervisor inferior`, spots: 1 })}
        className={`group relative mt-2 rounded border px-1 py-2 text-[9px] font-semibold hover:bg-emerald-200 ${seatRing(supervisorCodes?.[1], statuses)} ${premium ? "border-emerald-400 bg-emerald-200 shadow-[0_0_8px_rgba(16,185,129,.55)]" : "border-emerald-500/50 bg-emerald-100"}`}
      >
        {premium ? <span className="mx-auto block w-[37px] max-w-full"><DeskTop compact /></span> : <Monitor size={13} className="mx-auto mb-1 text-blue-700" />}
        <SeatIndicator code={supervisorCodes?.[1]} statuses={statuses} /><AssignedPersonBubble code={supervisorCodes?.[1]} assignedNames={assignedNames} />{supervisorCodes?.[1] ? p3oLabel(supervisorCodes[1]).replace(/^P2E-/, 'R2-') : premium ? 'POS. Supervisión' : 'Supervisor'}
      </button>
    </div>
  )
}

function CompactRowCard({
  name,
  spots,
  onClick,
  premium = false,
  codes,
  onSeatSelect,
  statuses,
  assignedNames,
}: {
  name: string
  spots: number
  onClick: () => void
  premium?: boolean
  codes?: string[]
  onSeatSelect?: (code: string) => void
  statuses?: Record<string, SeatState>
  assignedNames?: Record<string, string>
}) {
  return (
    <div
      className={`rounded-lg border-2 p-2 text-left transition hover:border-cyan-400 ${premium ? "border-sky-500/75 bg-[linear-gradient(#dae6e9,#f7f2e6)] shadow-[0_0_12px_rgba(14,165,233,.3)]" : "border-sky-700/60 bg-[#f8f5ec]"}`}
    >
      <button type="button" onClick={onClick} className="w-full rounded bg-[#135a88] px-2 py-1 text-center text-xs font-bold text-white hover:bg-sky-700">{name}</button>
      <div className="mt-3 flex flex-nowrap justify-center gap-1">
        {Array.from({ length: spots }, (_, j) => (
          <button type="button" key={j} data-seat-code={codes?.[j] ? (codes[j].startsWith('P2E-') || codes[j].startsWith('P3O-') || codes[j].startsWith('P4O-') || codes[j].startsWith('P4E-') || codes[j].startsWith('P3E-') ? codes[j] : `P2O-${codes[j]}`) : undefined} title={codes?.[j] || `${name} · Puesto ${j + 1}`} onClick={() => onSeatSelect?.(codes?.[j] || `${name} · Puesto ${j + 1}`)} className={`group relative flex h-10 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded border ${seatRing(codes?.[j], statuses)} ${premium ? "border-amber-800/30 bg-[linear-gradient(#e8c494,#b9926d)]" : "border-blue-200 bg-[#cba57b]"}`}>
            {premium ? <span className="block w-full rotate-180"><DeskTop compact /></span> : <Monitor size={13} className="text-blue-900" />}
            <SeatIndicator code={codes?.[j]} statuses={statuses} /><AssignedPersonBubble code={codes?.[j]} assignedNames={assignedNames} />{codes?.[j] && <span className="absolute bottom-0 rounded bg-slate-950/80 px-0.5 text-[8px] font-bold text-white">{codes[j].startsWith('P3O-') || codes[j].startsWith('P3E-') ? p3oLabel(codes[j]) : seatDisplayCode(codes[j])}</span>}
          </button>
        ))}
      </div>
      <div className="mt-2 text-center text-[10px]">{spots} puestos identificados</div>
    </div>
  )
}

export default function FloorSectorView({ floor, wing }: Props) {
  const cells = useMemo(() => makeCells(floor, wing), [floor, wing])
  const [selected, setSelected] = useState<{ name: string; spots: number } | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [realPositions, setRealPositions] = useState<RealPosition[]>([])
  const [globalLoadError, setGlobalLoadError] = useState('')
  const [realPeople, setRealPeople] = useState<RealPerson[]>([])
  const [realId, setRealId] = useState('')
  const [personChoice, setPersonChoice] = useState('')
  const [realLoading, setRealLoading] = useState(false)
  const [savingReal, setSavingReal] = useState(false)
  const [realMessage, setRealMessage] = useState('')
  const [realAccessories, setRealAccessories] = useState<Array<{ category: string; role?: string; quantity?: number }>>([])
  const [checklistError, setChecklistError] = useState('')
  const [checklistVersion, setChecklistVersion] = useState(0)
  const [reviewSummaries, setReviewSummaries] = useState<ReviewSummary[]>([])
  const [reviewsReady, setReviewsReady] = useState(false)
  const assignedNames = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {}
    for (const p of realPositions) {
      if (!(p.code.startsWith('P2O-') || p.code.startsWith('P2E-') || p.code.startsWith('P3O-') || p.code.startsWith('P4O-') || p.code.startsWith('P4E-') || p.code.startsWith('P3E-')) || !p.inventoryPerson?.id) continue
      const name = [p.inventoryPerson.firstName, p.inventoryPerson.lastName].filter(Boolean).join(' ').trim()
      if (name) out[p.code] = name
    }
    return out
  }, [realPositions])
  const seatStatuses = useMemo<Record<string, SeatState>>(() => {
    const reviews = new Map(reviewSummaries.map(r => [r.positionId, r]))
    const output: Record<string, SeatState> = {}
    for (const p of realPositions) {
      if (!(p.code.startsWith('P2O-') || p.code.startsWith('P2E-') || p.code.startsWith('P3O-') || p.code.startsWith('P4O-') || p.code.startsWith('P4E-') || p.code.startsWith('P3E-'))) continue
      if (!reviewsReady) { output[p.code] = 'unknown'; continue }
      const review = reviews.get(p.id)
      const hasEquipment = Boolean(p.equipment)
      const hasPerson = Boolean(p.inventoryPersonId || p.inventoryPerson?.id)
      if (!review) output[p.code] = hasEquipment || hasPerson ? 'incomplete' : 'empty'
      else if (review.total > 0 && review.completed >= review.total) output[p.code] = hasPerson ? 'occupied' : 'complete'
      else output[p.code] = hasEquipment || hasPerson || Object.values(review.counts || {}).some(x => x > 0) ? 'incomplete' : 'empty'
    }
    return output
  }, [realPositions, reviewSummaries, reviewsReady])
  const summary = useMemo(() => {
    const sectorPrefix = floor === 2 ? (wing === 'Oeste' ? 'P2O-' : 'P2E-') : `P${floor}${wing === 'Oeste' ? 'O' : 'E'}-`
    return Object.entries(seatStatuses).filter(([code]) => code.startsWith(sectorPrefix)).reduce((acc, [, state]) => { acc[state] += 1; return acc }, { empty:0, incomplete:0, complete:0, occupied:0, unknown:0 } as Record<SeatState, number>)
  }, [seatStatuses, floor, wing])
  const refreshSeatReviews = async () => {
    try {
      const response = await apiRequest('/positions/checklist-review-summary', { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: unknown = await response.json()
      if (!Array.isArray(data)) throw new Error('Respuesta incompatible')
      setReviewSummaries(data as ReviewSummary[])
      setReviewsReady(true)
    } catch {
      setReviewsReady(false)
      setReviewSummaries([])
    }
  }
  useEffect(() => {
    if (floor !== 2 && floor !== 3 && floor !== 4) return
    void refreshSeatReviews()
    const onFocus = () => { void refreshSeatReviews() }
    window.addEventListener('focus', onFocus)
    const reviewTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshSeatReviews()
    }, 45000)
    return () => { window.removeEventListener('focus', onFocus); window.clearInterval(reviewTimer) }
  }, [floor, wing])

  const officialCode = selected
    ? (floor === 3 && wing === 'Oeste' ? (isRealP3OCode(selected.name) ? selected.name : '') : floor === 3 && wing === 'Este' ? (isRealP3ECode(selected.name) ? selected.name : '') : floor === 4 ? (selected.name.startsWith(wing === 'Oeste' ? 'P4O-' : 'P4E-') ? selected.name : '') : floor === 2 ? (selected.name.startsWith('P2O-') || selected.name.startsWith('P2E-') ? selected.name : wing === 'Oeste' && selected.name.startsWith('R1-') ? `P2O-${selected.name}` : '') : '')
    : ''
  // Temporary and unresolved codes must never be treated as verified DB identifiers.
  const matchedPosition = officialCode ? realPositions.find(p => p.code.toUpperCase() === officialCode.toUpperCase()) : undefined
  const selectedReal = realPositions.find(p => p.id === realId)

  // El checklist y el almacen leen y escriben el MISMO registro de posicion.
  useEffect(() => {
    if (!editOpen || !selectedReal) { setRealAccessories([]); setChecklistError(''); return }
    let active = true
    setChecklistError('')
    apiRequest(`/positions/${encodeURIComponent(selectedReal.id)}/accessories`, { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error(`No se pudieron consultar accesorios (HTTP ${response.status})`)
        const data: unknown = await response.json()
        if (!Array.isArray(data)) throw new Error('Formato de accesorios inesperado')
        if (active) setRealAccessories(data as Array<{ category: string; role?: string; quantity?: number }>)
      })
      .catch(error => { if (active) setChecklistError(error instanceof Error ? error.message : 'Error al consultar accesorios') })
    return () => { active = false }
  }, [editOpen, selectedReal?.id, checklistVersion])

  const refreshChecklistPosition = async () => {
    setChecklistVersion(v => v + 1)
    await refreshSeatReviews()
    try {
      const response = await apiRequest('/positions', { cache: 'no-store' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data: unknown = await response.json()
      if (!Array.isArray(data)) throw new Error('La API no devolvio posiciones')
      setRealPositions(data as RealPosition[])
    } catch(error) {
      setChecklistError(error instanceof Error ? error.message : 'No se pudo actualizar la posicion')
    }
  }

  // Fase 14Q: la API es la fuente de verdad. Actualizar la vista cuando se
  // regresa desde Usuarios/Posiciones o se vuelve a enfocar la ventana.
  useEffect(() => {
    let active = true
    const refresh = async () => {
      try {
        const response = await apiRequest('/positions', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Error HTTP ${response.status}`)
        const data: unknown = await response.json()
        if (!Array.isArray(data)) throw new Error('Formato de posiciones incompatible')
        if (active) { setRealPositions(data as RealPosition[]); setGlobalLoadError('') }
      } catch (error) {
        if (active) setGlobalLoadError(error instanceof Error ? error.message : 'No se pudieron actualizar posiciones')
      }
    }
    void refresh()
    const onFocus = () => { void refresh() }
    const onVisibility = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    // Actualizar datos existentes mientras el mapa permanece abierto.
    // No hace escrituras ni modifica asignaciones.
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 45000)
    return () => {
      active = false
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [floor, wing])

  useEffect(() => {
    if (!editOpen) return
    let cancelled = false
    setRealLoading(true)
    setRealMessage('')
    Promise.all([apiRequest('/positions'), apiRequest('/inventory-people')])
      .then(async ([a, b]) => {
        if (!a.ok || !b.ok) throw new Error(`Consulta fallida: posiciones ${a.status}, personas ${b.status}. Verifica rutas API.`)
        const positions: unknown = await a.json()
        const people: unknown = await b.json()
        if (!Array.isArray(positions) || !Array.isArray(people)) throw new Error('La API no devolvio listas compatibles.')
        if (!cancelled) {
          const list = positions as RealPosition[]
          setRealPositions(list); setRealPeople(people as RealPerson[])
          const match = officialCode ? list.find(p => p.code.toUpperCase() === officialCode.toUpperCase()) : undefined
          setRealId(match?.id || '')
          setPersonChoice(match?.inventoryPersonId || '')
        }
      })
      .catch(e => { if (!cancelled) setRealMessage(e instanceof Error ? e.message : 'No se pudieron consultar los registros') })
      .finally(() => {if (!cancelled) setRealLoading(false)})
    return () => { cancelled = true }
  }, [editOpen, officialCode])
  const chooseRealPosition = (id: string) => {
    setRealId(id)
    const match = realPositions.find(p => p.id === id)
    setPersonChoice(match?.inventoryPersonId || '')
    setRealMessage('')
  }
  const saveRealPerson = async () => {
    if (!selectedReal || savingReal) return
    if (!window.confirm(`¿Confirmas modificar la persona asignada a ${selectedReal.code}?\n\nEste cambio se guardara en Usuarios / Posiciones.`)) return
    setSavingReal(true)
    setRealMessage('')
    try {
      const response = await apiRequest(`/positions/${encodeURIComponent(selectedReal.id)}/person`, {method:'PATCH', body:JSON.stringify({inventoryPersonId:personChoice || null})})
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof payload.message === 'string' ? payload.message : `Error HTTP ${response.status}`)
      // No suponer que el PATCH es suficiente: consultar de nuevo PostgreSQL
      // por la misma API que utiliza Usuarios / Posiciones.
      const verify = await apiRequest('/positions', { cache: 'no-store' })
      if (!verify.ok) throw new Error(`La asignacion fue enviada, pero no se pudo verificar (HTTP ${verify.status}). Refresca ambas pantallas antes de repetir.`)
      const fresh: unknown = await verify.json()
      if (!Array.isArray(fresh)) throw new Error('La API devolvio un formato inesperado al verificar la asignacion')
      const confirmed = (fresh as RealPosition[]).find(p => p.id === selectedReal.id)
      if (!confirmed) throw new Error('El puesto guardado no aparece al verificar. No repitas la operacion sin revisar Usuarios / Posiciones.')
      setRealPositions(fresh as RealPosition[])
      const actualPerson = confirmed.inventoryPersonId || confirmed.inventoryPerson?.id || ''
      if (actualPerson !== (personChoice || '')) {
        throw new Error('El servidor no refleja la asignacion solicitada. Comprueba el registro en Usuarios / Posiciones.')
      }
      setRealMessage(`Asignacion comprobada contra la API: ${confirmed.code}.`)
    } catch(e) {setRealMessage(e instanceof Error ? e.message : 'No se pudo guardar')} finally {setSavingReal(false)}
  }

  const [search, setSearch] = useState('')
  const [popupPoint, setPopupPoint] = useState({ x: 64, y: 100 })
  const selectArea = (item: { name: string; spots: number }) => {
    setSelected(item)
    setEditOpen(false)
    if (((floor === 3 && wing === 'Oeste' && isRealP3OCode(item.name)) || (floor === 4 && item.name.startsWith(wing === 'Oeste' ? 'P4O-' : 'P4E-'))) || (floor === 3 && wing === 'Este' && isRealP3ECode(item.name)) || (floor === 2 && ((wing === 'Oeste' && (item.name.startsWith('R1-') || item.name.startsWith('P2O-'))) || (wing === 'Este' && item.name.startsWith('P2E-') && !item.name.startsWith('P2E-TEMP-') && !item.name.startsWith('P2E-PENDIENTE-'))))) {
      apiRequest('/positions').then(r => r.ok ? r.json() : Promise.reject(new Error('API de posiciones no disponible')))
        .then(data => { if(Array.isArray(data)) setRealPositions(data as RealPosition[]) })
        .catch(() => setRealMessage('No se pudieron cargar posiciones'))
    }
  }
  const options = useMemo(() => {
    const rowNames = cells.map((item) => item.name)
    const otherNames = floor === 2 && wing === 'Oeste'
      ? [...WEST_WALL.map((v) => v.name), ...WEST_LEFT_ROOMS.map((v) => v.name), ...WEST_RIGHT_ROOMS.map((v) => v.name)]
      : floor === 2 && wing === 'Este'
        ? [...EAST_BOTTOM_ROWS.map((v) => v.name), ...EAST_RIGHT_ROOMS.map((v) => v.name)]
        : floor === 3 && wing === 'Oeste'
          ? [...THIRD_WEST_TOP_ROWS.map((v) => v.name), ...THIRD_WEST_BOTTOM_ROWS.map((v) => v.name), 'Oficina de proyectos', 'Row 19', 'Salida de emergencia', 'VP Operaciones + Director Operaciones', 'Gerente de Operaciones', 'Area de reuniones']
          : floor === 3 && wing === 'Este'
            ? [...THIRD_EAST_TOP_ROWS.map((v) => v.name), ...THIRD_EAST_BOTTOM_ROWS.map((v) => v.name), ...THIRD_EAST_OFFICES.map((v) => v.name), 'Salon de conferencia', 'Salida de emergencia']
            : floor === 4 && wing === 'Oeste'
              ? [...FOURTH_WEST_TOP_ROWS.map((v) => v.name), ...FOURTH_WEST_BOTTOM_ROWS.map((v) => v.name), ...FOURTH_WEST_LEFT.map((v) => v.name), ...FOURTH_WEST_RIGHT.map((v) => v.name)]
              : [...FOURTH_EAST_TOP_ROWS.map((v) => v.name), ...FOURTH_EAST_BOTTOM_ROWS.map((v) => v.name), ...FOURTH_EAST_LEFT.map((v) => v.name), ...FOURTH_EAST_RIGHT.map((v) => v.name), 'Salida de emergencia']
    return [...new Set([...rowNames, ...otherNames])]
  }, [cells, floor, wing])
  const matches = search.trim() ? options.filter((v) => v.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 8) : []
  const [spotlightCode, setSpotlightCode] = useState('')
  const seatSearchResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.trim().toLocaleLowerCase()
    return realPositions.filter(p => [
      p.code || '', p.name || '', p.inventoryPerson?.firstName || '', p.inventoryPerson?.lastName || '',
      `${p.inventoryPerson?.firstName || ''} ${p.inventoryPerson?.lastName || ''}`,
      p.equipment?.pcName || '', p.equipment?.serial || ''
    ].some(value => value.toLocaleLowerCase().includes(q))).slice(0, 30)
  }, [search, realPositions])
  const targetSector = (p: RealPosition) => {
    // Prefer canonical position location metadata. Do not guess a floor from a person's name.
    const match = /^P([234])([OE])-/.exec(p.code.toUpperCase())
    // Position code P2O-/P2E- explicitly identifies a mapped sector and takes precedence
    // over inconsistent /positions location.wing strings (WEST/EAST vs Oeste/Este).
    const fromCode = match ? { sectorFloor: Number(match[1]), sectorWing: match[2] === 'O' ? 'Oeste' as const : 'Este' as const } : null
    if (fromCode) return fromCode
    const rawFloor = p.location?.floorNumber
    const sectorFloor = rawFloor == null ? null : Number(rawFloor)
    const rawWing = String(p.location?.wing || p.wing || '').trim().toLowerCase()
    const sectorWing = ['west', 'oeste', 'o'].includes(rawWing) ? 'Oeste'
      : ['east', 'este', 'e'].includes(rawWing) ? 'Este' : null
    return { sectorFloor: [2, 3, 4].includes(sectorFloor || 0) ? sectorFloor : null, sectorWing }
  }
  const focusSeat = (p: RealPosition) => {
    setGlobalLoadError('')
    const destination = targetSector(p)
    if (destination.sectorFloor !== floor || destination.sectorWing !== wing) {
      // Parent must handle this event to change the selected floor and wing.
      // The pending position is stored so it can be illuminated after the parent switches.
      if (!destination.sectorFloor || !destination.sectorWing) {
        setGlobalLoadError('La posicion existe, pero no tiene piso y sector identificables. No se inventara una ubicacion.')
        return
      }
      sessionStorage.setItem('it-hub-map-pending-focus', JSON.stringify({ code: p.code, floor: destination.sectorFloor, wing: destination.sectorWing }))
      window.dispatchEvent(new CustomEvent('it-hub:navigate-position', { detail: { code: p.code, floor: destination.sectorFloor, wing: destination.sectorWing } }))
      setGlobalLoadError(`Resultado en Piso ${destination.sectorFloor} ${destination.sectorWing}. Selecciona ese sector si no cambia automaticamente.`)
      return
    }
    setSpotlightCode(p.code)
    setSelected({ name: p.code, spots: 0 })
    requestAnimationFrame(() => {
      const seat = Array.from(document.querySelectorAll<HTMLElement>('[data-seat-code]'))
        .find(element => element.dataset.seatCode === p.code)
      if (seat) seat.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
      else setGlobalLoadError('La posicion esta registrada pero su escritorio aun no esta dibujado en este plano.')
    })
  }
  useEffect(() => {
    const pending = sessionStorage.getItem('it-hub-map-pending-focus')
    if (!pending) return
    try {
      const target = JSON.parse(pending) as {code: string; floor: number; wing: string}
      if (target.floor !== floor || target.wing !== wing) return
      sessionStorage.removeItem('it-hub-map-pending-focus')
      const found = realPositions.find(p => p.code === target.code)
      if (found) focusSeat(found)
    } catch { sessionStorage.removeItem('it-hub-map-pending-focus') }
  }, [floor, wing, realPositions])

  const [zoom, setZoom] = useState(1)
  const [view3D, setView3D] = useState(false)
  const isWest2 = floor === 2 && wing === 'Oeste'
  const isEast2 = floor === 2 && wing === 'Este'
  const isWest3 = floor === 3 && wing === 'Oeste'
  const isEast3 = floor === 3 && wing === 'Este'
  const isWest4 = floor === 4 && wing === 'Oeste'
  const isEast4 = floor === 4 && wing === 'Este'

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-[#080f22] p-3 text-slate-100"
      onClickCapture={(event) => {
        // Ubicar una sola ficha cerca del elemento seleccionado, dentro de la ventana.
        const width = 360
        const height = 340
        const x = event.clientX + width + 28 > window.innerWidth
          ? event.clientX - width - 14 : event.clientX + 14
        setPopupPoint({
          x: Math.max(12, Math.min(window.innerWidth - width - 12, x)),
          y: Math.max(80, Math.min(window.innerHeight - height - 12, event.clientY - 40)),
        })
      }}>
      {(isWest2 || isEast2 || isWest3 || isEast3 || isWest4 || isEast4) && spotlightCode && <style>{`[data-seat-code="${spotlightCode}"] { outline: 4px solid #22d3ee !important; outline-offset: 3px; box-shadow: 0 0 0 6px #06b6d455, 0 0 28px 12px #22d3eaa0 !important; animation: spotlight-14v 1s ease-in-out infinite alternate; z-index: 60 !important; } @keyframes spotlight-14v { from { filter: brightness(1); } to { filter: brightness(1.35); } }`}</style>}
      {(isWest2 || isEast2 || isWest3 || isEast3 || isWest4 || isEast4) && <div className="mb-4" aria-label="Resumen operativo de posiciones reales">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">Resumen operativo · Piso {floor} {wing}</div>
            <p className="mt-0.5 text-[11px] text-slate-400">Estados calculados desde PostgreSQL y las revisiones del checklist.</p>
          </div>
          <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs text-slate-300">
            <span className="font-bold text-white">{Object.values(summary).reduce((acc, n) => acc + n, 0)}</span> posiciones identificadas
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {([
            { key: 'empty' as SeatState, title: 'Vacías / sin equipo', detail: 'Sin equipamiento base', Icon: PackageSearch, surface: 'border-rose-500/40 bg-[linear-gradient(145deg,#261626,#111a30)]', text: 'text-rose-300', bar: 'bg-rose-500' },
            { key: 'incomplete' as SeatState, title: 'Incompletas', detail: 'Pendientes de completar', Icon: AlertTriangle, surface: 'border-amber-500/40 bg-[linear-gradient(145deg,#292319,#111a30)]', text: 'text-amber-300', bar: 'bg-amber-400' },
            { key: 'complete' as SeatState, title: 'Completas / libres', detail: 'Equipadas y disponibles', Icon: Monitor, surface: 'border-emerald-500/40 bg-[linear-gradient(145deg,#142b28,#111a30)]', text: 'text-emerald-300', bar: 'bg-emerald-400' },
            { key: 'occupied' as SeatState, title: 'Completas / en uso', detail: 'Equipadas y asignadas', Icon: UserRound, surface: 'border-sky-500/40 bg-[linear-gradient(145deg,#142a3e,#111a30)]', text: 'text-sky-300', bar: 'bg-sky-400' },
            { key: 'unknown' as SeatState, title: 'Sin verificar', detail: 'Falta validar su estado', Icon: Info, surface: 'border-slate-500/40 bg-[linear-gradient(145deg,#222839,#111a30)]', text: 'text-slate-300', bar: 'bg-slate-400' },
          ]).map(({ key, title, detail, Icon, surface, text, bar }) => {
            const total = Object.values(summary).reduce((acc, n) => acc + n, 0)
            const percent = total ? Math.round((summary[key] / total) * 100) : 0
            return <div key={key} className={`min-w-0 rounded-xl border p-3 shadow-[0_5px_20px_#00000030] ${surface}`} title={`${title}: ${summary[key]} posiciones (${percent}%)`}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold leading-4 text-slate-200">{title}</span>
                <span className={`rounded-lg border border-white/10 bg-black/20 p-1.5 ${text}`}><Icon size={17} /></span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <strong className={`text-[28px] font-extrabold leading-none tabular-nums ${text}`}>{summary[key]}</strong>
                <span className="pb-0.5 text-xs font-bold tabular-nums text-slate-300">{percent}%</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${bar} transition-all duration-300`} style={{ width: `${percent}%` }} /></div>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">{detail}</p>
            </div>
          })}
        </div>
      </div>}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Building2 size={18} className="text-cyan-300" /> Piso {floor} · Lado {wing}
          </div>
          <div className="mt-1 text-xs text-slate-400">{isWest2 ? "Posiciones oficiales P2O · estados desde PostgreSQL y checklist" : isEast2 ? "Posiciones oficiales P2E · estados desde PostgreSQL y checklist" : isWest3 ? "Posiciones oficiales P3O · estados desde PostgreSQL y checklist" : isWest3 || isEast3 ? "Posiciones oficiales Piso 3 · estados desde PostgreSQL y checklist" : isWest4 ? "Posiciones oficiales P4O · estados desde PostgreSQL y checklist" : "Vista conceptual de distribucion"}</div>
        </div>
        <div className="flex items-center gap-2">
          {isEast4 && <div className="flex gap-1 rounded-lg border border-sky-500/40 bg-[#0a1c32] p-1"><button type="button" aria-pressed={!view3D} onClick={() => setView3D(false)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${!view3D?'bg-sky-600 text-white':'text-sky-200 hover:bg-white/10'}`}>2D</button><button type="button" aria-pressed={view3D} onClick={() => setView3D(true)} className={`rounded-md px-3 py-1.5 text-xs font-bold ${view3D?'bg-sky-600 text-white':'text-sky-200 hover:bg-white/10'}`}>3D</button></div>}
          <button type="button" title="Actualizar posiciones y checklist" aria-label="Actualizar posiciones y checklist" onClick={() => { void refreshChecklistPosition() }} className="rounded-lg border border-cyan-500/40 px-2 py-1.5 text-xs text-cyan-100 hover:bg-cyan-900/40">Actualizar</button>
          <button
            type="button"
            aria-label="Alejar"
            onClick={() => setZoom((v) => Math.max(0.7, Math.round((v - 0.1) * 10) / 10))}
            className="rounded-lg border border-white/15 p-2 hover:bg-white/10"
          >
            <ZoomOut size={16} />
          </button>
          <span className="w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="Acercar"
            onClick={() => setZoom((v) => Math.min(1.5, Math.round((v + 0.1) * 10) / 10))}
            className="rounded-lg border border-white/15 p-2 hover:bg-white/10"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      <div className="relative mb-3 rounded-xl border border-cyan-700/40 bg-[#111e37] p-3">
        <div className="flex items-center gap-3 rounded-lg border border-slate-600/50 bg-[#0b1529] px-3 py-2">
          <Search size={18} className="text-cyan-400" />
          <input
            aria-label="Buscar personas equipos seriales o posiciones de todos los pisos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar persona, PCNAME, serial o posicion en cualquier piso..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
          />
          {search && <button type="button" aria-label="Limpiar busqueda" onClick={() => { setSearch(''); setSpotlightCode('') }}><X size={16} /></button>}
        </div>
        {search.trim() && (
          <div className="relative z-40 mt-2 rounded-lg border border-cyan-500/40 bg-[#091a32] p-2 shadow-lg" role="region" aria-label="Resultados globales de posiciones">
            <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-cyan-200"><span>Posiciones registradas · {seatSearchResults.length}{seatSearchResults.length === 30 ? '+' : ''}</span>{spotlightCode && <button type="button" onClick={() => setSpotlightCode('')} className="rounded border border-slate-600 px-2 py-1 text-slate-200 hover:bg-white/10">Quitar enfoque</button>}</div>
            {seatSearchResults.length ? <div className="grid max-h-48 grid-cols-1 gap-1 overflow-auto sm:grid-cols-2 lg:grid-cols-3">
              {seatSearchResults.map(p => { const dest = targetSector(p); return <button type="button" key={p.id} onClick={() => focusSeat(p)} className="rounded-md border border-sky-600/30 bg-slate-800/75 px-3 py-2 text-left text-xs hover:border-cyan-300 hover:bg-sky-900/60">
                <strong className="block text-cyan-200">{p.code}</strong>
                <span className="block truncate text-slate-200">{p.inventoryPerson ? `${p.inventoryPerson.firstName} ${p.inventoryPerson.lastName}` : 'Sin usuario asignado'}</span>
                <span className="block truncate text-slate-400">{dest.sectorFloor && dest.sectorWing ? `Piso ${dest.sectorFloor} · ${dest.sectorWing}` : 'Sector no identificado'}{p.equipment?.pcName ? ` · ${p.equipment.pcName}` : ''}</span>
              </button> })}
            </div> : <div className="text-xs text-slate-400">Sin posiciones registradas que coincidan. No se muestran asignaciones inventadas.</div>}
          </div>
        )}
        {search.trim() && matches.length > 0 && <details className="mt-2 text-xs text-slate-300"><summary className="cursor-pointer">Areas y Rows del sector actual ({matches.length})</summary><div className="mt-1 flex flex-wrap gap-1">{matches.map(name => <button type="button" key={name} onClick={() => { selectArea({ name, spots: 0 }); setSearch('') }} className="rounded border border-slate-600 px-2 py-1 hover:bg-slate-700">{name}</button>)}</div></details>}
        {globalLoadError && <p role="status" className="mt-2 text-xs text-amber-300">{globalLoadError}</p>}
        <p className="mt-2 text-[11px] text-slate-400">Busca en todas las posiciones registradas. Los sectores no dibujados se identifican sin inventar escritorios.</p>
      </div>


      {isEast4 && view3D ? <Floor4East3D rowCodes={P4E_ROW_CODES} supervisorCodes={P4E_SUP_CODES} upperCodes={P4E_UPPER_CODES} lowerCodes={P4E_LOWER_CODES} adminLeft={P4E_ADMIN_LEFT} adminRight={P4E_ADMIN_RIGHT} statuses={seatStatuses} assignedNames={assignedNames} spotlightCode={spotlightCode} onSelect={code => selectArea({ name: code, spots: 0 })} /> : (
      <div className="overflow-auto rounded-xl border border-slate-700/50 bg-[#101827] p-4" style={{ minHeight: 620, width: '100%' }}>
        <div style={{ zoom: zoom, width: '100%', minWidth: isWest2 ? 1680 : isEast2 ? 1500 : isWest3 ? 1920 : isEast3 ? 1700 : isWest4 ? 1920 : isEast4 ? 1800 : 1000 }}>
          <div className="h-9 rounded-t-xl bg-[#8b3b84] text-center text-sm font-bold leading-9 tracking-wide">Piso {floor} · Lado {wing}</div>

          {isWest2 ? (
            <div className="relative overflow-hidden rounded-b-lg border-x-4 border-b-4 border-sky-600 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_43px,#708a9c26_44px),repeating-linear-gradient(90deg,transparent_0px,transparent_43px,#708a9c26_44px),linear-gradient(120deg,#cadbe3,#f3f2eb_45%,#cddde5)] p-4 text-slate-900 shadow-[inset_0_0_35px_#0e74904d]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-1 z-0 h-[10px] rounded-b-md border-x-4 border-[#415d78] bg-[linear-gradient(90deg,#273e51,#d6e7ec_24%,#56768e_48%,#e1eff4_75%,#273e51)] shadow-[0_3px_9px_#12406455]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-4 left-1 z-0 w-[8px] rounded-r bg-[linear-gradient(90deg,#273e51,#91b4c9,#314e65)] shadow-[3px_0_8px_#0f355255]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-4 right-1 z-0 w-[8px] rounded-l bg-[linear-gradient(90deg,#314e65,#91b4c9,#273e51)] shadow-[-3px_0_8px_#0f355255]" />
              <div className="relative mb-4 flex h-8 items-center justify-center rounded border-x-4 border-sky-300/75 bg-[#123d63] text-[11px] font-bold tracking-widest text-white shadow-[0_0_10px_#38bdf855]">PLANO 2D · PISO 2 OESTE</div>
              <div aria-hidden="true" className="pointer-events-none relative mb-3 grid grid-cols-6 gap-4 px-10">
                {Array.from({ length: 6 }, (_, i) => <span key={i} className="mx-auto h-[5px] w-16 max-w-full rounded-full bg-[linear-gradient(90deg,#467188,#effaff,#467188)] shadow-[0_1px_9px_#7dd3fc]" />)}
              </div>

              <div className="relative z-10 grid gap-3" style={{ gridTemplateColumns: 'clamp(180px,14vw,220px) minmax(0,1fr) clamp(210px,17vw,270px)' }}>
                <div className="flex min-h-[620px] flex-col gap-3">
                  {WEST_LEFT_ROOMS.map((room, index) => (
                    <OfficeCard
                      key={room.name}
                      title={room.name}
                      sub={room.sub}
                      spots={room.spots}
                      accent={room.accent}
                      grow={index === 1}
                      premium
                      seatCodes={room.name === 'Departamento de TI' ? Array.from({length:10},(_,n)=>`P2O-IT-${String(n+1).padStart(2,'0')}`) : ['P2O-VP-01','P2O-PM-01']}
                      onSeatSelect={code => selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}
                      onClick={() => selectArea({ name: room.name, spots: room.spots })}
                    />
                  ))}
                </div>

                <div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(9, minmax(100px, 1fr))' }}>
                    {cells.map((cell) => (
                      <MainRow key={cell.name} name={cell.name} onSelect={selectArea} premium seatCodes={WEST2_SEAT_CODES[Number(cell.name.replace('Row ', ''))]} supervisorCodes={WEST2_SUPERVISOR_CODES[Number(cell.name.replace('Row ', ''))]} statuses={seatStatuses} assignedNames={assignedNames} />
                    ))}
                  </div>

                  <div className="relative my-3 overflow-hidden rounded border-x-4 border-sky-400/70 bg-[linear-gradient(90deg,#123453,#4c6073,#123453)] py-2 text-center text-[10px] font-bold tracking-[.20em] text-white shadow-[0_0_9px_#0ea5e94b]">
                    <span aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-[3px] h-[2px] rounded-full bg-cyan-200/60 shadow-[0_0_6px_#7dd3fc]" />
                    CIRCULACION INTERIOR
                  </div>

                  <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 2fr 2fr 2fr' }}>
                    {WEST_WALL.map((area) => (
                      <CompactRowCard key={area.name} name={area.name} spots={area.spots} onClick={() => selectArea(area)} premium codes={WEST2_WALL_CODES[area.name]} onSeatSelect={(code) => selectArea({name: code, spots: 0})} statuses={seatStatuses} assignedNames={assignedNames} />
                    ))}
                  </div>
                </div>

                <div className="flex min-h-[620px] flex-col gap-3">
                  {WEST_RIGHT_ROOMS.map((room, index) => (
                    <OfficeCard
                      key={room.name}
                      title={room.name}
                      sub={room.sub}
                      spots={room.spots}
                      accent={room.accent}
                      grow={index === 1}
                      premium
                      seatCodes={room.name === 'Enfermeria' ? ['P2O-ENF-01'] : Array.from({length:10},(_,n)=>`P2O-POD4-${String(n+1).padStart(2,'0')}`)}
                      onSeatSelect={code => selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}
                      onClick={() => selectArea({ name: room.name, spots: room.spots })}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-md border border-sky-500/40 bg-[linear-gradient(90deg,#173653,#4c6073,#173653)] py-3 text-center text-[11px] font-bold tracking-[.22em] text-white">PERIMETRO Y CIRCULACION · REFERENCIA</div>
            </div>
          ) : isEast2 ? (
            <div className="relative overflow-hidden rounded-b-lg border-x-4 border-b-4 border-sky-600 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_43px,#708a9c26_44px),repeating-linear-gradient(90deg,transparent_0px,transparent_43px,#708a9c26_44px),linear-gradient(120deg,#cadbe3,#f3f2eb_45%,#cddde5)] p-4 text-slate-900 shadow-[inset_0_0_35px_#0e74904d]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-1 z-0 h-[10px] rounded-b-md border-x-4 border-[#415d78] bg-[linear-gradient(90deg,#273e51,#d6e7ec_24%,#56768e_48%,#e1eff4_75%,#273e51)] shadow-[0_3px_9px_#12406455]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-4 left-1 z-0 w-[8px] rounded-r bg-[linear-gradient(90deg,#273e51,#91b4c9,#314e65)] shadow-[3px_0_8px_#0f355255]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-4 right-1 z-0 w-[8px] rounded-l bg-[linear-gradient(90deg,#314e65,#91b4c9,#273e51)] shadow-[-3px_0_8px_#0f355255]" />
              <div className="relative mb-4 flex h-8 items-center justify-center rounded border-x-4 border-sky-300/75 bg-[#123d63] text-[11px] font-bold tracking-widest text-white shadow-[0_0_10px_#38bdf855]">PLANO 2D · PISO 2 ESTE</div>
              <div aria-hidden="true" className="pointer-events-none relative mb-3 grid grid-cols-6 gap-4 px-10">
                {Array.from({ length: 6 }, (_, i) => <span key={i} className="mx-auto h-[5px] w-16 max-w-full rounded-full bg-[linear-gradient(90deg,#467188,#effaff,#467188)] shadow-[0_1px_9px_#7dd3fc]" />)}
              </div>

              <details className="relative z-10 mb-3 rounded-lg border border-amber-500/40 bg-amber-50/90 px-3 py-2 text-xs text-amber-950"><summary className="cursor-pointer font-semibold">128 posiciones oficiales · Nota sobre Compras</summary><p className="mt-2 leading-relaxed">117 puestos operativos con códigos R2 y 11 administrativos. Selecciona un escritorio para abrir la ficha y el checklist. La quinta mesa visual de Compras no está registrada y no admite asignaciones.</p></details>
              <div className="relative z-10 grid gap-3" style={{ gridTemplateColumns: 'minmax(0,1fr) clamp(250px,19vw,320px)' }}>
                <div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))' }}>
                    {cells.map((cell) => (
                      <MainRow key={cell.name} name={cell.name} onSelect={selectArea} premium
                        seatCodes={EAST2_ROW_CODES[Number(cell.name.replace('Row ', ''))]}
                        supervisorCodes={EAST2_SUPERVISORS[Number(cell.name.replace('Row ', ''))]}
                        statuses={seatStatuses} assignedNames={assignedNames} />
                    ))}
                  </div>

                  <div className="relative my-3 overflow-hidden rounded border-x-4 border-sky-400/70 bg-[linear-gradient(90deg,#123453,#4c6073,#123453)] py-2 text-center text-[10px] font-bold tracking-[.20em] text-white shadow-[0_0_9px_#0ea5e94b]">CIRCULACION INTERIOR</div>

                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    {EAST_BOTTOM_ROWS.map((area) => (
                      <CompactRowCard key={area.name} name={area.name} spots={area.spots} onClick={() => selectArea(area)} premium
                        codes={EAST2_BOTTOM_CODES[area.name]}
                        onSeatSelect={code => selectArea({ name: code, spots: 0 })}
                        statuses={seatStatuses} assignedNames={assignedNames} />
                    ))}
                  </div>
                </div>

                <div className="flex min-h-[620px] flex-col gap-3">
                  {EAST_RIGHT_ROOMS.map((room) => (
                    <OfficeCard
                      key={room.name}
                      title={room.name}
                      sub={room.sub}
                      spots={room.spots}
                      accent={room.accent}
                      grow
                      premium
                      onClick={() => selectArea({ name: room.name, spots: room.spots })}
                      seatCodes={EAST2_OFFICE_CODES[room.name]}
                      onSeatSelect={code => selectArea({ name: code, spots: 0 })}
                      statuses={seatStatuses} assignedNames={assignedNames}
                    />
                  ))}
                </div>
              </div>

              <div className="relative z-10 mt-4 rounded-md border border-sky-500/40 bg-[linear-gradient(90deg,#173653,#4c6073,#173653)] py-3 text-center text-[11px] font-bold tracking-[.22em] text-white">PERIMETRO Y CIRCULACION · REFERENCIA</div>
            </div>
          ) : isWest3 ? (
            <div className="relative overflow-hidden rounded-b-lg border-x-4 border-b-4 border-sky-600 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_43px,#708a9c26_44px),repeating-linear-gradient(90deg,transparent_0px,transparent_43px,#708a9c26_44px),linear-gradient(120deg,#cadbe3,#f3f2eb_45%,#cddde5)] p-4 text-slate-900 shadow-[inset_0_0_35px_#0e74904d]">
              <div className="relative mb-4 flex h-8 items-center justify-center rounded border-x-4 border-sky-300/75 bg-[#123d63] text-[11px] font-bold tracking-widest text-white shadow-[0_0_10px_#38bdf855]">PLANO 2D · PISO 3 OESTE · POSICIONES REALES ({Object.keys(seatStatuses).filter(code => code.startsWith("P3O-")).length}/{P3O_EXPECTED_VISIBLE} registradas)</div>

              <div className="mb-2 flex justify-end gap-2" aria-label="Referencias oficiales de la franja superior">
                {P3O_UPPER_CODES.slice(24).map(code => (
                  <button key={code} type="button" data-seat-code={code} onClick={() => selectArea({name:code,spots:0})} className={"relative rounded border border-cyan-700 bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-900 " + seatRing(code,seatStatuses)}>{seatDisplayCode(code)}<SeatIndicator code={code} statuses={seatStatuses} /></button>
                ))}
              </div>
              <div className="relative z-10 grid gap-3" style={{ gridTemplateColumns: 'clamp(130px,11vw,160px) minmax(0,1fr) clamp(260px,19vw,320px)' }}>
                <div className="flex min-h-[820px] flex-col gap-3">
                  <OfficeCard
                    premium
                    title={THIRD_WEST_LATERAL_OFFICE.name}
                    sub={THIRD_WEST_LATERAL_OFFICE.sub}
                    spots={THIRD_WEST_LATERAL_OFFICE.spots}
                    accent={THIRD_WEST_LATERAL_OFFICE.accent}
                    seatCodes={P3O_ADMIN_PROJECT} onSeatSelect={code => selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}
                    onClick={() => selectArea({ name: THIRD_WEST_LATERAL_OFFICE.name, spots: THIRD_WEST_LATERAL_OFFICE.spots })}
                  />

                  <button
                    type="button"
                    onClick={() => selectArea({ name: 'Salida de emergencia', spots: 0 })}
                    className="mt-2 flex min-h-[205px] items-center justify-center rounded-xl border-2 border-emerald-700 bg-[#e9f7ec] p-3 text-center shadow transition hover:border-cyan-400"
                  >
                    <div>
                      <DoorOpen size={32} className="mx-auto mb-2 text-emerald-700" />
                      <div className="text-sm font-bold text-slate-800">Salida de emergencia</div>
                      <div className="mt-1 text-[10px] text-slate-600">Area posterior al lateral inferior</div>
                    </div>
                  </button>

                  <div className="flex-1 rounded-xl border-2 border-slate-500/80 bg-[#eef6ff] p-2 shadow">
                    <div className="rounded-lg bg-[#123d67] px-2 py-2 text-center text-[11px] font-bold text-white">{THIRD_WEST_LATERAL_ROW.name}</div>
                    <div className="mt-3 grid grid-cols-1 gap-1.5">
                      {Array.from({ length: THIRD_WEST_LATERAL_ROW.spots }, (_, n) => (
                        <button
                          key={n}
                          type="button"
                          data-seat-code={n === 0 ? P3O_LATERAL_FIRST : P3O_SIDE_CODES[n - 1]}
                          onClick={() => selectArea({ name: n === 0 ? P3O_LATERAL_FIRST : P3O_SIDE_CODES[n - 1], spots: 0 })}
                          className={`group relative flex items-center justify-center rounded border border-amber-700/40 bg-[linear-gradient(#e8c494,#b9926d)] py-2 shadow-sm transition hover:bg-sky-200 ${seatRing(n === 0 ? P3O_LATERAL_FIRST : P3O_SIDE_CODES[n - 1],seatStatuses)}`}
                        >
                          <DeskTop compact /><SeatIndicator code={n === 0 ? P3O_LATERAL_FIRST : P3O_SIDE_CODES[n - 1]} statuses={seatStatuses} /><AssignedPersonBubble code={n === 0 ? P3O_LATERAL_FIRST : P3O_SIDE_CODES[n - 1]} assignedNames={assignedNames} />
                          {P3O_SIDE_CODES[n - 1] ? <span className="ml-1 text-[8px] font-bold text-slate-900">{seatDisplayCode(P3O_SIDE_CODES[n - 1])}</span> : <span className="ml-1 text-[8px] font-bold text-slate-900" title="Etiqueta del plano; vinculacion interna por resolver">R1-J01</span>}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-center text-[10px] text-slate-700">4 posiciones laterales</div>
                  </div>
                </div>

                <div>
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                    {THIRD_WEST_TOP_ROWS.map((area) => (
                      <CompactRowCard premium key={area.name} name={area.name} spots={area.spots} onClick={() => selectArea(area)} codes={P3O_UPPER_CODES.slice((Number(area.name.replace('Row ', '')) - 11) * 6, (Number(area.name.replace('Row ', '')) - 10) * 6)} onSeatSelect={code => selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames} />
                    ))}
                  </div>

                  <div className="relative my-3 overflow-hidden rounded border-x-4 border-sky-400/70 bg-[linear-gradient(90deg,#123453,#4c6073,#123453)] py-2 text-center text-[10px] font-bold tracking-[.20em] text-white shadow-[0_0_9px_#0ea5e94b]">CIRCULACION SUPERIOR</div>

                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(10, minmax(100px, 1fr))' }}>
                    {cells.map((cell, index) => (
                      <MainRow
                        key={cell.name}
                        name={cell.name}
                        onSelect={selectArea}
                        premium
                        seatCount={16}
                        seatCodes={P3O_ROW_CODES[index + 1]}
                        supervisorCodes={P3O_SUPERVISORS[index + 1]}
                        statuses={seatStatuses} assignedNames={assignedNames}
                        topBlocked={[2, 4, 9].includes(index)}
                      />
                    ))}
                  </div>

                  <div className="relative my-3 overflow-hidden rounded border-x-4 border-sky-400/70 bg-[linear-gradient(90deg,#123453,#4c6073,#123453)] py-2 text-center text-[10px] font-bold tracking-[.20em] text-white shadow-[0_0_9px_#0ea5e94b]">CIRCULACION INFERIOR</div>

                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                    {THIRD_WEST_BOTTOM_ROWS.map((area) => (
                      <div key={area.name} className="relative"><CompactRowCard premium name={area.name} spots={area.spots} onClick={() => selectArea(area)} codes={area.name === 'Row 18' ? [...P3O_LOWER_CODES.slice(18),P3O_BOTTOM_LAST] : P3O_LOWER_CODES.slice((Number(area.name.replace('Row ', '')) - 15) * 6, (Number(area.name.replace('Row ', '')) - 14) * 6)} onSeatSelect={code => selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames} /></div>
                    ))}
                  </div>
                </div>

                <div className="flex min-h-[820px] flex-col gap-3">
                  <div className="mt-4">
                    <OfficeCard premium
                      title={THIRD_WEST_OFFICES[0].name}
                      sub={THIRD_WEST_OFFICES[0].sub}
                      spots={THIRD_WEST_OFFICES[0].spots}
                      accent={THIRD_WEST_OFFICES[0].accent}
                      seatCodes={P3O_ADMIN_DIRECTORS} onSeatSelect={code => selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}
                      onClick={() => selectArea({ name: THIRD_WEST_OFFICES[0].name, spots: THIRD_WEST_OFFICES[0].spots })} />
                  </div>
                  <div className="mt-2">
                    <OfficeCard premium
                      title={THIRD_WEST_OFFICES[1].name}
                      sub={THIRD_WEST_OFFICES[1].sub}
                      spots={THIRD_WEST_OFFICES[1].spots}
                      accent={THIRD_WEST_OFFICES[1].accent}
                      seatCodes={P3O_ADMIN_MANAGER} onSeatSelect={code => selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}
                      onClick={() => selectArea({ name: THIRD_WEST_OFFICES[1].name, spots: THIRD_WEST_OFFICES[1].spots })} />
                  </div>
                  <div className="relative mt-2 rounded-xl border-2 border-[#647a8b] bg-[#dcf5e8] p-2 shadow-[inset_0_0_0_5px_#62798b33,0_0_12px_#0ea5e94d]">
                    <button type="button"
                      onClick={() => selectArea({ name: THIRD_WEST_OFFICES[2].name, spots: 0 })}
                      className="w-full rounded-lg bg-[linear-gradient(90deg,#082948,#145786,#082948)] px-2 py-2 text-center text-[11px] text-white ring-1 ring-sky-400/70">
                      {THIRD_WEST_OFFICES[2].name}
                    </button>
                    <small className="mt-2 block text-center text-[10px] text-slate-700">{THIRD_WEST_OFFICES[2].sub}</small>
                    <div className="mt-3 flex justify-center px-4 pb-2">
                      <div className="flex h-12 w-full max-w-[150px] items-center justify-center rounded-xl border-2 border-[#99744b] bg-[#c6a783] shadow-md">
                        <span className="text-center text-[11px] font-semibold text-slate-800">Mesa de reuniones</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-4 rounded-md border border-sky-500/40 bg-[linear-gradient(90deg,#173653,#4c6073,#173653)] py-3 text-center text-[11px] font-bold tracking-[.22em] text-white">PERIMETRO Y CIRCULACION · REFERENCIA</div>
            </div>
          ) : isEast3 ? (
            <div className="relative overflow-hidden rounded-b-lg border-x-4 border-b-4 border-sky-600 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_43px,#708a9c26_44px),linear-gradient(120deg,#cadbe3,#f3f2eb_45%,#cddde5)] p-4 text-slate-900 shadow-[inset_0_0_35px_#0e74904d]">
              <div className="relative mb-4 flex h-8 items-center justify-center rounded border-x-4 border-sky-300/75 bg-[#123d63] text-[11px] font-bold tracking-widest text-white">PLANO 2D · PISO 3 ESTE · 212 POSICIONES (210 OPERATIVAS + 2 ADMINISTRATIVAS)</div>
              <div className="grid gap-3" style={{gridTemplateColumns:'clamp(170px,15vw,225px) minmax(0,1fr) clamp(180px,16vw,240px)'}}>
                <div className="flex flex-col gap-3">
                  {THIRD_EAST_OFFICES.map(room => (
                    <OfficeCard key={room.name} premium title={room.name} sub={room.sub} spots={room.spots} accent={room.accent}
                      onClick={() => selectArea({name:room.name,spots:room.spots})}
                      seatCodes={P3E_ADMIN_CODES[room.name]}
                      onSeatSelect={code=>selectArea({name:code,spots:0})}
                      statuses={seatStatuses} assignedNames={assignedNames}/>
                  ))}
                </div>
                <div className="min-w-0">
              <div className="mb-3 grid gap-2" style={{gridTemplateColumns:'4fr 6fr 6fr 6fr 6fr'}}>
                {[4,6,6,6,6].map((count,idx) => {
                  const first=[0,4,10,16,22][idx]
                  return <CompactRowCard key={idx} name={`Perímetro superior ${idx+1}`} spots={count} premium codes={P3E_TOP_CODES.slice(first,first+count)} onClick={() => selectArea({name:`Perímetro superior ${idx+1}`,spots:count})} onSeatSelect={code=>selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}/>
                })}
              </div>
              <div className="relative my-3 overflow-hidden rounded border-x-4 border-sky-400/70 bg-[linear-gradient(90deg,#123453,#4c6073,#123453)] py-2 text-center text-[10px] font-bold tracking-[.20em] text-white">CIRCULACION SUPERIOR</div>
              <div className="grid gap-3" style={{gridTemplateColumns:'repeat(9,minmax(100px,1fr))'}}>
                {cells.map((cell,index)=><MainRow key={cell.name} name={cell.name} premium onSelect={selectArea} seatCount={16} seatCodes={P3E_ROW_CODES[index+1]} supervisorCodes={P3E_SUP_CODES[index+1]} topBlocked={[0,7].includes(index)} statuses={seatStatuses} assignedNames={assignedNames}/>)}
              </div>
              <div className="relative my-3 overflow-hidden rounded border-x-4 border-sky-400/70 bg-[linear-gradient(90deg,#123453,#4c6073,#123453)] py-2 text-center text-[10px] font-bold tracking-[.20em] text-white">CIRCULACION INFERIOR</div>
              <div className="grid gap-2" style={{gridTemplateColumns:'6fr 6fr 6fr 4fr'}}>
                {[6,6,6,4].map((count,idx)=>{ const first=[0,6,12,18][idx]; return <CompactRowCard key={idx} name={`Perímetro inferior ${idx+1}`} premium spots={count} codes={P3E_BOTTOM_CODES.slice(first,first+count)} onClick={()=>selectArea({name:`Perímetro inferior ${idx+1}`,spots:count})} onSeatSelect={code=>selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}/>})}
              </div>
              <div className="relative z-10 mt-4 rounded-md border border-sky-500/40 bg-[linear-gradient(90deg,#173653,#4c6073,#173653)] py-3 text-center text-[11px] font-bold tracking-[.22em] text-white">210 OPERATIVOS + 2 ADMINISTRATIVOS = 212 PUESTOS</div>
                </div>
                <div className="flex flex-col gap-3">
                  <OfficeCard premium title="Salón de conferencia" sub="Sala sin posiciones fijas" spots={0} accent="bg-[#dcf5e8]" onClick={()=>selectArea({name:'Salon de conferencia',spots:0})}/>
                  <button type="button" className="min-h-40 rounded-xl border-2 border-amber-600 bg-[#fff2a8] text-sm font-semibold text-slate-900" onClick={()=>selectArea({name:'Salida de emergencia',spots:0})}>Salida de emergencia</button>
                </div>
              </div>
            </div>
          ) : isWest4 ? (
            <div className="relative overflow-hidden rounded-b-lg border-x-4 border-b-4 border-sky-600 bg-[repeating-linear-gradient(0deg,transparent_0px,transparent_43px,#708a9c26_44px),linear-gradient(120deg,#cadbe3,#f3f2eb_45%,#cddde5)] p-4 text-slate-900">
              <div className="mb-4 flex h-8 items-center justify-center rounded border-x-4 border-sky-300/75 bg-[#123d63] text-[11px] font-bold tracking-widest text-white">PLANO 2D · PISO 4 OESTE · 239 OPERATIVAS + 8 ADMINISTRATIVAS IDENTIFICADAS</div>
              <div className="relative z-10 grid gap-3" style={{gridTemplateColumns:'clamp(180px,14vw,230px) minmax(0,1fr) clamp(210px,17vw,270px)'}}>
                <div className="flex min-h-[820px] flex-col gap-3">
                  {FOURTH_WEST_LEFT.map((room,index) => <OfficeCard key={room.name} title={room.name} sub={room.sub} spots={room.spots} accent={room.accent} premium grow={index===1} onClick={() => selectArea({name:room.name,spots:room.spots})} seatCodes={index===0 ? P4O_ADMIN_CODES.slice(0,2):P4O_ADMIN_CODES.slice(2,4)} onSeatSelect={code=>selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}/>)}
                  <CompactRowCard name="Row 19" spots={4} premium codes={P4O_SIDE_CODES} onClick={()=>selectArea({name:'Row 19',spots:4})} onSeatSelect={code=>selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}/>
                </div>
                <div>
                  <div className="grid gap-2" style={{gridTemplateColumns:'repeat(5,minmax(0,1fr))'}}>
                    {P4O_TOP_ROWS.map((r,index)=><CompactRowCard key={r.name} name={r.name} spots={r.spots} premium codes={P4O_UPPER_CODES.slice(P4O_TOP_ROWS.slice(0,index).reduce((acc,x)=>acc+x.spots,0),P4O_TOP_ROWS.slice(0,index+1).reduce((acc,x)=>acc+x.spots,0))} onClick={()=>selectArea(r)} onSeatSelect={code=>selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}/>)}
                  </div>
                  <div className="relative my-3 rounded border-x-4 border-sky-400/70 bg-[linear-gradient(90deg,#123453,#4c6073,#123453)] py-2 text-center text-[10px] font-bold tracking-widest text-white">CIRCULACIÓN SUPERIOR</div>
                  <div className="grid gap-3" style={{gridTemplateColumns:'repeat(10,minmax(100px,1fr))'}}>
                    {cells.map((cell,index)=><MainRow key={cell.name} name={cell.name} onSelect={selectArea} premium seatCount={16} seatCodes={P4O_ROW_CODES[index+1]} supervisorCodes={P4O_SUPERVISOR_CODES[index+1]} topBlocked={index===4} statuses={seatStatuses} assignedNames={assignedNames}/>)}
                  </div>
                  <div className="relative my-3 rounded border-x-4 border-sky-400/70 bg-[linear-gradient(90deg,#123453,#4c6073,#123453)] py-2 text-center text-[10px] font-bold tracking-widest text-white">CIRCULACIÓN INFERIOR</div>
                  <div className="grid gap-2" style={{gridTemplateColumns:'repeat(4,minmax(0,1fr))'}}>
                    {FOURTH_WEST_BOTTOM_ROWS.map((r,index)=><CompactRowCard key={r.name} name={r.name} spots={r.spots} premium codes={P4O_LOWER_CODES.slice(index*6,(index+1)*6)} onClick={()=>selectArea(r)} onSeatSelect={code=>selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}/>)}
                  </div>
                </div>
                <div className="flex min-h-[820px] flex-col gap-3">
                  {FOURTH_WEST_RIGHT.map((room,index)=><OfficeCard key={room.name} title={room.name} sub={room.sub} spots={room.spots} accent={room.accent} premium grow={index===2} onClick={()=>selectArea({name:room.name,spots:room.spots})} seatCodes={index===0?P4O_ADMIN_CODES.slice(4,7):index===1?P4O_ADMIN_CODES.slice(7,8):undefined} onSeatSelect={code=>selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}/>)}
                </div>
              </div>
              <div className="mt-4 rounded-md border border-sky-500/40 bg-[linear-gradient(90deg,#173653,#4c6073,#173653)] py-3 text-center text-[11px] font-bold tracking-widest text-white">PERÍMETRO Y CIRCULACIÓN · REFERENCIA</div>
            </div>
          ) : isEast4 ? (
            <div className="relative overflow-hidden rounded-b-lg border-x-4 border-b-4 border-sky-600 bg-[linear-gradient(120deg,#cadbe3,#f3f2eb_45%,#cddde5)] p-4 text-slate-900">
              <div className="mb-4 rounded border-x-4 border-sky-300 bg-[#123d63] py-2 text-center text-[11px] font-bold tracking-widest text-white">PLANO 2D · PISO 4 ESTE · 217 OPERATIVAS + 5 ADMINISTRATIVAS IDENTIFICADAS</div>
              <div className="grid gap-3" style={{ gridTemplateColumns: '210px minmax(0,1fr) 285px' }}>
                <div className="flex min-h-[760px] flex-col gap-3">
                  {FOURTH_EAST_LEFT.map((room, index) => (
                    <OfficeCard key={room.name} title={room.name} sub={room.sub} spots={room.spots} accent={room.accent} premium
                      grow={index === 0 || index === 1} onClick={() => selectArea({ name: room.name, spots: room.spots })}
                      seatCodes={room.name === 'Oficina individual' ? P4E_ADMIN_LEFT : undefined}
                      onSeatSelect={code => selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames} />
                  ))}
                </div>
                <div>
                  <div className="grid gap-2" style={{ gridTemplateColumns: '7fr 7fr 7fr 7fr 4fr' }}>
                    {P4E_TOP_ROWS.map((row,index) => <CompactRowCard key={row.name} name={row.name} spots={row.spots} premium
                      codes={P4E_UPPER_CODES.slice(P4E_TOP_ROWS.slice(0,index).reduce((s,x)=>s+x.spots,0),P4E_TOP_ROWS.slice(0,index+1).reduce((s,x)=>s+x.spots,0))}
                      onClick={() => selectArea(row)} onSeatSelect={code=>selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames}/>) }
                  </div>
                  <div className="my-3 rounded border-x-4 border-sky-400/70 bg-[#123453] py-2 text-center text-[10px] font-bold tracking-[.20em] text-white">CIRCULACION SUPERIOR</div>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(9, minmax(100px,1fr))' }}>
                    {cells.map((row,index) => <MainRow key={row.name} name={row.name} onSelect={selectArea} premium
                      seatCount={16} seatCodes={P4E_ROW_CODES[index+1]} supervisorCodes={P4E_SUP_CODES[index+1]}
                      topBlocked={[0,6].includes(index)} statuses={seatStatuses} assignedNames={assignedNames} />)}
                  </div>
                  <div className="my-3 rounded border-x-4 border-sky-400/70 bg-[#123453] py-2 text-center text-[10px] font-bold tracking-[.20em] text-white">CIRCULACION INFERIOR</div>
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                    {FOURTH_EAST_BOTTOM_ROWS.map((row,index) => <CompactRowCard key={row.name} name={row.name} spots={row.spots} premium
                      codes={P4E_LOWER_CODES.slice(index*6,(index+1)*6)} onClick={() => selectArea(row)}
                      onSeatSelect={code=>selectArea({name:code,spots:0})} statuses={seatStatuses} assignedNames={assignedNames} />)}
                  </div>
                </div>
                <div className="flex min-h-[760px] flex-col gap-3">
                  {FOURTH_EAST_RIGHT.map((room,index) => <OfficeCard key={room.name} title={room.name} sub={room.sub} spots={room.spots} accent={room.accent} premium
                    seatCodes={P4E_ADMIN_RIGHT[index]} onSeatSelect={code=>selectArea({name:code,spots:0})}
                    statuses={seatStatuses} assignedNames={assignedNames} onClick={() => selectArea({ name: room.name, spots: room.spots })} />)}
                  <button type="button" onClick={() => selectArea({ name: 'Salida de emergencia', spots: 0 })}
                    className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border-2 border-amber-700 bg-[#fff2a8] p-3 text-slate-900 hover:border-cyan-500">
                    <DoorOpen size={32} className="text-emerald-800" /><strong>Salida de emergencia</strong>
                  </button>
                </div>
              </div>
              <div className="mt-4 rounded bg-[#173653] py-3 text-center text-[11px] font-bold tracking-[.2em] text-white">PERIMETRO Y CIRCULACION · REFERENCIA</div>
            </div>
          ) : (
            <div className="border-x-4 border-slate-400 bg-[#dee5e8] px-4 pb-5 pt-6">
              <div className="mb-5 flex h-9 items-center justify-center rounded-md bg-[#657080] text-[11px] font-extrabold tracking-[.25em] text-white">PASILLO PRINCIPAL · REFERENCIA</div>
              <div className="flex min-h-[345px] items-stretch justify-between gap-3">
                {cells.map((cell, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => selectArea(cell)}
                    title={`Consultar ${cell.name}`}
                    className={`group relative flex flex-1 flex-col gap-2 rounded-md border-2 border-slate-600 p-2 text-left shadow-md transition hover:-translate-y-1 hover:border-cyan-400 hover:shadow-cyan-500/20 ${cell.kind === 'row' ? 'bg-[#edf1ee]' : 'bg-[#e4d8c4]'}`}
                  >
                    <div className="w-full rounded bg-[#12648f] px-1 py-2 text-center text-[10px] font-semibold text-white">{cell.name}</div>
                    {cell.spots > 0 ? (
                      <div className="grid flex-1 grid-cols-2 gap-1.5">
                        {Array.from({ length: cell.spots }, (_, n) => (
                          <div key={n} className="flex items-center justify-center rounded-sm border border-sky-800/40 bg-sky-400/30">
                            <Monitor size={12} className="text-sky-900" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-center text-center text-xs text-slate-700">Distribucion pendiente</div>
                    )}
                    <div className="w-full rounded bg-[#0b436f] px-1 py-2 text-center text-[9px] font-semibold text-white">{cell.kind === 'row' ? 'Distribucion visual' : 'Area auxiliar'}</div>
                  </button>
                ))}
              </div>
              <div className="mt-5 h-10 rounded-md bg-[#657080] text-center text-[11px] font-bold leading-10 tracking-[.2em] text-white">ACCESOS Y CIRCULACION · POR DEFINIR</div>
            </div>
          )}
        </div>
      </div>

      )}

      {editOpen && selected && (
        <div role="dialog" aria-modal="true" aria-label="Editor de posición - vista previa" className="fixed inset-0 z-[200] flex justify-end bg-slate-950/60" onClick={() => setEditOpen(false)}>
          <aside className="flex h-full w-full max-w-[880px] flex-col overflow-y-auto border-l border-cyan-500/40 bg-[#09152c] p-5 text-slate-100 shadow-[-12px_0_45px_#0009]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-300">Piso {floor} · {wing}</p><h2 className="mt-1 text-xl font-bold">Editar posición</h2><p className="mt-1 text-sm text-slate-300">{selected.name}</p></div>
              <button type="button" aria-label="Cerrar editor" className="rounded-lg border border-slate-600 p-2 hover:bg-white/10" onClick={() => setEditOpen(false)}><X size={18} /></button>
            </div>
            <div className="mb-4 rounded-lg border border-cyan-500/40 bg-cyan-950/30 p-3 text-xs text-cyan-100">Conexión por código oficial: el mapa identifica la posición real de PostgreSQL. Se bloquea la asignación cuando el código no coincide. El estado y los faltantes requieren el checklist real.</div>
            <label htmlFor="map-real-position" className="mb-2 text-sm font-semibold">Vincular a posición existente (obligatorio)</label>
            <select id="map-real-position" disabled={!!officialCode || (floor === 3 && wing === 'Oeste')} value={realId} onChange={e => chooseRealPosition(e.target.value)} className="mb-2 rounded-lg border border-slate-600 bg-[#172b49] p-3 text-sm text-white">
              <option value="">Seleccionar posición real por código...</option>
              {realPositions.filter(p => p.location?.floorNumber === floor && (p.wing || p.location?.wing || '').toUpperCase() === (wing === 'Oeste' ? 'WEST' : 'EAST')).map(p => <option key={p.id} value={p.id}>{p.code} — {p.name || 'Sin nombre'}</option>)}
            </select>
            <p className="mb-4 text-xs text-amber-200">{realLoading ? 'Consultando base de datos...' : officialCode ? `Código físico: ${officialCode}${matchedPosition ? ' · verificado' : ' · sin coincidencia'}` : 'Este sector aún requiere vinculación individual.'}</p>
            {selectedReal && <div className="mb-4 rounded-lg border border-cyan-700 bg-[#122b42] p-3 text-xs">Posición confirmada: <b>{selectedReal.code}</b><br/>Persona actual: {selectedReal.inventoryPerson ? `${selectedReal.inventoryPerson.firstName} ${selectedReal.inventoryPerson.lastName}` : 'Sin asignar'}<br/>PCNAME: {selectedReal.equipment?.pcName || 'No registrado'}</div>}
            <label className="mb-2 text-sm font-semibold" htmlFor="map-real-person">Asignar / retirar persona real</label>
            <select id="map-real-person" disabled={!selectedReal || realLoading} value={personChoice} onChange={e => setPersonChoice(e.target.value)} className="mb-2 rounded-lg border border-slate-600 bg-[#172b49] p-3 text-sm text-white">
              <option value="">Sin usuario asignado</option>
              {realPeople.filter(u => u.status === 'ACTIVE').map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.employeeId})</option>)}
            </select>
            <p className="mb-2 text-xs text-slate-400">La API evita asignar a una persona que ya ocupa otra posición. Para transferirla, primero hay que liberar su origen mediante el flujo autorizado.</p>
            {realMessage && <p role="status" className="mb-3 rounded border border-cyan-600/50 p-2 text-xs text-cyan-200">{realMessage}</p>}
            <button type="button" disabled={!selectedReal || savingReal || personChoice === (selectedReal?.inventoryPersonId || '')} onClick={saveRealPerson} className="mb-5 rounded-lg bg-cyan-700 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">{savingReal ? 'Guardando...' : 'Guardar solo asignación de usuario'}</button>
            <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-950/20 p-3 text-xs text-emerald-100">
              Checklist real compartido con Usuarios / Posiciones y Almacén. Puedes consultar existencias y preparar cantidades aquí. Solo al pulsar la confirmación del propio checklist se registra una asignación o movimiento. Esta pantalla no descuenta stock automáticamente.
            </div>
            {checklistError && <p role="alert" className="mb-3 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200">{checklistError}</p>}
            {selectedReal ? (
              <div className="mb-5 min-w-0 overflow-x-auto rounded-xl border border-cyan-500/30 bg-[#0c1930] p-3">
                <PositionChecklist
                  key={selectedReal.id}
                  positionId={selectedReal.id}
                  positionCode={selectedReal.code}
                  main={selectedReal.equipment}
                  accessories={realAccessories}
                  onReviewSaved={() => { void refreshChecklistPosition() }}
                />
              </div>
            ) : (
              <div className="mb-5 rounded-lg border border-amber-500/40 p-3 text-sm text-amber-200">No existe un vinculo verificado. El checklist real no puede abrirse.</div>
            )}
            <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4">
              <button type="button" onClick={() => setEditOpen(false)} className="rounded-lg border border-slate-500 px-4 py-3 text-sm hover:bg-white/10">Cerrar sin guardar</button>
            </div>
          </aside>
        </div>
      )}
      {!editOpen && selected && (
        <div role="dialog" aria-label="Detalle de puesto" aria-modal="false"
          className="fixed z-[100] w-[min(360px,calc(100vw-24px))] rounded-xl border border-cyan-400/70 bg-[#0b1730] p-4 text-slate-100 shadow-[0_15px_55px_rgba(0,0,0,.75)]"
          style={{ left: popupPoint.x, top: popupPoint.y }}
          onClick={(event) => event.stopPropagation()}>
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="break-words text-sm font-bold">{selected.name}</h3>
              <p className="mt-1 text-[11px] text-slate-400">Piso {floor} · Lado {wing}</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Cerrar ficha"
              className="rounded-md border border-slate-600 p-1.5 hover:bg-white/10"><X size={15} /></button>
          </div>
          <span className="mb-3 inline-block rounded-full border border-amber-500/50 bg-amber-950/40 px-2 py-1 text-[10px] text-amber-200">{selected.name.startsWith('P2E-TEMP-') || selected.name.startsWith('P2E-PENDIENTE-') ? 'Identificador visual; sin registro oficial' : officialCode ? matchedPosition ? 'Vinculada a PostgreSQL' : 'Código sin verificar' : 'Sector sin vínculo'}</span>
          <div className="space-y-2 rounded-lg border border-slate-600/40 bg-[#13223e] p-3 text-xs">
            <div className="flex items-center gap-2"><MapPin size={14} className="text-cyan-300" /> Ubicación: Piso {floor} · {wing}</div>
            <div className="flex items-center gap-2"><Monitor size={14} className="text-cyan-300" /> Posición: {officialCode || selected.name}</div>
            <div className="flex items-center gap-2"><UserRound size={14} className="text-cyan-300" /> Usuario: {matchedPosition?.inventoryPerson ? `${matchedPosition.inventoryPerson.firstName} ${matchedPosition.inventoryPerson.lastName}` : 'Sin usuario asignado'}</div>
            <div className="flex items-center gap-2"><HardDrive size={14} className="text-cyan-300" /> PCNAME: {matchedPosition?.equipment?.pcName || 'Sin equipo vinculado'}</div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={selected.name.startsWith('P2E-TEMP-') || selected.name.startsWith('P2E-PENDIENTE-') || (floor === 3 && wing === 'Oeste' && !matchedPosition) || ((selected.name.startsWith('P2E-') || selected.name.startsWith('P3O-') || selected.name.startsWith('P4O-') || selected.name.startsWith('P3E-')) && !matchedPosition)} onClick={() => { setRealId(matchedPosition?.id || ''); setPersonChoice(matchedPosition?.inventoryPersonId || ''); setRealMessage(''); setEditOpen(true) }}
              className="flex-1 rounded-lg bg-gradient-to-r from-violet-700 to-fuchsia-700 px-2 py-2 text-[11px] font-semibold hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"><Pencil size={13} className="mr-1 inline" /> Abrir editor</button>
            <button type="button" onClick={() => setSelected(null)}
              className="rounded-lg border border-cyan-600 px-4 py-2 text-[11px] hover:bg-cyan-900/30">Cerrar</button>
          </div>
        </div>
      )}
    </section>
  )
}
