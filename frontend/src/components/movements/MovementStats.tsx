'use client'

import { useInventory } from '@/context/InventoryContext'

export default function MovementStats() {

  const { getFilteredMovements } = useInventory()

  const movements = getFilteredMovements()


  const total = movements.length

  const entries = movements.filter(
    (movement) =>
      movement.type === 'entry'
  ).length


  const exits = movements.filter(
  (movement) =>
    movement.type === 'exit'
).length


  const assignments = movements.filter(
    (movement) =>
      movement.type === 'assignment'
  ).length


  const transfers = movements.filter(
    (movement) =>
      movement.type === 'transfer'
  ).length


  const replacements = movements.filter(
    (movement) =>
      movement.type === 'replacement'
  ).length


  const disposals = movements.filter(
    (movement) =>
      movement.type === 'disposal'
  ).length



  const cards = [
    {
      title: 'Total movimientos',
      value: total,
    },
    {
      title: 'Entradas',
      value: entries,
    },
    {
      title: 'Salidas',
      value: exits,
    },
    {
      title: 'Asignaciones',
      value: assignments,
    },
    {
      title: 'Transferencias',
      value: transfers,
    },
    {
      title: 'Reemplazos',
      value: replacements,
    },
    {
      title: 'Bajas',
      value: disposals,
    },
  ]


  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-4">

      {cards.map((card) => (

        <div
          key={card.title}
          className="
            rounded-xl
            border
            border-white/10
            bg-[#111119]
            p-5
          "
        >

          <p className="text-sm text-slate-400">
            {card.title}
          </p>

          <p className="mt-2 text-3xl font-bold text-white">
            {card.value}
          </p>

        </div>

      ))}

    </div>
  )
}