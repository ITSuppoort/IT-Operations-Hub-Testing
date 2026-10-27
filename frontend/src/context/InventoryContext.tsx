'use client'

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react'

import type { AssetCategory } from
  '@/components/equipment/equipmentConfig'

export type EquipmentStatus =
  | 'available'
  | 'assigned'
  | 'repair'
  | 'damaged'
  | 'retired'
  | 'returned'
export type MovementType =
  | 'entry'
  | 'exit'
  | 'assignment'
  | 'transfer'
  | 'repair'
  | 'replacement'
  | 'disposal'
  | 'vendor-return'


export type MovementFilter = {
  search: string

  type: MovementType | 'all'

  status:
    | 'all'
    | 'completed'
    | 'pending'
    | 'cancelled'

  period:
    | 'all'
    | 'today'
    | 'yesterday'
    | 'week'
    | 'month'
    | 'previous-month'
    | 'custom'

  startDate: string

  endDate: string
}


export type Movement = {
  
  id: number

  date: string

  type: MovementType

  equipmentId: number

  equipmentName: string

  serial: string

  quantity: number

  user: string

  from: string

  to: string

  location: string

  responsible: string

  status:
    | 'completed'
    | 'pending'
    | 'cancelled'

  notes: string

  // =====================================================
  // TRAZABILIDAD DE UBICACIONES
  // =====================================================

  fromLocationId?: number

  toLocationId?: number
}

  export type EquipmentCondition =
  | 'new'
  | 'used'
  | 'damaged'

  // =====================================================
// UBICACIONES DEL SISTEMA
// =====================================================

export type Location = {
  id: number

  name: string

  type:
    | 'warehouse'
    | 'floor'
}

export type EquipmentItem = {
  id: number
  category: AssetCategory
  brand: string
  model: string
  quantity: number
  capacity: string
  entryDate: string
  pcName: string
  serial: string
  type: string
  user: string
  condition: EquipmentCondition
  ramGB: number | null
  storageGB: number | null
  status: EquipmentStatus

  // =====================================================
  // UBICACIÓN ACTUAL DEL ACTIVO
  // =====================================================

  locationId?: number
}

type InventoryContextType = {
  equipment: EquipmentItem[]

  movements: Movement[]

  movementFilters: MovementFilter

  setMovementFilters: (filters: MovementFilter) => void

  getFilteredMovements: () => Movement[]

  addMovement: (movement: Movement) => void
  
  addEquipment: (item: EquipmentItem) => void
  
  updateEquipment: (
    id: number,
    changes: Partial<EquipmentItem>
  ) => void

  findEquipmentByCode: (
  code: string
) => EquipmentItem | undefined


// Ubicaciones del sistema
locations: Location[]

}

const InventoryContext =
  createContext<InventoryContextType | null>(null)

