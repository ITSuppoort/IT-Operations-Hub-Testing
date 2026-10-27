import {
  Building2,
  ChevronDown,
  Cpu,
  Layers3,
  MapPin,
  Monitor,
  Network,
  Plus,
  ScanLine,
  Search,
  Server,
  Wifi,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

import MapCanvas from '../components/layout/map/MapCanvas'

export default function Mapa() {
  return (
    <div className="min-h-full bg-[#070911] text-white">
      {/* FONDO FUTURISTA */}
      <div
        className="
          pointer-events-none fixed inset-0
          bg-[radial-gradient(circle_at_25%_15%,rgba(124,58,237,0.10),transparent_28%),radial-gradient(circle_at_80%_80%,rgba(249,115,22,0.07),transparent_28%)]
        "
      />

      <div className="relative mx-auto max-w-[1800px] p-6 lg:p-8">
        {/* HEADER */}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span
                className="
                  flex h-7 w-7 items-center justify-center
                  rounded-lg border border-violet-500/20
                  bg-violet-500/10 text-violet-400
                "
              >
                <ScanLine size={15} />
              </span>

              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
                Infrastructure Mapping
              </p>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Mapa / Posiciones
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Visualización interactiva de pisos, áreas, posiciones y
              equipos de IT.
            </p>
          </div>

          <button
            className="
              flex h-11 items-center gap-2 rounded-xl
              bg-gradient-to-r from-violet-600 to-violet-700
              px-5 text-sm font-semibold text-white
              shadow-lg shadow-violet-950/30
              transition hover:scale-[1.02] hover:from-violet-500
              hover:to-violet-600
            "
          >
            <Plus size={18} />
            Nueva posición
          </button>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<Building2 size={19} />}
            label="Pisos"
            value="1"
            detail="Infraestructura registrada"
            variant="purple"
          />

          <StatCard
            icon={<MapPin size={19} />}
            label="Posiciones"
            value="0"
            detail="Puestos registrados"
            variant="purple"
          />

          <StatCard
            icon={<Monitor size={19} />}
            label="Equipos"
            value="0"
            detail="Equipos ubicados"
            variant="orange"
          />

          <StatCard
            icon={<Wifi size={19} />}
            label="Disponibilidad"
            value="100%"
            detail="Mapa operativo"
            variant="orange"
          />
        </div>

        {/* TOOLBAR */}
        <div
          className="
            mb-4 flex flex-wrap items-center justify-between gap-4
            rounded-2xl border border-white/[0.07]
            bg-[#0d101b]/90 p-3
            shadow-xl shadow-black/10
          "
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* SELECTOR PISO */}
            <button
              className="
                flex h-10 min-w-[230px] items-center justify-between
                gap-4 rounded-xl border border-white/[0.08]
                bg-white/[0.035] px-4 text-sm text-slate-200
                transition hover:border-violet-500/40
                hover:bg-violet-500/[0.06]
              "
            >
              <div className="flex items-center gap-2">
                <Layers3 size={17} className="text-violet-400" />
                <span>Piso 1 — Administrativo</span>
              </div>

              <ChevronDown size={16} className="text-slate-500" />
            </button>

            {/* BUSCADOR */}
            <div
              className="
                flex h-10 w-[270px] items-center gap-2
                rounded-xl border border-white/[0.08]
                bg-white/[0.035] px-3
                focus-within:border-violet-500/40
              "
            >
              <Search size={16} className="text-slate-500" />

              <input
                type="text"
                placeholder="Buscar posición, equipo..."
                className="
                  w-full bg-transparent text-sm text-white
                  outline-none placeholder:text-slate-600
                "
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ToolbarButton icon={<ZoomOut size={17} />} />

            <div
              className="
                flex h-9 min-w-[65px] items-center justify-center
                rounded-lg border border-white/[0.07]
                bg-white/[0.03] px-3
                text-xs font-medium text-slate-400
              "
            >
              100%
            </div>

            <ToolbarButton icon={<ZoomIn size={17} />} />

            <div className="mx-1 h-6 w-px bg-white/[0.08]" />

            <button
              className="
                flex h-9 items-center gap-2 rounded-lg
                border border-orange-500/20
                bg-orange-500/[0.07] px-3
                text-xs font-medium text-orange-400
                transition hover:bg-orange-500/15
              "
            >
              <Network size={16} />
              Infraestructura
            </button>
          </div>
        </div>

        {/* ÁREA PRINCIPAL */}
        <div className="grid min-h-[610px] grid-cols-1 gap-4 xl:grid-cols-[1fr_310px]">
          {/* MAPA */}
          <section
            className="
              relative overflow-hidden rounded-2xl
              border border-white/[0.07]
              bg-[#090c15]
              shadow-2xl shadow-black/20
            "
          >
            {/* GRID DEL MAPA */}
            <div
              className="
                absolute inset-0 opacity-[0.13]
                [background-image:linear-gradient(rgba(139,92,246,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.25)_1px,transparent_1px)]
                [background-size:35px_35px]
              "
            />

            {/* GLOW */}
            <div
              className="
                pointer-events-none absolute left-1/2 top-1/2
                h-[500px] w-[700px] -translate-x-1/2
                -translate-y-1/2 rounded-full
                bg-violet-700/[0.035] blur-3xl
              "
            />

            {/* MAP HEADER */}
            <div
              className="
                relative z-10 flex items-center justify-between
                border-b border-white/[0.06] px-5 py-4
              "
            >
              <div>
                <div className="flex items-center gap-2">
                  <div
                    className="
                      h-2 w-2 rounded-full bg-emerald-400
                      shadow-[0_0_10px_rgba(52,211,153,0.8)]
                    "
                  />

                  <h2 className="text-sm font-semibold text-white">
                    Piso 1 — Administrativo / Training
                  </h2>
                </div>

                <p className="mt-1 pl-4 text-xs text-slate-500">
                  Vista general de infraestructura
                </p>
              </div>

              <span
                className="
                  rounded-lg border border-violet-500/20
                  bg-violet-500/[0.07]
                  px-3 py-1.5 text-[11px] font-medium
                  text-violet-300
                "
              >
                MODO 2D
              </span>
            </div>

            {/* CANVAS */}
            <div
              className="
                relative z-10 flex min-h-[535px]
                items-center justify-center p-8
              "
            >
              {/* MOTOR INTERACTIVO - se conserva todo el diseño anterior */}
              <div className="absolute inset-4 z-20 overflow-auto rounded-2xl">
                <MapCanvas />
              </div>

              <div className="text-center">
                <div
                  className="
                    relative mx-auto mb-6 flex h-24 w-24
                    items-center justify-center rounded-3xl
                    border border-violet-500/20
                    bg-violet-500/[0.06]
                  "
                >
                  <MapPin
                    size={38}
                    strokeWidth={1.5}
                    className="text-violet-400"
                  />

                  <div
                    className="
                      absolute inset-0 rounded-3xl
                      shadow-[0_0_50px_rgba(124,58,237,0.12)]
                    "
                  />
                </div>

                <h3 className="text-lg font-semibold text-white">
                  Área de mapa preparada
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Aquí construiremos el plano interactivo del piso con
                  escritorios, posiciones, computadoras, monitores,
                  impresoras y demás infraestructura.
                </p>

                <div className="mt-6 flex justify-center gap-2">
                  <span
                    className="
                      rounded-lg border border-violet-500/20
                      bg-violet-500/[0.06]
                      px-3 py-1.5 text-xs text-violet-300
                    "
                  >
                    GRID READY
                  </span>

                  <span
                    className="
                      rounded-lg border border-orange-500/20
                      bg-orange-500/[0.06]
                      px-3 py-1.5 text-xs text-orange-300
                    "
                  >
                    2D ENGINE
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* PANEL DERECHO */}
          <aside
            className="
              overflow-hidden rounded-2xl
              border border-white/[0.07]
              bg-[#0d101b]
            "
          >
            <div className="border-b border-white/[0.06] p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                Inspector
              </p>

              <h2 className="mt-1 text-base font-semibold text-white">
                Información del mapa
              </h2>
            </div>

            <div className="space-y-5 p-5">
              <InfoRow
                icon={<Building2 size={17} />}
                label="Edificio"
                value="Principal"
              />

              <InfoRow
                icon={<Layers3 size={17} />}
                label="Piso"
                value="Piso 1"
              />

              <InfoRow
                icon={<MapPin size={17} />}
                label="Área"
                value="Administrativo"
              />

              <div className="h-px bg-white/[0.06]" />

              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                  Leyenda
                </p>

                <LegendItem
                  icon={<Monitor size={15} />}
                  name="Workstation"
                  value="0"
                  type="purple"
                />

                <LegendItem
                  icon={<Server size={15} />}
                  name="Infraestructura"
                  value="0"
                  type="orange"
                />

                <LegendItem
                  icon={<Cpu size={15} />}
                  name="Dispositivos"
                  value="0"
                  type="purple"
                />
              </div>

              <div className="h-px bg-white/[0.06]" />

              <div
                className="
                  rounded-xl border border-orange-500/15
                  bg-orange-500/[0.04] p-4
                "
              >
                <div className="flex items-start gap-3">
                  <div
                    className="
                      mt-0.5 h-2 w-2 shrink-0 rounded-full
                      bg-orange-400
                      shadow-[0_0_8px_rgba(251,146,60,0.8)]
                    "
                  />

                  <div>
                    <p className="text-xs font-semibold text-orange-300">
                      Mapa en construcción
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      El motor visual está listo para recibir el plano
                      real del edificio.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  detail,
  variant,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
  variant: 'purple' | 'orange'
}) {
  const purple = variant === 'purple'

  return (
    <div
      className="
        rounded-2xl border border-white/[0.07]
        bg-[#0d101b] p-5
        transition duration-200
        hover:-translate-y-0.5 hover:border-white/[0.12]
      "
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-500">{label}</p>

          <p className="mt-2 text-2xl font-bold text-white">
            {value}
          </p>
        </div>

        <div
          className={`
            flex h-10 w-10 items-center justify-center rounded-xl
            ${
              purple
                ? 'bg-violet-500/10 text-violet-400'
                : 'bg-orange-500/10 text-orange-400'
            }
          `}
        >
          {icon}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-600">
        {detail}
      </p>
    </div>
  )
}

function ToolbarButton({
  icon,
}: {
  icon: React.ReactNode
}) {
  return (
    <button
      className="
        flex h-9 w-9 items-center justify-center
        rounded-lg border border-white/[0.07]
        bg-white/[0.03] text-slate-400
        transition hover:border-violet-500/30
        hover:bg-violet-500/10 hover:text-violet-300
      "
    >
      {icon}
    </button>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3 text-slate-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>

      <span className="text-xs font-medium text-slate-200">
        {value}
      </span>
    </div>
  )
}

function LegendItem({
  icon,
  name,
  value,
  type,
}: {
  icon: React.ReactNode
  name: string
  value: string
  type: 'purple' | 'orange'
}) {
  return (
    <div
      className="
        mb-2 flex items-center justify-between
        rounded-xl border border-white/[0.05]
        bg-white/[0.025] p-3
      "
    >
      <div className="flex items-center gap-3">
        <div
          className={`
            flex h-8 w-8 items-center justify-center rounded-lg
            ${
              type === 'purple'
                ? 'bg-violet-500/10 text-violet-400'
                : 'bg-orange-500/10 text-orange-400'
            }
          `}
        >
          {icon}
        </div>

        <span className="text-xs text-slate-300">
          {name}
        </span>
      </div>

      <span className="text-xs font-semibold text-white">
        {value}
      </span>
    </div>
  )
}