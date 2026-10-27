import prisma from '../config/prisma';

type Kind = 'RETURN' | 'DELIVER' | 'TRANSFER';
export class OperationProblem extends Error {
  constructor(public statusCode: number, message: string) { super(message); }
}

export async function applyEquipmentOperation(input: {
  equipmentId: string; kind: Kind; targetLocation: string; reason: string;
  expectedUpdatedAt: string; performedById: string; performedByEmail: string;
  recipient?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.equipment.findUnique({ where: { id: input.equipmentId } });
    if (!current) throw new OperationProblem(404, 'Equipo no encontrado.');
    if (current.quantity !== 1) throw new OperationProblem(409, 'Este flujo solo admite equipos individuales. Usa stock por cantidad para lotes.');
    if (['RETIRED', 'DISPOSED', 'DECOMMISSIONED'].includes(current.status.toUpperCase())) {
      throw new OperationProblem(409, 'Un equipo retirado no puede moverse.');
    }
    if (['DAMAGED', 'REPAIR', 'IN_REPAIR'].includes(current.status.toUpperCase()) && input.kind === 'DELIVER') {
      throw new OperationProblem(409, 'Equipo en daño o reparación: no se permite asignación.');
    }
    if (current.updatedAt.toISOString() !== input.expectedUpdatedAt) {
      throw new OperationProblem(409, 'Este equipo cambió. Actualiza la vista antes de registrar.');
    }
    const normalized = current.status.toUpperCase();
    if (input.kind === 'RETURN' && !['ASSIGNED', 'IN_USE', 'IN-USE', 'ACTIVE'].includes(normalized)) {
      throw new OperationProblem(409, 'Devolución requiere equipo en uso o asignado.');
    }
    if (input.kind === 'DELIVER' && !['AVAILABLE', 'RETURNED', 'IN_STOCK', 'STOCK'].includes(normalized)) {
      throw new OperationProblem(409, 'Entrega requiere un equipo disponible en almacén.');
    }
    if (input.kind === 'DELIVER' && !input.recipient) {
      throw new OperationProblem(400, 'Indica el usuario o responsable que recibirá el equipo.');
    }
    const status = input.kind === 'RETURN' ? 'AVAILABLE' : input.kind === 'DELIVER' ? 'ASSIGNED' : current.status;
    const assignmentChanges = input.kind === 'RETURN'
      ? { assignedUser: null, assignedUserId: null, inventoryPersonId: null, positionId: null, mapLocationId: null }
      : input.kind === 'DELIVER'
        ? { assignedUser: input.recipient!, assignedUserId: null, inventoryPersonId: null, positionId: null, mapLocationId: null }
        : {};
    const changed = await tx.equipment.updateMany({
      where: { id: current.id, updatedAt: current.updatedAt },
      data: { status, location: input.targetLocation, ...assignmentChanges }
    });
    if (changed.count !== 1) throw new OperationProblem(409, 'Actualización concurrente detectada. Intenta de nuevo.');
    const movement = await tx.movement.create({ data: {
      equipmentId: current.id, action: input.kind, fromLocation: current.location,
      toLocation: input.targetLocation, assignedUser: input.kind === 'DELIVER' ? input.recipient : null,
      createdBy: input.performedByEmail
    }});
    await tx.historyEntry.create({ data: {
      module: 'INVENTORY', entityType: 'Equipment', entityId: current.id,
      action: `EQUIPMENT_${input.kind}`,
      description: input.reason,
      oldData: { status: current.status, location: current.location, assignedUser: current.assignedUser },
      newData: { status, location: input.targetLocation, assignedUser: input.kind === 'DELIVER' ? input.recipient : null, movementId: movement.id },
      performedById: input.performedById
    }});
    const equipment = await tx.equipment.findUniqueOrThrow({ where: { id: current.id } });
    return { equipment, movement };
  });
}
