'use client'

import { useState } from 'react'
import { Movement } from '@/context/InventoryContext'
import { useInventory } from '@/context/InventoryContext'
import MovementStats from './MovementStats'
import MovementFilters from './MovementFilters'

export default function MovementHistory() {
  const [selectedMovement, setSelectedMovement] =
    useState<Movement | null>(null)

  const { getFilteredMovements } = useInventory()

  const filteredMovements = getFilteredMovements()

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      entry: 'Entrada',
      exit: 'Salida',
      assignment: 'Asignación',
      transfer: 'Transferencia',
      repair: 'Reparación',
      replacement: 'Reemplazo',
      disposal: 'Baja',
      'vendor-return': 'Devolución a proveedor',
    }

    return labels[type] ?? type
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: 'Completado',
      pending: 'Pendiente',
      cancelled: 'Cancelado',
    }

    return labels[status] ?? status
  }

  const formatDate = (date: string) => {
    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return '-'
    }

    return parsedDate.toLocaleDateString('es-DO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  /*
   * Los seriales de una entrada por lote se guardan separados
   * por coma. Esta función los convierte en una lista limpia.
   */
  const getSerials = (serial?: string) => {
    if (!serial?.trim()) {
      return []
    }

    return serial
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Movimientos
        </h1>

        <p className="text-sm text-slate-400">
          Historial de entradas, salidas, asignaciones,
          transferencias y cambios de estado
        </p>
      </div>

      {/* Estadísticas */}
      <MovementStats />

      {/* Filtros */}
      <MovementFilters />

      {/* Historial */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111119]">

        <div className="border-b border-white/10 px-6 py-4">

          <h2 className="font-semibold text-white">
            Movimientos registrados
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            {filteredMovements.length} movimiento
            {filteredMovements.length === 1 ? '' : 's'}
            encontrado
            {filteredMovements.length === 1 ? '' : 's'}
          </p>

        </div>

        {filteredMovements.length === 0 ? (

          <div className="px-6 py-10 text-center">

            <p className="text-slate-400">
              No hay movimientos que coincidan con los filtros.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1100px]">

              <thead>

                <tr className="border-b border-white/10">

                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Fecha
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Tipo
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Equipo
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Serial
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Usuario
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Desde
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Hasta
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Responsable
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">
                    Estado
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredMovements.map((movement) => {

                  const serials = getSerials(movement.serial)

                  return (
                    <tr
                      key={movement.id}
                      className="border-b border-white/10 last:border-b-0 hover:bg-white/[0.02]"
                    >

                      {/* Fecha */}
                      <td className="px-4 py-4 text-sm text-slate-300">
                        {formatDate(movement.date)}
                      </td>

                      {/* Tipo */}
                      <td className="px-4 py-4">

                        <span className="text-sm font-medium text-white">
                          {getMovementTypeLabel(movement.type)}
                        </span>

                      </td>

                      {/* Equipo */}
                      <td className="px-4 py-4">

                        <div className="text-sm font-medium text-white">
                          {movement.equipmentName}
                        </div>

                        {movement.quantity > 1 && (
                          <div className="mt-1 text-xs text-slate-500">
                            Cantidad: {movement.quantity}
                          </div>
                        )}

                      </td>

                      {/* Serial */}
                      <td className="px-4 py-4 text-sm">

                        {serials.length === 0 ? (

                          <span className="text-slate-500">
                            -
                          </span>

                        ) : serials.length === 1 ? (

                          <span className="font-mono text-slate-300">
                            {serials[0]}
                          </span>

                        ) : (

                          <button
                            type="button"
                            onClick={() => setSelectedMovement(movement)}
                            className="font-medium text-violet-400 transition hover:text-violet-300 hover:underline"
                          >
                            Ver más detalles
                          </button>

                        )}

                      </td>

                      {/* Usuario */}
                      <td className="px-4 py-4 text-sm text-slate-300">
                        {movement.user || '-'}
                      </td>

                      {/* Desde */}
                      <td className="px-4 py-4 text-sm text-slate-400">
                        {movement.from || '-'}
                      </td>

                      {/* Hasta */}
                      <td className="px-4 py-4 text-sm text-slate-400">
                        {movement.to || '-'}
                      </td>

                      {/* Responsable */}
                      <td className="px-4 py-4 text-sm text-slate-300">
                        {movement.responsible || '-'}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-4">

                        <span
                          className={`
                            inline-flex
                            rounded-full
                            px-2.5
                            py-1
                            text-xs
                            font-medium
                            ${
                              movement.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : movement.status === 'pending'
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : 'bg-red-500/10 text-red-400'
                            }
                          `}
                        >
                          {getStatusLabel(movement.status)}
                        </span>

                      </td>

                    </tr>
                  )
                })}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ========================================================= */}
      {/* MODAL - DETALLES DEL MOVIMIENTO                          */}
      {/* ========================================================= */}

      {selectedMovement && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedMovement(null)
            }
          }}
        >

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="movement-details-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#181822] shadow-2xl"
          >

            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">

              <div>

                <h2
                  id="movement-details-title"
                  className="text-lg font-semibold text-white"
                >
                  Detalles del movimiento
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Números de serie registrados en esta operación
                </p>

              </div>

              <button
                type="button"
                aria-label="Cerrar detalles"
                onClick={() => setSelectedMovement(null)}
                className="rounded-xl px-3 py-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>

            </div>

            {/* Información general */}
            <div className="grid grid-cols-1 gap-4 border-b border-white/10 p-6 sm:grid-cols-2">

              <div>
                <p className="text-xs text-slate-500">
                  Equipo
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  {selectedMovement.equipmentName}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Tipo
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  {getMovementTypeLabel(selectedMovement.type)}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Cantidad
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  {selectedMovement.quantity}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Fecha
                </p>

                <p className="mt-1 text-sm font-medium text-white">
                  {formatDate(selectedMovement.date)}
                </p>
              </div>

            </div>

            {/* Seriales */}
            <div className="p-6">

              <div className="mb-4 flex items-center justify-between">

                <h3 className="text-sm font-semibold text-white">
                  Números de serie
                </h3>

                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-400">
                  {getSerials(selectedMovement.serial).length} seriales
                </span>

              </div>

              <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">

                {getSerials(selectedMovement.serial).map(
                  (serial, index) => (

                    <div
                      key={`${serial}-${index}`}
                      className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >

                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-medium text-violet-400">
                        {index + 1}
                      </span>

                      <span className="font-mono text-sm text-slate-200">
                        {serial}
                      </span>

                    </div>

                  )
                )}

              </div>

            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-white/10 px-6 py-4">

              <button
                type="button"
                onClick={() => setSelectedMovement(null)}
                className="rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Cerrar
              </button>

            </div>

          </section>

        </div>

      )}

    </div>
  )
}