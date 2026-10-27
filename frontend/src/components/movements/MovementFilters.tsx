'use client'

import { useInventory } from '@/context/InventoryContext'

export default function MovementFilters() {

  const {
    movementFilters,
    setMovementFilters,
  } = useInventory()


  return (
    <div
      className="
        grid
        grid-cols-1
        md:grid-cols-4
        gap-4
      "
    >

      {/* Buscar */}
      <div>
        <label className="text-sm text-slate-400">
          Buscar
        </label>

        <input
  value={movementFilters.search}
  onChange={(e) =>
    setMovementFilters({
      ...movementFilters,
      search: e.target.value,
    })
  }
  placeholder="Equipo, serial o usuario"
          className="
            mt-1
            w-full
            rounded-lg
            border
            border-white/10
            bg-[#111119]
            px-3
            py-2
            text-white
            outline-none
          "
        />
      </div>


      {/* Tipo */}
      <div>
        <label className="text-sm text-slate-400">
          Tipo de movimiento
        </label>

        <select
  value={movementFilters.type}
  onChange={(e) =>
    setMovementFilters({
      ...movementFilters,
      type: e.target.value as any,
    })
  }
  className="
            mt-1
            w-full
            rounded-lg
            border
            border-white/10
            bg-[#111119]
            px-3
            py-2
            text-white
          "
        >
          <option>
            Todos
          </option>

          <option value="entry">
            Entrada
          </option>

          <option value="exit">
            Salida
          </option>

          <option value="assignment">
            Asignación
          </option>

          <option value="transfer">
            Transferencia
          </option>

          <option value="repair">
            Reparación
          </option>

          <option value="disposal">
            Baja
          </option>

        </select>
      </div>


      {/* Estado */}
      <div>
        <label className="text-sm text-slate-400">
          Estado
        </label>

        <select
        value={movementFilters.status}
        onChange={(e) =>
  setMovementFilters({
    ...movementFilters,
    status: e.target.value as any,
  })
}
          className="
            mt-1
            w-full
            rounded-lg
            border
            border-white/10
            bg-[#111119]
            px-3
            py-2
            text-white
          "
        >

          <option>
            Todos
          </option>

          <option value="completed">
            Completado
          </option>

          <option value="pending">
            Pendiente
          </option>

          <option value="cancelled">
            Cancelado
          </option>

        </select>
      </div>


      {/* Periodo */}
      <div>
        <label className="text-sm text-slate-400">
          Periodo
        </label>

        <select
  value={movementFilters.period}
  onChange={(e) =>
    setMovementFilters({
      ...movementFilters,
      period: e.target.value as any,
    })
  }
  className="
    mt-1
    w-full
    rounded-lg
    border
    border-white/10
    bg-[#111119]
    px-3
    py-2
    text-white
  "
>

  <option value="all">
    Todo el historial
  </option>

  <option value="today">
    Hoy
  </option>

  <option value="yesterday">
    Ayer
  </option>

  <option value="week">
    Últimos 7 días
  </option>

  <option value="month">
    Este mes
  </option>

  <option value="previous-month">
    Mes anterior
  </option>

  <option value="custom">
    Personalizado
  </option>

</select>

{movementFilters.period === 'custom' && (
  <div className="mt-3 grid grid-cols-2 gap-3">

    <div>
      <label className="text-sm text-slate-400">
        Desde
      </label>

      <input
  type="date"
  value={movementFilters.startDate}
  onChange={(e) => {
    const value = e.currentTarget.value

    console.log('DESDE VALUE:', value)

    setMovementFilters({
      ...movementFilters,
      startDate: value,
    })
  }}
  className="
    mt-1
    w-full
    rounded-lg
    border
    border-white/10
    bg-[#111119]
    px-3
    py-2
    text-white
  "
/>
    </div>


    <div>
      <label className="text-sm text-slate-400">
        Hasta
      </label>

      <input
  type="date"
  value={movementFilters.endDate}
  onChange={(e) => {
    const value = e.currentTarget.value

    console.log('HASTA VALUE:', value)

    setMovementFilters({
      ...movementFilters,
      endDate: value,
    })
  }}
  className="
    mt-1
    w-full
    rounded-lg
    border
    border-white/10
    bg-[#111119]
    px-3
    py-2
    text-white
  "
/>
    </div>

  </div>
)}
      </div>

    </div>
  )
}