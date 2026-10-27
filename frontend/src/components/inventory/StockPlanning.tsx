
'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  ShoppingCart,
} from 'lucide-react'

export default function StockPlanning() {
  const [production, setProduction] = useState(1000)
  const [percentage, setPercentage] = useState(10)
  const [available, setAvailable] = useState(65)
  const [incoming, setIncoming] = useState(0)

  const required = Math.ceil(
    (production * percentage) / 100
  )

  const physicalDeficit = Math.max(
    0,
    required - available
  )

  const purchaseDeficit = Math.max(
    0,
    required - available - incoming
  )

  const coverage =
    required > 0
      ? Math.min(
          100,
          Math.round((available / required) * 100)
        )
      : 100

  const inputClass =
    'mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#181822] px-4 text-white outline-none focus:border-violet-500'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          Planificación de Stock
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Calcula las reservas necesarias para mantener
          la continuidad operativa.
        </p>
      </div>

      <div className="grid gap-5 rounded-2xl border border-white/10 bg-[#181822] p-5 md:grid-cols-2">
        <div>
          <label className="text-sm text-slate-400">
            Computadoras en producción
          </label>

          <input
            type="number"
            min="0"
            value={production}
            onChange={(e) =>
              setProduction(
                Math.max(0, Number(e.target.value))
              )
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">
            Porcentaje de reserva (%)
          </label>

          <input
            type="number"
            min="0"
            max="100"
            value={percentage}
            onChange={(e) =>
              setPercentage(
                Math.min(
                  100,
                  Math.max(0, Number(e.target.value))
                )
              )
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">
            Equipos disponibles en almacén
          </label>

          <input
            type="number"
            min="0"
            value={available}
            onChange={(e) =>
              setAvailable(
                Math.max(0, Number(e.target.value))
              )
            }
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">
            Equipos pendientes de recibir
          </label>

          <input
            type="number"
            min="0"
            value={incoming}
            onChange={(e) =>
              setIncoming(
                Math.max(0, Number(e.target.value))
              )
            }
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Reserva requerida',
            value: required,
            icon: Package,
          },
          {
            label: 'Stock disponible',
            value: available,
            icon: CheckCircle2,
          },
          {
            label: 'Déficit físico',
            value: physicalDeficit,
            icon: AlertTriangle,
          },
          {
            label: 'Compra sugerida',
            value: purchaseDeficit,
            icon: ShoppingCart,
          },
        ].map((card) => {
          const Icon = card.icon

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-white/10 bg-[#181822] p-5"
            >
              <Icon
                size={22}
                className="mb-4 text-violet-400"
              />

              <p className="text-sm text-slate-400">
                {card.label}
              </p>

              <p className="mt-2 text-3xl font-bold">
                {card.value.toLocaleString()}
              </p>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#181822] p-5">
        <div className="mb-3 flex justify-between">
          <span className="text-sm text-slate-400">
            Cobertura de reserva física
          </span>

          <span className="font-semibold">
            {coverage}%
          </span>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full ${
              physicalDeficit > 0
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${coverage}%` }}
          />
        </div>
      </div>

      {physicalDeficit > 0 ? (
        <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <AlertTriangle
            className="shrink-0 text-amber-400"
          />

          <div>
            <h3 className="font-semibold text-amber-300">
              Stock por debajo del objetivo
            </h3>

            <p className="mt-2 text-sm text-slate-300">
              Faltan {physicalDeficit} equipos físicos
              para alcanzar la reserva configurada.
            </p>

            <p className="mt-2 text-sm text-slate-400">
              Considerando los pedidos pendientes,
              necesitarías solicitar {purchaseDeficit}
              equipos adicionales.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
          <CheckCircle2 className="text-emerald-400" />

          <p className="text-sm text-emerald-300">
            El stock físico cumple el objetivo
            de reserva configurado.
          </p>
        </div>
      )}
    </div>
  )
}