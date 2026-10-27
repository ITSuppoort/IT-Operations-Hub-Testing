export const assetCategories = {
  principal: { label: 'Equipo principal', types: ['Desktop', 'Laptop', 'All in One', 'Monitor', 'Impresoras', 'Webcam'] },
  peripheral: { label: 'Periférico', types: ['Teclado', 'Mouse', 'Headset', 'Docking Station', 'UPS', 'Regleta'] },
  component: { label: 'Componente', types: ['Cable de red', 'Cables de video', 'Cables de poder', 'SSD', 'HDD', 'Memoria RAM', 'Otros componentes'] },
} as const
export type AssetCategory = keyof typeof assetCategories
export type AssetField = 'pcName' | 'serial' | 'brand' | 'model' | 'quantity' | 'capacity' | 'user'
export const requiredFields: Record<AssetCategory, AssetField[]> = {
  principal: ['serial', 'brand', 'model'],
  peripheral: ['brand', 'quantity'],
  component: ['brand', 'quantity'],
}
export const fieldLabels: Record<AssetField, string> = {
  pcName: 'PC Name',  serial: 'Número de serie', brand: 'Marca', model: 'Modelo', quantity: 'Cantidad', capacity: 'Capacidad o especificación', user: 'Usuario',
}
export const categoryFields: Record<AssetCategory, AssetField[]> = {
  principal: [
  'pcName',
  'serial',
  'brand',
  'model',
  'user',
],

peripheral: [
  'serial',
  'brand',
  'model',
  'quantity',
],

component: [
  'serial',
  'brand',
  'model',
  'capacity',
  'quantity',
],
}
export type AssetTrackingMode =
  | 'serialized'
  | 'quantity'

export const assetTrackingMode: Record<
  string,
  AssetTrackingMode
> = {
  // EQUIPOS PRINCIPALES
  Desktop: 'serialized',
  Laptop: 'serialized',
  'All in One': 'serialized',

  // PERIFÉRICOS
  Monitor: 'serialized',
  Teclado: 'quantity',
  Mouse: 'quantity',
  Headset: 'serialized',
  Webcam: 'serialized',
  'Docking Station': 'serialized',

  // COMPONENTES
  SSD: 'serialized',
  HDD: 'serialized',
  'Memoria RAM': 'serialized',
  'Fuente de alimentación': 'quantity',
  'Cable de red': 'quantity',
  'Cables de video': 'quantity',
  'Cables de poder': 'quantity',
  Regleta: 'quantity',
  'Otros componentes': 'quantity',
  UPS: 'serialized',
  'Adaptador Corriente': 'quantity',
  Impresoras: 'serialized',
  'Cargadores de laptops': 'quantity',
  'HDMI a HDMI': 'quantity',
  'HDMI a DisplayPort': 'quantity',
  'DisplayPort a DisplayPort': 'quantity',
  'USB-C a HDMI': 'quantity',
}

export function getAssetTrackingMode(
  type: string
): AssetTrackingMode {
  return assetTrackingMode[type] ?? 'quantity'
}

export function isSerializedAsset(
  type: string
): boolean {
  return getAssetTrackingMode(type) === 'serialized'
}