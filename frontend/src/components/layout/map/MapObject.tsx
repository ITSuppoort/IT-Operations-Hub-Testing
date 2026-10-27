import { Rnd } from 'react-rnd'
import type { LucideIcon } from 'lucide-react'

export interface MapItem {
  id: string
  name: string
  type: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

interface MapObjectProps {
  item: MapItem
  selected: boolean
  editMode: boolean
  icon?: LucideIcon
  onSelect: () => void
  onChange: (item: MapItem) => void
}

export default function MapObject({
  item,
  selected,
  editMode,
  icon: Icon,
  onSelect,
  onChange,
}: MapObjectProps) {
  return (
    <Rnd
      size={{
        width: item.width,
        height: item.height,
      }}
      position={{
        x: item.x,
        y: item.y,
      }}
      disableDragging={!editMode}
      enableResizing={editMode}
      bounds="parent"
      minWidth={100}
      minHeight={70}
      onDragStop={(_, data) => {
        onChange({
          ...item,
          x: data.x,
          y: data.y,
        })
      }}
      onResizeStop={(_, __, ref, ___, position) => {
        onChange({
          ...item,
          width: ref.offsetWidth,
          height: ref.offsetHeight,
          x: position.x,
          y: position.y,
        })
      }}
      onMouseDown={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      className="z-10"
    >
      <div
        className={`
          group relative h-full w-full overflow-hidden rounded-xl
          border backdrop-blur-sm
          transition-[border-color,box-shadow] duration-200
          ${
            selected
              ? 'border-violet-400 shadow-[0_0_25px_rgba(139,92,246,0.35)]'
              : 'border-white/10 hover:border-violet-400/50'
          }
        `}
        style={{
          background: `linear-gradient(
            145deg,
            ${item.color}28,
            rgba(15,23,42,0.94)
          )`,
        }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{
            backgroundColor: item.color,
          }}
        />

        <div className="flex h-full flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {item.name}
              </p>

              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {item.type}
              </p>
            </div>

            {Icon && (
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `${item.color}20`,
                  color: item.color,
                }}
              >
                <Icon size={16} />
              </div>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between">
            <span className="text-[10px] text-slate-600">
              {Math.round(item.width)} × {Math.round(item.height)}
            </span>

            {editMode && (
              <span className="rounded-md bg-violet-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-violet-300">
                Editable
              </span>
            )}
          </div>
        </div>

        {selected && editMode && (
          <>
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,1)]" />

            <div className="pointer-events-none absolute inset-0 border border-violet-400/20" />
          </>
        )}
      </div>
    </Rnd>
  )
}