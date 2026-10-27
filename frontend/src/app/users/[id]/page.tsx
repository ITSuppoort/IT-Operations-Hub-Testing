"use client";

import { apiRequest } from "@/lib/api";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Laptop,
  MapPin,
  Monitor,
  Package,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type Equipment = {
  id: string;
  assetTag?: string | null;
  serial?: string | null;
  type?: string | null;
  brand?: string | null;
  model?: string | null;
  status?: string | null;
  condition?: string | null;
};

type InventoryPerson = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  status: string;
  department?: {
    id: string;
    name: string;
  } | null;
  position?: {
    id: string;
    code: string;
    name?: string | null;
    wing?: string | null;
    status?: string | null;
    location?: {
      id: string;
      name: string;
      floorNumber?: number | null;
      wing?: string | null;
    } | null;
    area?: {
      id: string;
      name: string;
    } | null;
  } | null;
  equipment?: Equipment[];
  createdAt: string;
  updatedAt: string;
};
function equipmentIcon(type?: string | null) {
  const value = (type ?? "").toLowerCase();

  if (value.includes("laptop") || value.includes("notebook")) {
    return <Laptop size={20} />;
  }

  if (
    value.includes("monitor") ||
    value.includes("desktop") ||
    value.includes("all in one")
  ) {
    return <Monitor size={20} />;
  }

  return <Package size={20} />;
}

