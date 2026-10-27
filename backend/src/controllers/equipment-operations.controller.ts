import { Request, Response } from 'express';
import { applyEquipmentOperation, OperationProblem } from '../services/equipment-operations.service';

type Input = Record<string, unknown>;
export async function executeEquipmentOperation(req: Request, res: Response) {
  const user = (req as Request & { user?: { id: string; email: string; role: string } }).user;
  if (!user || !['ADMIN'].includes(user.role.toUpperCase())) {
    return res.status(403).json({ message: 'Solo administradores pueden registrar movimientos de equipos.' });
  }
  const body: Input = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const keys = ['equipmentId', 'kind', 'targetLocation', 'reason', 'expectedUpdatedAt', 'recipient'];
  if (Object.keys(body).some(k => !keys.includes(k))) return res.status(400).json({ message: 'Campos desconocidos.' });
  const get = (key: string) => typeof body[key] === 'string' ? (body[key] as string).trim() : '';
  const kind = get('kind');
  const equipmentId = get('equipmentId');
  const reason = get('reason');
  const targetLocation = get('targetLocation');
  const expectedUpdatedAt = get('expectedUpdatedAt');
  const recipient = get('recipient');
  if (!['RETURN','DELIVER','TRANSFER'].includes(kind) || !equipmentId || !expectedUpdatedAt || reason.length < 5 || reason.length > 500 || targetLocation.length < 2 || targetLocation.length > 150 || recipient.length > 150) {
    return res.status(400).json({ message: 'Completa el activo, operación, motivo (5-500 caracteres), destino y versión del registro.' });
  }
  if (!Number.isFinite(Date.parse(expectedUpdatedAt))) return res.status(400).json({ message: 'Versión de equipo inválida.' });
  if (kind === 'DELIVER' && !recipient) return res.status(400).json({ message: 'La entrega requiere responsable.' });
  try {
    const result = await applyEquipmentOperation({
      equipmentId, kind: kind as 'RETURN'|'DELIVER'|'TRANSFER', targetLocation, reason,
      expectedUpdatedAt, recipient, performedById: user.id, performedByEmail: user.email
    });
    return res.status(201).json(result);
  } catch (e) {
    if (e instanceof OperationProblem) return res.status(e.statusCode).json({ message: e.message });
    console.error('Error en operación de equipo', e);
    return res.status(500).json({ message: 'No se pudo completar la operación.' });
  }
}
