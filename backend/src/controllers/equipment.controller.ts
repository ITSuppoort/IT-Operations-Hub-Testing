import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { createEquipment, getEquipments, getEquipmentById, updateEquipment, deleteEquipment } from "../services/equipment.service";

// Solo aceptar atributos administrables desde el formulario. Nunca aceptar
// id, createdAt, updatedAt, relaciones anidadas ni movimientos directamente.
const textFields = [
  "category", "brand", "type", "model", "serial", "assetTag", "pcName",
  "condition", "status", "location", "assignedUser",
] as const;
const numericFields = ["quantity", "ramGB", "storageGB"] as const;
const relationIdFields = [
  "assignedUserId", "inventoryPersonId", "departmentId", "mapLocationId", "positionId"
] as const;
const allowedFields = new Set<string>([...textFields, ...numericFields, ...relationIdFields]);

type ParseResult = { ok: true; data: Record<string, string | number | null> } |
                   { ok: false; message: string };

function parseEquipmentBody(body: unknown, creating: boolean): ParseResult {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, message: "El cuerpo debe ser un objeto JSON." };
  }
  const input = body as Record<string, unknown>;
  const unexpected = Object.keys(input).filter(key => !allowedFields.has(key));
  if (unexpected.length) {
    return { ok: false, message: `Campos no permitidos: ${unexpected.join(", ")}` };
  }
  const data: Record<string, string | number | null> = {};
  for (const field of [...textFields, ...relationIdFields]) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) continue;
    const value = input[field];
    if (value === null) {
      if (field === "category" || field === "brand") return { ok: false, message: `${field} no puede ser nulo.` };
      data[field] = null;
    } else if (typeof value !== "string") {
      return { ok: false, message: `${field} debe ser texto.` };
    } else {
      const cleaned = value.trim();
      if (cleaned.length > 250) return { ok: false, message: `${field} excede 250 caracteres.` };
      data[field] = cleaned || (field === "category" || field === "brand" ? "" : null);
    }
  }
  for (const field of numericFields) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) continue;
    const value = input[field];
    if (value === null && field !== "quantity") { data[field] = null; continue; }
    const numberValue = typeof value === "number" ? value :
      typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
    if (!Number.isSafeInteger(numberValue) || numberValue < (field === "quantity" ? 1 : 0)) {
      return { ok: false, message: `${field} debe ser un numero entero valido.` };
    }
    data[field] = numberValue;
  }
  if (creating && (!data.category || !data.brand)) {
    return { ok: false, message: "category y brand son obligatorios." };
  }
  if (!creating && Object.keys(data).length === 0) {
    return { ok: false, message: "Indica al menos un campo para actualizar." };
  }
  return { ok: true, data };
}

function respondError(res: Response, error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return res.status(409).json({ message: "Ya existe un equipo con ese serial o codigo de activo." });
    if (error.code === "P2025") return res.status(404).json({ message: "Equipo o referencia relacionada no encontrada." });
    if (error.code === "P2003") return res.status(400).json({ message: "La referencia indicada no existe o el equipo tiene registros relacionados." });
  }
  console.error(fallback, error);
  return res.status(500).json({ message: fallback });
}

export async function create(req: Request, res: Response) {
  const parsed = parseEquipmentBody(req.body, true);
  if (!parsed.ok) return res.status(400).json({ message: parsed.message });
  try {
    const equipment = await createEquipment(parsed.data);
    return res.status(201).json(equipment);
  } catch (error) { return respondError(res, error, "Error al registrar el equipo."); }
}

export async function list(_req: Request, res: Response) {
  try { return res.status(200).json(await getEquipments()); }
  catch (error) { return respondError(res, error, "Error al consultar equipos."); }
}

export async function getOne(req: Request, res: Response) {
  try {
    const equipment = await getEquipmentById(String(req.params.id));
    return equipment ? res.status(200).json(equipment) : res.status(404).json({ message: "Equipo no encontrado." });
  } catch (error) { return respondError(res, error, "Error al consultar el equipo."); }
}

export async function update(req: Request, res: Response) {
  const parsed = parseEquipmentBody(req.body, false);
  if (!parsed.ok) return res.status(400).json({ message: parsed.message });
  try { return res.status(200).json(await updateEquipment(String(req.params.id), parsed.data)); }
  catch (error) { return respondError(res, error, "Error al actualizar el equipo."); }
}

// FASE5D2-PROTECTED-DELETE: solo ADMIN + confirmacion explicita + sin movimientos/danos.
// Para equipos desechados usar PUT status=RETIRED, que conserva su historia.
export async function remove(req: Request, res: Response) {
  const requester = req as Request & { user?: { role?: string } };
  if (String(requester.user?.role ?? "").toUpperCase() !== "ADMIN") {
    return res.status(403).json({ message: "Solo ADMIN puede eliminar registros." });
  }
  const id = String(req.params.id);
  if (req.header("x-confirm-delete-asset-id") !== id) {
    return res.status(400).json({ message: "Confirmacion de eliminacion ausente o incorrecta." });
  }
  try {
    const result = await deleteEquipment(id);
    if (result === null) return res.status(404).json({ message: "Equipo no encontrado." });
    if (result === "HAS_HISTORY") return res.status(409).json({ message: "El equipo tiene historial. Utiliza Retirar / Dar de baja." });
    return res.status(200).json({ message: "Registro eliminado por ADMIN." });
  } catch (error) { return respondError(res, error, "No se pudo eliminar el equipo."); }
}