function statusLabel(status?: string | null) {
  switch ((status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "Activo";
    case "INACTIVE":
      return "Inactivo";
    case "ASSIGNED":
      return "Asignado";
    case "AVAILABLE":
      return "Disponible";
    case "IN_REPAIR":
      return "En reparaciÃ³n";
    case "DAMAGED":
      return "DaÃ±ado";
    default:
      return status || "â€”";
  }
}

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id
    ? Array.isArray(params.id)
      ? params.id[0]
      : params.id
    : undefined;

  const [user, setUser] = useState<InventoryPerson | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const loadUser = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await apiRequest(
          `/inventory-people/${id}`
        );

        if (!response.ok) {
          throw new Error("No se pudo cargar la persona.");
        }

        const data = await response.json();
        setUser(data);
      } catch (err) {
        console.error(err);
        setError("No fue posible cargar la informaciÃ³n.");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-white/[0.06] bg-[#0b1424] px-8 py-6 text-sm text-slate-400">
          Cargando informaciÃ³n...
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => router.push("/users")}
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Volver a usuarios
        </button>

        <div className="rounded-2xl border border-red-400/10 bg-red-400/5 p-8 text-center text-red-300">
          {error || "Persona no encontrada."}
        </div>
      </div>
    );
  }

  const fullName = `${user.firstName} ${user.lastName}`;
  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">

          <button
            type="button"
            onClick={() => router.push("/users")}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-lg font-bold text-white shadow-lg shadow-violet-950/30">
            {initials}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">

              <h1 className="text-2xl font-bold tracking-tight text-white">
                {fullName}
              </h1>

              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  user.status === "ACTIVE"
                    ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                    : "border-slate-400/20 bg-slate-400/10 text-slate-300"
                }`}
              >
                {statusLabel(user.status)}
              </span>

            </div>

            <p className="mt-1 text-sm text-slate-400">
              Employee ID:{" "}
              <span className="font-medium text-slate-300">
                {user.employeeId}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        <div className="rounded-2xl border border-white/[0.06] bg-[#0b1424] p-5">
          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-violet-500/10 p-2.5 text-violet-300">
              <BriefcaseBusiness size={20} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Cargo
              </p>

              <p className="mt-1 font-semibold text-white">
                {user.jobTitle || "Sin cargo registrado"}
              </p>
            </div>

          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0b1424] p-5">
          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-300">
              <Building2 size={20} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Departamento
              </p>

              <p className="mt-1 font-semibold text-white">
                {user.department?.name || "Sin departamento"}
              </p>
            </div>

          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-[#0b1424] p-5">
          <div className="flex items-center gap-3">

            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300">
              <Package size={20} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Activos asignados
              </p>

              <p className="mt-1 font-semibold text-white">
                {user.equipment?.length ?? 0}
              </p>
            </div>

          </div>
        </div>

      </div>

      {/* MAIN */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">

        {/* EQUIPMENT */}
        <section className="rounded-2xl border border-white/[0.06] bg-[#0b1424]">

          <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">

            <div>
              <h2 className="font-semibold text-white">
                Activos asignados
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Equipos actualmente relacionados con esta persona
              </p>
            </div>

            <button
              type="button"
              className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500"
            >
              + Asignar equipo
            </button>

          </div>

          {user.equipment?.length ? (

            <div className="divide-y divide-white/[0.05]">

              {user.equipment.map((equipment) => (

                <div
                  key={equipment.id}
                  className="flex items-center justify-between gap-4 px-6 py-5 transition hover:bg-white/[0.02]"
                >

                  <div className="flex min-w-0 items-center gap-4">

                    <div className="rounded-xl bg-violet-500/10 p-3 text-violet-300">
                      {equipmentIcon(equipment.type)}
                    </div>

                    <div className="min-w-0">

                      <p className="font-medium text-white">
                        {equipment.type || "Equipo"}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {[equipment.brand, equipment.model]
                          .filter(Boolean)
                          .join(" ") || "Sin marca/modelo"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">

                        {equipment.assetTag && (
                          <span>
                            Asset: {equipment.assetTag}
                          </span>
                        )}

                        {equipment.serial && (
                          <span>
                            Serial: {equipment.serial}
                          </span>
                        )}

                      </div>

                    </div>

                  </div>

                  <div className="shrink-0 text-right">

                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                      {statusLabel(equipment.status)}
                    </span>

                  </div>

                </div>

              ))}

            </div>

          ) : (

            <div className="px-6 py-12 text-center">

              <Package
                size={32}
                className="mx-auto text-slate-600"
              />

              <p className="mt-3 font-medium text-slate-300">
                No hay activos asignados
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Esta persona actualmente no tiene equipos relacionados.
              </p>

            </div>

          )}

        </section>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">

          {/* LOCATION */}
          <section className="rounded-2xl border border-white/[0.06] bg-[#0b1424] p-6">

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-cyan-500/10 p-2.5 text-cyan-300">
                <MapPin size={20} />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  UbicaciÃ³n
                </h2>

                <p className="text-xs text-slate-500">
                  PosiciÃ³n dentro del inventario
                </p>
              </div>

            </div>

            {user.position ? (

              <div className="mt-5 space-y-4">

                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    PosiciÃ³n
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    {user.position.code}
                  </p>
                </div>

                {user.position.name && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Nombre
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {user.position.name}
                    </p>
                  </div>
                )}

                {user.position.area && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      Ãrea
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {user.position.area.name}
                    </p>
                  </div>
                )}

                {user.position.location && (
                  <div>
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      UbicaciÃ³n
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {user.position.location.name}
                    </p>

                    {user.position.location.floorNumber != null && (
                      <p className="mt-1 text-xs text-slate-500">
                        Piso {user.position.location.floorNumber}
                      </p>
                    )}
                  </div>
                )}

              </div>

            ) : (

              <div className="mt-5 rounded-xl border border-dashed border-white/[0.08] p-5 text-center">

                <MapPin
                  size={24}
                  className="mx-auto text-slate-600"
                />

                <p className="mt-2 text-sm text-slate-400">
                  Sin posiciÃ³n asignada
                </p>

              </div>

            )}

          </section>

          {/* CONTROL */}
          <section className="rounded-2xl border border-white/[0.06] bg-[#0b1424] p-6">

            <div className="flex items-center gap-3">

              <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300">
                <ShieldCheck size={20} />
              </div>

              <div>
                <h2 className="font-semibold text-white">
                  Control IT
                </h2>

                <p className="text-xs text-slate-500">
                  InformaciÃ³n mÃ­nima de inventario
                </p>
              </div>

            </div>

            <div className="mt-5 space-y-4">

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Estado
                </span>

                <span className="text-sm font-medium text-white">
                  {statusLabel(user.status)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Activos
                </span>

                <span className="text-sm font-medium text-white">
                  {user.equipment?.length ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  Departamento
                </span>

                <span className="max-w-[160px] truncate text-right text-sm font-medium text-white">
                  {user.department?.name || "Sin departamento"}
                </span>
              </div>

            </div>

          </section>

        </div>

      </div>

      {/* FUTURE */}
      <section className="rounded-2xl border border-dashed border-violet-400/15 bg-violet-500/[0.03] p-6">

        <div className="flex items-start gap-4">

          <div className="rounded-xl bg-violet-500/10 p-3 text-violet-300">
            <UserRound size={20} />
          </div>

          <div>

            <h2 className="font-semibold text-white">
              Control de asignaciones
            </h2>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              Este expediente serÃ¡ la base para asignaciones,
              constancias de recepciÃ³n, historial de activos,
              reglas por departamento y procesos de devoluciÃ³n.
              No almacenaremos informaciÃ³n sensible de Recursos Humanos.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">

              {[
                "Asignaciones",
                "Constancias",
                "Historial",
                "Devoluciones",
                "Offboarding",
              ].map((item) => (

                <span
                  key={item}
                  className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-slate-400"
                >
                  {item}
                </span>

              ))}

            </div>

          </div>

        </div>

      </section>

      <button
        type="button"
        onClick={() => router.push("/users")}
        className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-white"
      >
        Volver al listado
        <ChevronRight size={15} />
      </button>

    </div>
  );
}