export function InventoryProvider({
  children,
}: {
  children: ReactNode
}) {
  const [equipment, setEquipment] =
    useState<EquipmentItem[]>([])

  const [movements, setMovements] =
  useState<Movement[]>([])

  // =====================================================
// UBICACIONES DEL SISTEMA
// =====================================================

const locations: Location[] = [

  {
    id: 1,
    name: 'Almacén',
    type: 'warehouse'
  },


  {
    id: 2,
    name: 'Piso 1 Este',
    type: 'floor'
  },

  {
    id: 3,
    name: 'Piso 1 Oeste',
    type: 'floor'
  },


  {
    id: 4,
    name: 'Piso 2 Este',
    type: 'floor'
  },

  {
    id: 5,
    name: 'Piso 2 Oeste',
    type: 'floor'
  },


  {
    id: 6,
    name: 'Piso 3 Este',
    type: 'floor'
  },

  {
    id: 7,
    name: 'Piso 3 Oeste',
    type: 'floor'
  },


  {
    id: 8,
    name: 'Piso 4 Este',
    type: 'floor'
  },

  {
    id: 9,
    name: 'Piso 4 Oeste',
    type: 'floor'
  }

]

    const [movementFilters, setMovementFilters] =
    useState<MovementFilter>({
      search: '',
      type: 'all',
      status: 'all',
      period: 'all',
      startDate: '',
      endDate: '',
    })

  const addEquipment = (item: EquipmentItem) => {
  setEquipment((previous) => [...previous, item])
}
const addMovement = (movement: Movement) => {
  setMovements((previous) => [
    ...previous,
    movement,
  ])
}
const updateEquipment = (
  id: number,
  changes: Partial<EquipmentItem>
) => {
  setEquipment((previous) =>
    previous.map((item) =>
      item.id === id
        ? { ...item, ...changes, id: item.id }
        : item
    )
  )
}

const getFilteredMovements = () => {
  // Filtramos todos los movimientos registrados
  return movements.filter((movement) => {

    // =========================================================
    // BÚSQUEDA
    // Busca por nombre del equipo, serial o usuario
    // =========================================================

    const search = movementFilters.search.trim().toLowerCase()

    const matchesSearch =
      !search ||
      movement.equipmentName.toLowerCase().includes(search) ||
      movement.serial.toLowerCase().includes(search) ||
      movement.user.toLowerCase().includes(search)


    // =========================================================
    // TIPO DE MOVIMIENTO
    // Entrada, salida, asignación, transferencia, etc.
    // =========================================================

    const matchesType =
      movementFilters.type === 'all' ||
      movement.type === movementFilters.type


    // =========================================================
    // ESTADO
    // Completado, pendiente o cancelado
    // =========================================================

    const matchesStatus =
      movementFilters.status === 'all' ||
      movement.status === movementFilters.status


    // =========================================================
    // FECHAS
    // Convertimos la fecha del movimiento en un objeto Date
    // =========================================================

    const movementDate = new Date(movement.date)

    // Fecha y hora actual
    const now = new Date()


    // =========================================================
    // INICIO DEL DÍA ACTUAL
    // Ejemplo:
    // 27/09/2026 00:00:00
    // =========================================================

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    )


    // =========================================================
    // INICIO DEL DÍA SIGUIENTE
    // Se utiliza como límite superior para "Hoy"
    // =========================================================

    const startOfTomorrow = new Date(startOfToday)

    startOfTomorrow.setDate(
      startOfTomorrow.getDate() + 1
    )


    // =========================================================
    // INICIO DE AYER
    // =========================================================

    const startOfYesterday = new Date(startOfToday)

    startOfYesterday.setDate(
      startOfYesterday.getDate() - 1
    )


    // =========================================================
    // INICIO DEL PERIODO DE 7 DÍAS
    // Incluye hoy y los 6 días anteriores
    // =========================================================

    const startOfWeek = new Date(startOfToday)

    startOfWeek.setDate(
      startOfWeek.getDate() - 6
    )


    // =========================================================
    // INICIO DEL MES ACTUAL
    // Ejemplo:
    // 01/09/2026 00:00:00
    // =========================================================

    const startOfCurrentMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    )


    // =========================================================
    // INICIO DEL MES ANTERIOR
    // =========================================================

    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1
    )


    // =========================================================
    // INICIO DEL PRÓXIMO MES
    // Se utiliza como límite superior del mes actual
    // =========================================================

    const startOfNextMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1
    )


    // =========================================================
    // VARIABLE QUE DETERMINA SI EL MOVIMIENTO
    // PERTENECE AL PERIODO SELECCIONADO
    // =========================================================

    let matchesPeriod = true


    // =========================================================
    // FILTRO DE PERIODO
    // =========================================================

    switch (movementFilters.period) {

      // ---------------------------------------------------------
      // HOY
      // ---------------------------------------------------------

      case 'today':

        matchesPeriod =
          movementDate >= startOfToday &&
          movementDate < startOfTomorrow

        break


      // ---------------------------------------------------------
      // AYER
      // ---------------------------------------------------------

      case 'yesterday':

        matchesPeriod =
          movementDate >= startOfYesterday &&
          movementDate < startOfToday

        break


      // ---------------------------------------------------------
      // ÚLTIMOS 7 DÍAS
      // ---------------------------------------------------------

      case 'week':

        matchesPeriod =
          movementDate >= startOfWeek &&
          movementDate < startOfTomorrow

        break


      // ---------------------------------------------------------
      // ESTE MES
      // ---------------------------------------------------------

      case 'month':

        matchesPeriod =
          movementDate >= startOfCurrentMonth &&
          movementDate < startOfNextMonth

        break


      // ---------------------------------------------------------
      // MES ANTERIOR
      // ---------------------------------------------------------

      case 'previous-month':

        matchesPeriod =
          movementDate >= startOfPreviousMonth &&
          movementDate < startOfCurrentMonth

        break


      // ---------------------------------------------------------
      // PERIODO PERSONALIZADO
      // Utiliza las fechas "Desde" y "Hasta"
      // ---------------------------------------------------------

      case 'custom': {

        // Fecha inicial seleccionada por el usuario
        const start = movementFilters.startDate
          ? new Date(
              `${movementFilters.startDate}T00:00:00`
            )
          : null


        // Fecha final seleccionada por el usuario
        const end = movementFilters.endDate
          ? new Date(
              `${movementFilters.endDate}T00:00:00`
            )
          : null


        // Si el movimiento es anterior a "Desde",
        // no debe aparecer
        if (start && movementDate < start) {
          matchesPeriod = false
        }


        // Si existe una fecha "Hasta",
        // incluimos todo ese día completo
        if (end) {

          const endOfDay = new Date(end)

          // Pasamos al inicio del día siguiente
          // para poder incluir las 23:59:59 del día seleccionado
          endOfDay.setDate(
            endOfDay.getDate() + 1
          )


          // Si el movimiento ocurre después
          // del periodo seleccionado, no aparece
          if (movementDate >= endOfDay) {
            matchesPeriod = false
          }
        }

        break
      }


      // ---------------------------------------------------------
      // TODO EL HISTORIAL
      // ---------------------------------------------------------

      case 'all':

      default:

        matchesPeriod = true

        break
    }


    // =========================================================
    // RESULTADO FINAL
    //
    // El movimiento debe cumplir TODOS los filtros:
    //
    // 1. Búsqueda
    // 2. Tipo
    // 3. Estado
    // 4. Periodo
    // =========================================================

    return (
      matchesSearch &&
      matchesType &&
      matchesStatus &&
      matchesPeriod
    )
  })
}


const findEquipmentByCode = (code: string) => {

  const normalizedCode = code.trim().toLowerCase()

  if (!normalizedCode) {
    return undefined
  }

  return equipment.find((item) => {
    const serial = item.serial.trim().toLowerCase()

    return serial === normalizedCode
  })
}
  return (
  <InventoryContext.Provider
  value={{
    equipment,
    movements,
    movementFilters,
    setMovementFilters,
    getFilteredMovements,

    // Equipos
    addEquipment,
    updateEquipment,
    findEquipmentByCode,

    // Movimientos
    addMovement,

    // Ubicaciones
    locations,
  }}
>
    {children}
  </InventoryContext.Provider>
)
}

export function useInventory() {
  const context = useContext(InventoryContext)

  if (!context) {
    throw new Error(
      'useInventory debe utilizarse dentro de InventoryProvider'
    )
  }

  return context
}