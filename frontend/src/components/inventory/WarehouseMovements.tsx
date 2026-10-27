'use client'

import { useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import {
  useInventory,
  type EquipmentItem,
  type EquipmentCondition,
} from '@/context/InventoryContext'
import {
  assetCategories,
  isSerializedAsset,
  type AssetCategory,
} from '@/components/equipment/equipmentConfig'

type Operation = 'entry' | 'exit'
type Destination = 'employee' | 'station'
type EntryMode =
  | 'individual'
  | 'batch-scan'
  | 'return'
type ExitLookupMode = 'scan' | 'quantity'
type ExitType =
  | 'assignment'
  | 'repair'
  | 'replacement'
  | 'disposal'
  | 'vendor-return'
type WarehouseRecord = {
  id: string
  operation: Operation
  asset: string
  brand: string
  serial: string
  quantity: number
  destination?: Destination
  exitType?: ExitType
  employee?: string
  technician?: string
  floor?: string
  side?: string
  station?: string
  vendor?: string
  purpose?: string
  createdAt: string
}
export default function WarehouseMovements() {
const {
  equipment,
  locations,
  addEquipment,
  addMovement,
  updateEquipment,
  findEquipmentByCode,
} = useInventory()
  const [operation, setOperation] = useState<Operation>('entry')
  const [entryMode, setEntryMode] =
  useState<EntryMode>('individual')
  const [returnReason, setReturnReason] = useState<
  'repair' | 'disposal' | 'replacement'
>('repair')
  const [replacementSerial, setReplacementSerial] = useState('')
  const [replacementMode, setReplacementMode] =
  useState<'existing' | 'new'>('existing')
  const [exitLookupMode, setExitLookupMode] =
  useState<ExitLookupMode>('scan')
  const [batchScannedCodes, setBatchScannedCodes] =
  useState<string[]>([])
  const [batchScanCode, setBatchScanCode] =
  useState('')

  const [batchError, setBatchError] = useState('')

  const [batchQuantityUnknown, setBatchQuantityUnknown] =
  useState(false)
  const [asset, setAsset] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [capacity, setCapacity] = useState('')
  const [ramGB, setRamGB] = useState('')
  const [storageGB, setStorageGB] = useState('')
  const [condition, setCondition] =
  useState<EquipmentCondition>('new')
  const [pcName, setPcName] = useState('')
  const [serial, setSerial] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [quantityError, setQuantityError] = useState('')
  const [destination, setDestination] = useState<Destination>('employee')
  const [destinationLocationId, setDestinationLocationId] = useState<number | null>(null)
  const [exitType, setExitType] = useState<ExitType>('assignment')
  const [employee, setEmployee] = useState('')
  const [technician, setTechnician] = useState('')
  const [floor, setFloor] = useState('')
  const [side, setSide] = useState('')
  const [station, setStation] = useState('')
  const [purpose, setPurpose] = useState('')
  const [vendor, setVendor] = useState('')
  const [message, setMessage] = useState('')
  const [records, setRecords] = useState<WarehouseRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<WarehouseRecord | null>(null)
  const [scanCode, setScanCode] = useState('')
  const [scannedEquipment, setScannedEquipment] = useState<EquipmentItem | null>(null)
  const [scanError, setScanError] = useState('')
  const [quantityEquipment, setQuantityEquipment] = useState<EquipmentItem | null>(null)
  const inputClass =
    'mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#181822] px-4 text-sm text-white outline-none focus:border-violet-500'
    const selectedAssetIsSerialized =
  asset !== '' && isSerializedAsset(asset)
  const selectedAssetIsComputer = [
  'Desktop',
  'Laptop',
  'All in One',
].includes(asset)
const quantityStockItems = equipment.filter(
  (item) =>
    !isSerializedAsset(item.type) &&
    item.quantity > 0 &&
    item.status === 'available' &&
    (item.locationId ?? 1) === 1
)
const expectedBatchQuantity =
  batchQuantityUnknown
    ? null
    : Number(quantity) > 0
      ? Number(quantity)
      : 0

const scannedBatchQuantity =
  batchScannedCodes.length

const remainingBatchQuantity =
  batchQuantityUnknown
    ? null
    : Math.max(
        (expectedBatchQuantity ?? 0) -
          scannedBatchQuantity,
        0
      )
const handleBatchScan = () => {
  const code = batchScanCode.trim()

  setBatchError('')

  if (!code) {
    return
  }

  if (!batchQuantityUnknown) {
    if (
      expectedBatchQuantity === null ||
      expectedBatchQuantity < 2
    ) {
      setBatchError(
        'La recepción por lote requiere mínimo 2 unidades.'
      )

      setQuantityError(
        'La recepción por lote requiere mínimo 2 unidades.'
      )

      setBatchScanCode('')
      return
    }

    if (
      scannedBatchQuantity >=
      expectedBatchQuantity
    ) {
      setBatchError(
        'El lote ya alcanzó la cantidad esperada.'
      )

      setBatchScanCode('')
      return
    }
  }

  if (!brand.trim()) {
    setBatchError(
      'Primero indica la marca del producto.'
    )

    setBatchScanCode('')
    return
  }

  const normalizedCode =
    code.toLowerCase()

  const alreadyScanned =
    batchScannedCodes.some(
      (item) =>
        item.toLowerCase() ===
        normalizedCode
    )

  if (alreadyScanned) {
    setBatchError(
      `El código ${code} ya fue escaneado en este lote.`
    )

    setBatchScanCode('')
    return
  }

  const alreadyExists =
    findEquipmentByCode(code)

  if (alreadyExists) {
    setBatchError(
      `El código ${code} ya existe en el inventario.`
    )

    setBatchScanCode('')
    return
  }

  setBatchScannedCodes((previous) => [
    ...previous,
    code,
  ])

  setBatchScanCode('')
}
const handleBatchRegister = () => {
  setMessage('')
  setBatchError('')

  if (!asset) {
    setBatchError('Selecciona el tipo de activo.')
    return
  }

  if (!selectedAssetIsSerialized) {
    setBatchError(
      'La recepción por lote escaneado solo aplica a activos serializados.'
    )
    return
  }

  if (!brand.trim()) {
    setBatchError('Debes introducir la marca.')
    return
  }

  if (
  selectedAssetIsComputer &&
  !model.trim()
) {
  setBatchError(
    'Debes indicar el modelo del equipo.'
  )
  return
}

  if (
  selectedAssetIsComputer &&
  (!ramGB || Number(ramGB) <= 0 ||
   !storageGB || Number(storageGB) <= 0)
) {
  setBatchError(
    'Debes indicar la memoria RAM y el almacenamiento del equipo.'
  )
  return
}

  if (scannedBatchQuantity < 1) {
  setBatchError(
    'Debes escanear al menos un equipo.'
  )
  return
}

if (
  !batchQuantityUnknown &&
  expectedBatchQuantity !== null &&
  scannedBatchQuantity !== expectedBatchQuantity
) {
  setBatchError(
    `Debes escanear ${expectedBatchQuantity} unidades. Actualmente hay ${scannedBatchQuantity}.`
  )
  return
}

  const duplicatedSerial = batchScannedCodes.find(
    (code) => findEquipmentByCode(code)
  )

  if (duplicatedSerial) {
    setBatchError(
      `El número de serie ${duplicatedSerial} ya existe en el inventario.`
    )
    return
  }

  const now = Date.now()

  batchScannedCodes.forEach((code, index) => {
    const newEquipment: EquipmentItem = {
      id: now + index,
      category:
        assetCategories.principal.types.some(
          (type) => type === asset
        )
          ? 'principal'
          : assetCategories.peripheral.types.some(
                (type) => type === asset
              )
            ? 'peripheral'
            : 'component',

      type: asset,
      brand: brand.trim(),
      model: model.trim(),
      capacity: capacity.trim(),
      ramGB:
       selectedAssetIsComputer && ramGB
    ? Number(ramGB)
    : null,

      storageGB:
      selectedAssetIsComputer && storageGB
    ? Number(storageGB)
    : null,
      pcName: '',
      serial: code.trim(),
      quantity: 1,
      user: '',
      condition,
      status: 'available',
      entryDate: new Date().toISOString(),
      locationId: 1,
    }

    addEquipment(newEquipment)
  })

    // Registrar el movimiento general de la entrada por lote
  addMovement({
  id: Date.now(),
  date: new Date().toISOString(),
  type: 'entry',
  equipmentId: now,
  equipmentName: `${brand.trim()} ${model.trim()}`,

  // Guardar los seriales reales escaneados
  serial: batchScannedCodes.join(', '),

  quantity: scannedBatchQuantity,
  user: '',
  from: 'Proveedor',
  to: 'Almacén',
  location: 'Almacén',
  responsible: 'Sistema',
  status: 'completed',
  notes: 'Entrada de inventario por lote escaneado',
})

  const batchRecord: WarehouseRecord = {
  id: crypto.randomUUID(),
  operation: 'entry',
  asset,
  brand: brand.trim(),

  // Guardar los seriales reales del lote
  serial: batchScannedCodes.join(', '),

  quantity: scannedBatchQuantity,
  createdAt: new Date().toISOString(),
}

  setRecords((previous) => [
    batchRecord,
    ...previous,
  ])

  setMessage(
    `Recepción completada: ${scannedBatchQuantity} unidades registradas correctamente.`
  )

  setBatchScannedCodes([])
  setBatchScanCode('')
  setBatchError('')
  setBatchQuantityUnknown(false)

  setAsset('')
  setBrand('')
  setModel('')
  setCapacity('')
  setRamGB('')
  setStorageGB('')
  setPcName('')
  setSerial('')
  setQuantity('1')
}
  const resetMessage = () => setMessage('')

const handleEquipmentScan = () => {
  const code = scanCode.trim()

  setScanError('')
  setScannedEquipment(null)

  if (!code) {
    setScanError(
      'Escanea o introduce un Serial.'
    )
    return
  }

  const found = findEquipmentByCode(code)

  if (!found) {
    setScanError(
      'No se encontró ningún activo con ese Serial.'
    )
    return
  }

  setScannedEquipment(found)

  // Completar automáticamente los datos existentes
  setAsset(found.type)
  setBrand(found.brand)
  setModel(found.model)
  setCapacity(found.capacity)
  setPcName(found.pcName)
  setSerial(found.serial)
  setQuantity('1')
}  
  const validate = () => {
    if (
  !asset ||
  (
    operation === 'entry' &&
    selectedAssetIsSerialized &&
    entryMode === 'batch-scan' &&
    batchQuantityUnknown
      ? false
      : !Number.isInteger(Number(quantity)) ||
        Number(quantity) < 1
  )
) {
  setMessage(
    'Selecciona un activo e introduce una cantidad válida.'
  )
  return
}
    // La marca siempre es obligatoria
if (!brand.trim()) {
  setMessage('Debes introducir la marca.')
  return
}

// El número de serie solo es obligatorio
// para activos controlados individualmente
// Si un activo por cantidad tiene un identificador,
// representa una unidad individual
if (
  operation === 'entry' &&
  !selectedAssetIsSerialized &&
  serial.trim() &&
  Number(quantity) !== 1
) {
  setMessage(
    'Si introduces un número de serie, código de barras o QR, la cantidad debe ser 1.'
  )
  return
}
// Los activos serializados requieren un Serial, código de barras o QR
if (
  operation === 'entry' &&
  selectedAssetIsSerialized &&
  entryMode === 'individual' &&
  !serial.trim()
) {
  setMessage(
    'Debes introducir o escanear el número de serie, código de barras o QR del activo.'
  )
  return
}
// Los activos serializados se registran individualmente
if (
  operation === 'entry' &&
  selectedAssetIsSerialized &&
  entryMode === 'individual' &&
  Number(quantity) !== 1
) {
  setMessage(
    'Los activos con número de serie deben registrarse individualmente.'
  )
  return
}
// Los lotes serializados requieren mínimo 2 unidades
if (
  operation === 'entry' &&
  selectedAssetIsSerialized &&
  entryMode === 'batch-scan' &&
  !batchQuantityUnknown &&
  Number(quantity) < 2
) {
  setMessage(
    'La recepción por lote requiere un mínimo de 2 unidades.'
  )
  return
}

// Si la cantidad es conocida, debe coincidir
// con la cantidad de seriales escaneados.
if (
  operation === 'entry' &&
  selectedAssetIsSerialized &&
  entryMode === 'batch-scan' &&
  !batchQuantityUnknown &&
  batchScannedCodes.length !== Number(quantity)
) {
  setMessage(
    `Debes escanear ${Number(quantity)} unidades. Actualmente hay ${batchScannedCodes.length}.`
  )
  return
}

// Si la cantidad es desconocida,
// debe existir al menos un serial escaneado.
if (
  operation === 'entry' &&
  selectedAssetIsSerialized &&
  entryMode === 'batch-scan' &&
  batchQuantityUnknown &&
  batchScannedCodes.length < 1
) {
  setMessage(
    'Debes escanear al menos un equipo antes de registrar la recepción.'
  )
  return
}
    if (operation === 'exit') {
      if (exitLookupMode === 'quantity') {
  if (!quantityEquipment) {
    setMessage('Debes seleccionar un activo del inventario.')
    return
  }

  const requestedQuantity = Number(quantity)

  if (
    !Number.isInteger(requestedQuantity) ||
    requestedQuantity < 1
  ) {
    setQuantityError(
      'Introduce una cantidad válida mayor que 0.'
    )
    return
  }

  if (requestedQuantity > quantityEquipment.quantity) {
    setQuantityError(
      `No puedes retirar ${requestedQuantity} unidades. Solo hay ${quantityEquipment.quantity} disponibles.`
    )
    return
  }
}
      if (
  exitType === 'assignment' &&
  selectedAssetIsComputer &&
  !pcName.trim()
) {
  setMessage(
    'Debes introducir el PC Name antes de asignar este equipo.'
  )
  return
}

      if (exitLookupMode === 'scan') {
  const matchingAsset = equipment.find(
    (item) =>
      item.type === asset &&
      item.brand.trim().toLowerCase() ===
        brand.trim().toLowerCase() &&
      item.serial.trim().toLowerCase() ===
        serial.trim().toLowerCase()
  )

  if (!matchingAsset) {
    setMessage(
      'Este activo no está registrado en Equipos. Verifica el tipo, la marca y el número de serie.'
    )
    return
  }

  if (
  matchingAsset.status !== 'available' &&
  !(
    exitType === 'repair' ||
    exitType === 'disposal' ||
    exitType === 'vendor-return' ||
    exitType === 'replacement' 
  )
) {
  setMessage(
    'Este activo no está disponible para una nueva asignación.'
  )
  return
}

  if (
    exitType === 'assignment' &&
    matchingAsset.condition === 'damaged'
  ) {
    setMessage(
      'Un activo marcado como dañado no puede ser asignado. Selecciona reparación, baja u otro tipo de salida.'
    )
    return
  }

  if (matchingAsset.quantity !== 1) {
    setMessage(
      'Este registro contiene varias unidades. Utiliza Salida por cantidad.'
    )
    return
  }
}      

      if (
  exitType === 'vendor-return' &&
  !vendor.trim()
) {
  setMessage(
    'Debes indicar el proveedor al que se devolverá el activo.'
  )
  return
}
      if (
  exitType !== 'repair' &&
  !purpose.trim()
) {
  setMessage('Debes indicar el motivo de la salida.')
  return
}

      if (exitType === 'assignment') {
  if (destination === 'employee' && !employee.trim()) {
    setMessage('Debes indicar el nombre del empleado.')
    return
  }

  if (
    destination === 'station' &&
    (!technician.trim() ||
      !floor ||
      !side ||
      !station.trim())
  ) {
    setMessage(
      'Completa el técnico responsable, piso, lado y estación.'
    )
    return
  }

  if (!destinationLocationId) {
    setMessage(
      'Debes seleccionar el piso y lado donde se entregará el activo.'
    )
    return
  }
}
}
if (
  operation === 'entry' &&
  entryMode !== 'return' &&
  selectedAssetIsComputer &&
  !model.trim()
) {
  setMessage(
    'Debes indicar el modelo del equipo.'
  )
  return
}
if (
  operation === 'exit' &&
  !destinationLocationId
) {
  setMessage(
    'Debes seleccionar la ubicación destino del activo.'
  )
  return
}
  if (operation === 'entry') {
      // =====================================================
  // DEVOLUCIÓN DE EQUIPO EXISTENTE
  // =====================================================

  if (entryMode === 'return') {

    if (!serial.trim()) {
      setMessage(
        'Debes indicar el número de serie o código del equipo.'
      )
      return
    }

    const existingEquipment =
      findEquipmentByCode(serial)

    if (!existingEquipment) {
      setMessage(
        `No se encontró ningún equipo con el código ${serial.trim()}.`
      )
      return
    }

    // Determinar el nuevo estado del equipo
    const newStatus =
      returnReason === 'repair'
        ? 'repair'
        : returnReason === 'disposal'
          ? 'retired'
          : 'available'

   // =====================================================
// REEMPLAZO: EQUIPO EXISTENTE O EQUIPO NUEVO
// =====================================================

if (returnReason === 'replacement') {

  if (!replacementSerial.trim()) {
    setMessage(
      replacementMode === 'existing'
        ? 'Debes seleccionar el equipo disponible que será utilizado como reemplazo.'
        : 'Debes indicar el serial del nuevo equipo.'
    )
    return
  }

  // =====================================================
  // REEMPLAZO USANDO UN EQUIPO YA EXISTENTE
  // =====================================================

  if (replacementMode === 'existing') {

    const replacementEquipment =
      findEquipmentByCode(replacementSerial)

    if (!replacementEquipment) {
      setMessage(
        'El equipo seleccionado no existe en el inventario.'
      )
      return
    }

    if (replacementEquipment.id === existingEquipment.id) {
      setMessage(
        'No puedes utilizar el mismo equipo como reemplazo.'
      )
      return
    }

    if (replacementEquipment.status !== 'available') {
      setMessage(
        'El equipo seleccionado no está disponible para reemplazo.'
      )
      return
    }

    const previousUser = existingEquipment.user || ''

    // El equipo anterior deja de estar asignado
    updateEquipment(existingEquipment.id, {
      status: 'retired',
      user: '',
    })

    // El equipo existente pasa a estar asignado al empleado
    updateEquipment(replacementEquipment.id, {
      status: 'assigned',
      user: previousUser,
    })

    // Registrar el reemplazo del equipo anterior
    addMovement({
      id: Date.now(),
      date: new Date().toISOString(),
      type: 'replacement',
      equipmentId: existingEquipment.id,
      equipmentName:
        `${existingEquipment.brand} ${existingEquipment.model}`,
      serial: existingEquipment.serial,
      quantity: 1,
      user: previousUser,
      from: previousUser || 'Asignado',
      to: 'Reemplazado',
      location: 'Almacén',
      responsible: 'Sistema',
      status: 'completed',
      notes:
        `Equipo reemplazado por el equipo con serial ${replacementEquipment.serial}.`,
    })

    // Registrar la entrega del equipo existente
    addMovement({
      id: Date.now() + 1,
      date: new Date().toISOString(),
      type: 'assignment',
      equipmentId: replacementEquipment.id,
      equipmentName:
        `${replacementEquipment.brand} ${replacementEquipment.model}`,
      serial: replacementEquipment.serial,
      quantity: 1,
      user: previousUser,
      from: 'Almacén',
      to: previousUser || 'Asignado',
      location: 'Almacén',
      responsible: 'Sistema',
      status: 'completed',
      notes:
        `Equipo entregado como reemplazo del serial ${existingEquipment.serial}.`,
    })

    setMessage(
      `Reemplazo completado. El equipo ${replacementEquipment.serial} fue asignado a ${previousUser || 'el empleado'}.`
    )

    setReplacementSerial('')

    return
  }

  // =====================================================
  // REEMPLAZO REGISTRANDO UN EQUIPO NUEVO
  // =====================================================

  const replacementExists =
    findEquipmentByCode(replacementSerial)

  if (replacementExists) {
    setMessage(
      `El serial ${replacementSerial.trim()} ya existe en el inventario.`
    )
    return
  }

  if (!asset || !brand.trim()) {
    setMessage(
      'Debes indicar el tipo de equipo y la marca del nuevo equipo.'
    )
    return
  }

  const category: AssetCategory =
    assetCategories.principal.types.some(
      (type) => type === asset
    )
      ? 'principal'
      : assetCategories.peripheral.types.some(
          (type) => type === asset
        )
        ? 'peripheral'
        : 'component'

  const newEquipment: EquipmentItem = {
    id: Date.now(),
    category,
    type: asset,
    brand: brand.trim(),
    model: model.trim(),
    capacity: capacity.trim(),
    ramGB:
      selectedAssetIsComputer && ramGB
        ? Number(ramGB)
        : null,
    storageGB:
      selectedAssetIsComputer && storageGB
        ? Number(storageGB)
        : null,
    pcName: pcName.trim(),
    serial: replacementSerial.trim(),
    quantity: 1,
    user: existingEquipment.user || '',
    condition,
    status: 'assigned',
    entryDate: new Date().toISOString(),
  }

  // Crear el nuevo equipo
  addEquipment(newEquipment)

  // Retirar el equipo anterior
  updateEquipment(existingEquipment.id, {
    status: 'retired',
    user: '',
  })

  // Registrar el reemplazo
  addMovement({
    id: Date.now(),
    date: new Date().toISOString(),
    type: 'replacement',
    equipmentId: existingEquipment.id,
    equipmentName:
      `${existingEquipment.brand} ${existingEquipment.model}`,
    serial: existingEquipment.serial,
    quantity: 1,
    user: existingEquipment.user || '',
    from: existingEquipment.user || 'Asignado',
    to: 'Reemplazado',
    location: 'Almacén',
    responsible: 'Sistema',
    status: 'completed',
    notes:
      `Equipo reemplazado por el nuevo serial ${replacementSerial.trim()}.`,
  })

  // Registrar la entrega del nuevo equipo
  addMovement({
    id: Date.now() + 1,
    date: new Date().toISOString(),
    type: 'assignment',
    equipmentId: newEquipment.id,
    equipmentName:
      `${newEquipment.brand} ${newEquipment.model}`,
    serial: newEquipment.serial,
    quantity: 1,
    user: existingEquipment.user || '',
    from: 'Almacén',
    to: existingEquipment.user || 'Asignado',
    location: 'Almacén',
    responsible: 'Sistema',
    status: 'completed',
    notes:
      `Equipo entregado como reemplazo del serial ${existingEquipment.serial}.`,
  })

  setMessage(
    `Reemplazo completado. El equipo ${replacementSerial.trim()} fue asignado a ${existingEquipment.user || 'el empleado'}.`
  )

  setReplacementSerial('')

  return
}

// Para reparación o baja definitiva
updateEquipment(existingEquipment.id, {
  status: newStatus,
  user: '',
})

    // Registrar la devolución en el historial.
    addMovement({
      id: Date.now(),
      date: new Date().toISOString(),
      type:
        returnReason === 'repair'
          ? 'repair'
          : returnReason === 'disposal'
            ? 'disposal'
            : 'replacement',
      equipmentId: existingEquipment.id,
      equipmentName:
        `${existingEquipment.brand} ${existingEquipment.model}`,
      serial: existingEquipment.serial,
      quantity: 1,
      user: existingEquipment.user || '',
      from: existingEquipment.user || 'Asignado',
      to: 'Almacén',
      location: 'Almacén',
      responsible: 'Sistema',
      status: 'completed',
      notes:
        returnReason === 'repair'
          ? 'Equipo devuelto por daño para reparación'
          : returnReason === 'disposal'
            ? 'Equipo devuelto por daño para baja'
            : 'Equipo devuelto para reemplazo',
    })

    setMessage(
      returnReason === 'repair'
        ? `Equipo ${existingEquipment.serial} recibido correctamente y enviado a reparación.`
        : returnReason === 'disposal'
          ? `Equipo ${existingEquipment.serial} recibido correctamente y dado de baja.`
          : `Equipo ${existingEquipment.serial} recibido correctamente para reemplazo.`
    )

    // Limpiar formulario
    setAsset('')
    setBrand('')
    setModel('')
    setCapacity('')
    setSerial('')
    setQuantity('1')
    setCondition('new')
    setEntryMode('individual')
    setReturnReason('repair')

    return
  }
    if (
  selectedAssetIsComputer &&
  (!ramGB || Number(ramGB) <= 0 ||
   !storageGB || Number(storageGB) <= 0)
) {
  setMessage(
    'Debes indicar la memoria RAM y el almacenamiento del equipo.'
  )
  return
}
  // Si se proporcionó un Serial, código de barras o QR,
// debe ser único en todo el inventario
if (serial.trim()) {

  const existingEquipment =
    findEquipmentByCode(serial)

  // Una devolución utiliza un equipo que YA existe.
  // Por eso no debemos bloquear el serial cuando
  // estamos en modo devolución.
  if (existingEquipment) {
  setMessage(
    `El número de serie o código ${serial.trim()} ya existe en el inventario.`
  )

  return
}
}
const existingQuantityItem =
  !selectedAssetIsSerialized && !serial.trim()
    ? equipment.find(
        (item) =>
          !isSerializedAsset(item.type) &&
          !item.serial.trim() &&
          item.type.trim().toLowerCase() ===
            asset.trim().toLowerCase() &&
          item.brand.trim().toLowerCase() ===
            brand.trim().toLowerCase() &&
          item.model.trim().toLowerCase() ===
            model.trim().toLowerCase()
      )
    : undefined

  const category: AssetCategory =
    assetCategories.principal.types.some(
      (type) => type === asset
    )
      ? 'principal'
      : assetCategories.peripheral.types.some(
          (type) => type === asset
        )
        ? 'peripheral'
        : 'component'
if (!selectedAssetIsSerialized && existingQuantityItem) {
  updateEquipment(existingQuantityItem.id, {
    
    quantity:
      existingQuantityItem.quantity + Number(quantity),
  })

    addMovement({
    id: Date.now(),
    date: new Date().toISOString(),
    type: 'entry',
    equipmentId: existingQuantityItem.id,
    equipmentName: `${existingQuantityItem.brand} ${existingQuantityItem.model}`,
    serial: '',
    quantity: Number(quantity),
    user: '',
    from: 'Proveedor',
    to: 'Almacén',
    location: 'Almacén',
    responsible: 'Sistema',
    status: 'completed',
    notes: 'Entrada de inventario por cantidad',
  })

  const record: WarehouseRecord = {
    id: crypto.randomUUID(),
    operation: 'entry',
    asset,
    brand: brand.trim(),
    serial: '',
    quantity: Number(quantity),
    createdAt: new Date().toISOString(),
  }

  setRecords((previous) => [record, ...previous])

  setMessage(
    `Entrada registrada correctamente. Se agregaron ${quantity} unidades de ${asset} ${brand.trim()}. Stock actual: ${
      existingQuantityItem.quantity + Number(quantity)
    }.`
  )

  // Limpiar formulario
  setAsset('')
  setBrand('')
  setModel('')
  setCapacity('')
  setSerial('')
  setQuantity('1')
  setCondition('new')

  return
}
  const newEquipment: EquipmentItem = {
    id: Date.now(),
    category,
    type: asset,
    brand: brand.trim(),
    model: model.trim(),
    capacity: capacity.trim(),
    ramGB:
      selectedAssetIsComputer && ramGB
    ? Number(ramGB)
    : null,

    storageGB:
       selectedAssetIsComputer && storageGB
    ? Number(storageGB)
    : null,
    pcName: pcName.trim(),
    serial: serial.trim(),
    quantity: Number(quantity),
    user: '',
    condition,
    status: 'available',
    entryDate: new Date().toISOString(),
    locationId: 1,
  }

  addEquipment(newEquipment)

  addMovement({
  id: Date.now(),

  date: new Date().toISOString(),

  type: 'entry',

  equipmentId: newEquipment.id,

  equipmentName: `${newEquipment.brand} ${newEquipment.model}`,

  serial: newEquipment.serial,

  quantity: 1,

  user: '',

  from: 'Proveedor',

  to: 'Almacén',

  location: 'Almacén',

  responsible: 'Sistema',

  status: 'completed',

  notes: 'Entrada de inventario',
})
}
    const record: WarehouseRecord = {
  id: crypto.randomUUID(),
  operation,
  asset,
  brand: brand.trim(),
  serial: serial.trim(),
  quantity: Number(quantity),
  createdAt: new Date().toISOString(),

  ...(operation === 'exit'
  ? {
      exitType,
      purpose: purpose.trim(),

      ...(exitType === 'vendor-return'
  ? {
      vendor: vendor.trim(),
    }
  : {}),

      ...(exitType === 'assignment'
        ? {
            destination,
            employee:
              destination === 'employee'
                ? employee.trim()
                : undefined,
            technician:
              destination === 'station'
                ? technician.trim()
                : undefined,
            floor:
              destination === 'station'
                ? floor
                : undefined,
            side:
              destination === 'station'
                ? side
                : undefined,
            station:
              destination === 'station'
                ? station.trim()
                : undefined,
          }
        : {}),
    }
  : {}),
}

if (operation === 'exit') {
  if (exitLookupMode === 'quantity' && quantityEquipment) {
    const remainingQuantity =
      quantityEquipment.quantity - Number(quantity)

    updateEquipment(quantityEquipment.id, {
      quantity: remainingQuantity,
    })

    // Registrar el movimiento según el tipo de salida seleccionado
addMovement({
  id: Date.now(),
  date: new Date().toISOString(),

  type:
    exitType === 'assignment'
      ? 'assignment'
      : exitType === 'repair'
        ? 'repair'
        : exitType === 'disposal'
          ? 'disposal'
          : exitType === 'vendor-return'
            ? 'vendor-return'
            : 'exit',

  equipmentId: quantityEquipment.id,

  equipmentName:
    `${quantityEquipment.brand} ${quantityEquipment.model}`,

  serial: '',

  quantity: Number(quantity),

  user:
    exitType === 'assignment' &&
    destination === 'employee'
      ? employee.trim()
      : '',

  // =====================================================
  // TRAZABILIDAD
  // =====================================================

  from: 'Almacén',

  to:
    destinationLocationId
      ? locations.find(
          (location) =>
            location.id === destinationLocationId
        )?.name || 'Ubicación destino'
      : 'Ubicación destino',

  fromLocationId: 1,

  toLocationId:
    destinationLocationId ?? undefined,

  location:
    destinationLocationId
      ? locations.find(
          (location) =>
            location.id === destinationLocationId
        )?.name || 'Ubicación destino'
      : 'Ubicación destino',

  responsible: 'Sistema',

  status: 'completed',

  notes:
    exitType === 'repair'
      ? purpose.trim() || 'Reparación'
      : purpose.trim() ||
        `Salida de inventario: ${exitType}`,
})
  }

  if (exitLookupMode === 'scan') {
    const matchingAsset = equipment.find(
      (item) =>
        item.type === asset &&
        item.brand.trim().toLowerCase() ===
          brand.trim().toLowerCase() &&
        item.serial.trim().toLowerCase() ===
          serial.trim().toLowerCase()
    )

    if (matchingAsset) {
      const newStatus =
  exitType === 'assignment'
    ? 'assigned'
    : exitType === 'repair'
      ? 'repair'
      : exitType === 'disposal'
        ? 'retired'
        : exitType === 'vendor-return'
          ? 'returned'
          : matchingAsset.status

      updateEquipment(matchingAsset.id, {
        status: newStatus,

        ...(exitType === 'assignment'
          ? {
              pcName: pcName.trim(),
              user:
                destination === 'employee'
                  ? employee.trim()
                  : `Estación ${station.trim()} - Piso ${floor} ${side}`,
            }
          : {}),
      })

          // Registrar el movimiento de salida en el historial
    addMovement({
  id: Date.now(),
  date: new Date().toISOString(),

  type:
    exitType === 'assignment'
      ? 'assignment'
      : exitType === 'repair'
        ? 'repair'
        : exitType === 'disposal'
          ? 'disposal'
          : exitType === 'vendor-return'
            ? 'vendor-return'
            : exitType === 'replacement'
              ? 'replacement'
              : 'exit',

  equipmentId: matchingAsset.id,

  equipmentName:
    `${matchingAsset.brand} ${matchingAsset.model}`,

  serial: matchingAsset.serial,

  quantity: 1,

  user:
    destination === 'employee'
      ? employee.trim()
      : '',

  from: 'Almacén',

  to:
    destinationLocationId
      ? locations.find(
          (location) =>
            location.id === destinationLocationId
        )?.name || 'Ubicación destino'
      : destination === 'employee'
        ? employee.trim()
        : `Estación ${station.trim()} - Piso ${floor} ${side}`,

  fromLocationId: 1,

  toLocationId:
    destinationLocationId ?? undefined,

  location:
    destinationLocationId
      ? locations.find(
          (location) =>
            location.id === destinationLocationId
        )?.name || 'Ubicación destino'
      : 'Ubicación destino',

  responsible: 'Sistema',

  status: 'completed',

  notes:
    exitType === 'repair'
      ? purpose.trim() || 'Reparación'
      : purpose.trim() ||
        `Salida de inventario: ${exitType}`,
})

    }
  }
}

setRecords((previous) => [record, ...previous])

setMessage('Operación registrada en el historial temporal.')

setAsset('')
setBrand('')
setModel('')
setCapacity('')
setRamGB('')
setStorageGB('')
setPcName('')
setSerial('')
setQuantity('1')
setQuantityError('')
setCondition('new')
setEmployee('')
setTechnician('')
setFloor('')
setSide('')
setStation('')
setVendor('')
setPurpose('')
setExitType('assignment')
setDestination('employee')
setScanCode('')
setScannedEquipment(null)
setQuantityEquipment(null)
setScanError('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">
          Entradas y salidas
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Registra las operaciones del almacén.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => {
  setOperation('entry')

  setExitLookupMode('scan')
  setScanCode('')
  setScanError('')
  setScannedEquipment(null)
  setQuantityEquipment(null)

  setAsset('')
  setBrand('')
  setModel('')
  setCapacity('')
  setRamGB('')
  setStorageGB('')
  setPcName('')
  setSerial('')
  setQuantity('1')
  setQuantityError('')

  setEmployee('')
  setTechnician('')
  setFloor('')
  setSide('')
  setStation('')
  setVendor('')
  setPurpose('')

  resetMessage()
}}
          className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm ${
            operation === 'entry'
              ? 'bg-violet-600 text-white'
              : 'bg-[#181822] text-slate-400'
          }`}
        >
          <ArrowDownToLine size={18} />
          Entrada
        </button>

        <button
          onClick={() => {
  setOperation('exit')

  setEntryMode('individual')
  setBatchScannedCodes([])
  setBatchScanCode('')
  setBatchError('')

  setExitLookupMode('scan')
  setScanCode('')
  setScanError('')
  setScannedEquipment(null)
  setQuantityEquipment(null)

  setAsset('')
  setBrand('')
  setModel('')
  setCapacity('')
  setRamGB('')
  setStorageGB('')
  setPcName('')
  setSerial('')
  setQuantity('1')
  setQuantityError('')
  setCondition('new')

  setExitType('assignment')
  setDestination('employee')
  setEmployee('')
  setTechnician('')
  setFloor('')
  setSide('')
  setStation('')
  setVendor('')
  setPurpose('')

  resetMessage()
}}
          className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm ${
            operation === 'exit'
              ? 'bg-violet-600 text-white'
              : 'bg-[#181822] text-slate-400'
          }`}
        >
          <ArrowUpFromLine size={18} />
          Salida
        </button>
      </div>

      <div className="grid gap-5 rounded-2xl border border-white/10 bg-[#181822] p-5 md:grid-cols-2">
      
        {/* MÉTODO DE SALIDA */}
{operation === 'exit' && (
  <div className="md:col-span-2">
    <label className="text-sm text-slate-400">
      Método de salida
    </label>

    <div className="mt-2 grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => {
          setExitLookupMode('scan')
          setScanError('')
          setScannedEquipment(null)
          setQuantityEquipment(null)
          resetMessage()
        }}
        className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
          exitLookupMode === 'scan'
            ? 'border-violet-500 bg-violet-500/10 text-violet-300'
            : 'border-white/10 bg-[#111119] text-slate-400'
        }`}
      >
        Escanear código
      </button>

      <button
  type="button"
  onClick={() => {
    setExitLookupMode('quantity')
    setScanCode('')
    setScanError('')
    setScannedEquipment(null)
    setQuantityEquipment(null)
    setQuantity('1')
    setQuantityError('')
    resetMessage()
  }}
  className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
    exitLookupMode === 'quantity'
      ? 'border-violet-500 bg-violet-500/10 text-violet-300'
      : 'border-white/10 bg-[#111119] text-slate-400'
  }`}
>
  Salida por lote
</button>
    </div>

    <p className="mt-2 text-xs text-slate-500">
  Usa el escáner para activos serializados.
  Usa salida por lote para retirar varias unidades del stock agrupado.
</p>
  </div>
)}

{/* ESCÁNER DE SALIDA */}
{operation === 'exit' && exitLookupMode === 'scan' && (
  <div className="md:col-span-2">
    <label className="text-sm text-slate-400">
      Escanea o introduce el Serial, código de barras o QR
    </label>

    <div className="mt-2 flex gap-3">
      <input
        type="text"
        value={scanCode}
        onChange={(e) => {
          setScanCode(e.target.value)
          setScanError('')
          setScannedEquipment(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleEquipmentScan()
          }
        }}
        placeholder="Escanea el código o escríbelo manualmente"
        autoComplete="off"
        className="h-11 flex-1 rounded-xl border border-white/10 bg-[#111119] px-4 text-sm text-white outline-none focus:border-violet-500"
      />

      <button
        type="button"
        onClick={handleEquipmentScan}
        className="rounded-xl bg-violet-600 px-5 text-sm font-medium text-white hover:bg-violet-500"
      >
        Buscar
      </button>
    </div>

    <p className="mt-2 text-xs text-slate-500">
      Puedes utilizar un lector de código de barras o QR,
      o introducir el código manualmente.
    </p>
  </div>
)}

{/* SALIDA POR CANTIDAD */}
{operation === 'exit' && exitLookupMode === 'quantity' && (
  <div className="md:col-span-2">
    <label className="text-sm text-slate-400">
      Activo *
    </label>

    <select
      value={quantityEquipment?.id ?? ''}
      onChange={(e) => {
        const selectedId = Number(e.target.value)

        const found =
          quantityStockItems.find(
            (item) => item.id === selectedId
          ) ?? null

        setQuantityEquipment(found)

        if (found) {
          setAsset(found.type)
          setBrand(found.brand)
          setModel(found.model)
          setCapacity(found.capacity)
          setSerial('')
          setQuantity('1')
        } else {
          setAsset('')
          setBrand('')
          setModel('')
          setCapacity('')
          setSerial('')
          setQuantity('1')
        }

        resetMessage()
      }}
      className={inputClass}
    >
      <option value="">Seleccionar activo</option>

      {quantityStockItems.map((item) => (
        <option key={item.id} value={item.id}>
          {item.type} · {item.brand} · Stock: {item.quantity}
        </option>
      ))}
    </select>

    <p className="mt-2 text-xs text-slate-500">
      Solo aparecen artículos disponibles administrados por cantidad.
    </p>
    {quantityEquipment && (
  <div className="mt-5 grid gap-4 sm:grid-cols-2">
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-slate-400">
        Stock disponible
      </p>

      <p className="mt-1 text-2xl font-semibold text-emerald-400">
        {quantityEquipment.quantity}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {quantityEquipment.type} · {quantityEquipment.brand}
      </p>
    </div>

    <div>
      <label className="text-sm text-slate-400">
        Cantidad a retirar *
      </label>

      <input
        type="number"
        min="1"
        max={quantityEquipment.quantity}
        step="1"
        value={quantity}
        onChange={(e) => {
          setQuantity(e.target.value)
          setQuantityError('')
          resetMessage()
        }}
        className={`${inputClass} ${
          quantityError
            ? 'border-red-500 focus:border-red-500'
            : ''
        }`}
      />

      <p className="mt-2 text-xs text-slate-500">
        Máximo disponible: {quantityEquipment.quantity}
      </p>

      {quantityError && (
        <p className="mt-2 text-xs text-red-400">
          {quantityError}
        </p>
      )}
    </div>
  </div>
)}
  </div>
)} 
{scanError && (
  <div className="md:col-span-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
    {scanError}
  </div>
)}

{scannedEquipment && (
  <div className="md:col-span-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-emerald-400">
          ✓ Activo encontrado
        </p>

        <p className="mt-2 font-medium text-white">
          {scannedEquipment.type}
          {scannedEquipment.brand &&
            ` · ${scannedEquipment.brand}`}
          {scannedEquipment.model &&
            ` ${scannedEquipment.model}`}
        </p>

        <div className="mt-3 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">

  <p>
    Serial:{' '}
    <span className="text-white">
      {scannedEquipment.serial || 'No registrado'}
    </span>
  </p>
  
  <p>
  Condición:{' '}
  <span
    className={
      scannedEquipment.condition === 'damaged'
        ? 'font-medium text-red-400'
        : scannedEquipment.condition === 'used'
          ? 'font-medium text-amber-400'
          : 'font-medium text-emerald-400'
    }
  >
    {scannedEquipment.condition === 'new'
      ? 'Nuevo'
      : scannedEquipment.condition === 'used'
        ? 'Usado'
        : 'Dañado'}
  </span>
</p>

  {scannedEquipment.model && (
    <p>
      Modelo:{' '}
      <span className="text-white">
        {scannedEquipment.model}
      </span>
    </p>
  )}

  {scannedEquipment.ramGB !== null && (
  <p>
    RAM:{' '}
    <span className="text-white">
      {scannedEquipment.ramGB} GB
    </span>
  </p>
)}

{scannedEquipment.storageGB !== null && (
  <p>
    Almacenamiento:{' '}
    <span className="text-white">
      {scannedEquipment.storageGB} GB
    </span>
  </p>
)}

  {scannedEquipment.capacity && (
    <p>
      Capacidad / Especificación:{' '}
      <span className="text-white">
        {scannedEquipment.capacity}
      </span>
    </p>
  )}

  {scannedEquipment.pcName && (
    <p>
      PC Name:{' '}
      <span className="text-white">
        {scannedEquipment.pcName}
      </span>
    </p>
  )}

</div>

      <span
        className={`rounded-full px-3 py-1 text-xs font-medium ${
          scannedEquipment.status === 'available'
            ? 'bg-emerald-500/20 text-emerald-300'
            : 'bg-amber-500/20 text-amber-300'
        }`}
      >
        {scannedEquipment.status === 'available'
          ? 'Disponible'
          : scannedEquipment.status === 'assigned'
            ? 'Asignado'
            : scannedEquipment.status === 'repair'
              ? 'En reparación'
              : scannedEquipment.status === 'damaged'
                ? 'Dañado'
                : 'Retirado'}
            </span>
    </div>
  </div>
</div>
)}
{operation === 'entry' && (
  <>
  
        <div>
  <label className="text-sm text-slate-400">
    Activo *
  </label>

  <select
    value={asset}
    onChange={(e) => {
      setAsset(e.target.value)
      resetMessage()
    }}
    className={inputClass}
  >
    <option value="">Seleccionar activo</option>

    {(Object.keys(assetCategories) as AssetCategory[]).map(
      (category) => (
        <optgroup
          key={category}
          label={assetCategories[category].label}
        >
          {assetCategories[category].types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </optgroup>
      )
    )}
  </select>

  {asset && (
    <p
      className={`mt-2 text-xs ${
        selectedAssetIsSerialized
          ? 'text-cyan-400'
          : 'text-amber-400'
      }`}
    >
      {selectedAssetIsSerialized
        ? 'Control individual por número de serie'
        : 'Control de inventario por cantidad'}
    </p>
  )}
</div>
{operation === 'entry' && selectedAssetIsSerialized && (
  <div>
    <label className="text-sm text-slate-400">
      Método de recepción
    </label>

    <select
      value={entryMode}
      onChange={(e) => {
  const newMode = e.target.value as EntryMode

  setEntryMode(newMode)
  setQuantity(newMode === 'batch-scan' ? '2' : '1')
  resetMessage()
}}
      className={inputClass}
    >
      <option value="individual">
        Entrada individual
      </option>

      <option value="batch-scan">
        Lote por escaneo
      </option>

      <option value="return">
        Devolución de equipo existente
      </option>

    </select>

    <p className="mt-2 text-xs text-slate-500">
      {entryMode === 'individual'
        ? 'Registra una unidad individual.'
        : 'Escanea múltiples unidades de un mismo producto.'}
    </p>

    {entryMode === 'return' && (
  <div className="mt-4">
    <label className="text-sm text-slate-400">
      Motivo de devolución
    </label>

    <select
      value={returnReason}
      onChange={(e) =>
        setReturnReason(
          e.target.value as
            | 'repair'
            | 'disposal'
            | 'replacement'
        )
      }
      className={inputClass}
    >
      <option value="repair">
        Enviar a reparación
      </option>

      <option value="disposal">
        Baja / Destrucción
      </option>

      <option value="replacement">
        Reemplazo
      </option>
    </select>
    {entryMode === 'return' && returnReason === 'replacement' && (
  <div className="mt-4">
    <label className="text-sm text-slate-400">
      Serial del nuevo equipo *
    </label>

    <input
      value={replacementSerial}
      onChange={(e) => {
        setReplacementSerial(e.target.value)
        resetMessage()
      }}
      className={inputClass}
      placeholder="Ej. ABC123456"
    />

    <p className="mt-2 text-xs text-slate-500">
      Introduce el serial o código del equipo que se entregará como reemplazo.
    </p>
  </div>
)}
  </div>
)}

  </div>
)}
        {/* CANTIDAD */}
{(!selectedAssetIsSerialized || entryMode === 'batch-scan') && (
  <div>
    <label className="text-sm text-slate-400">
      Cantidad *
    </label>

    <input
  type="number"
  min={selectedAssetIsSerialized && entryMode === 'batch-scan' ? 2 : 1}
  step="1"
  value={quantity}
  onChange={(e) => {
    setQuantity(e.target.value)
    setQuantityError('')
    resetMessage()
  }}
  onBlur={() => {
    if (
      selectedAssetIsSerialized &&
      entryMode === 'batch-scan' &&
      Number(quantity) < 2
    ) {
      setQuantityError(
        'La recepción por lote requiere mínimo 2 unidades.'
      )
    } else {
      setQuantityError('')
    }
  }}
  className={`${inputClass} ${
    quantityError
      ? 'border-red-500 focus:border-red-500'
      : ''
  }`}
/>
{quantityError && (
  <p className="mt-2 text-xs text-red-400">
    {quantityError}
  </p>
)}
</div>
)}

{/* MARCA */}
<div>
  <label className="text-sm text-slate-400">
    Marca *
  </label>

  <input
    value={brand}
    onChange={(e) => {
      setBrand(e.target.value)
      resetMessage()
    }}
    className={inputClass}
    placeholder="Ej. Dell, Lenovo, HP"
  />
</div>

{/* CONDICIÓN */}
<div>
  <label className="text-sm text-slate-400">
    Condición *
  </label>

  <select
    value={condition}
    onChange={(e) => {
      setCondition(e.target.value as EquipmentCondition)
      resetMessage()
    }}
    className={inputClass}
  >
    <option value="new">Nuevo</option>
    <option value="used">Usado</option>
    <option value="damaged">Dañado</option>
  </select>

  <p className="mt-2 text-xs text-slate-500">
    Estado físico del activo al momento de ingresar al almacén.
  </p>
</div>

{/* MODELO */}
<div>
  <label className="text-sm text-slate-400">
  {selectedAssetIsComputer
    ? 'Modelo *'
    : 'Modelo (opcional)'}
  </label>

  <input
    value={model}
    onChange={(e) => {
      setModel(e.target.value)
      resetMessage()
    }}
    className={inputClass}
    placeholder="Ej. OptiPlex 7010, PM893"
  />
</div>

{selectedAssetIsComputer && (
  <>
    <div>
      <label className="text-sm text-slate-400">
        Memoria RAM (GB) *
      </label>
      <input
        type="number"
        min="1"
        value={ramGB}
        onChange={(e) => {
          setRamGB(e.target.value)
          resetMessage()
        }}
        placeholder="Ej. 16"
        className={inputClass}
      />
    </div>

    <div>
      <label className="text-sm text-slate-400">
        Almacenamiento (GB) *
      </label>
      <input
        type="number"
        min="1"
        value={storageGB}
        onChange={(e) => {
          setStorageGB(e.target.value)
          resetMessage()
        }}
        placeholder="Ej. 512"
        className={inputClass}
      />
    </div>
  </>
)}

{/* CAPACIDAD / ESPECIFICACIÓN */}
{['SSD', 'HDD', 'Memoria RAM'].includes(asset) && (
  <div>
    <label className="text-sm text-slate-400">
      Capacidad / Especificación
    </label>

    <input
      value={capacity}
      onChange={(e) => {
        setCapacity(e.target.value)
        resetMessage()
      }}
      className={inputClass}
      placeholder="Ej. 256 GB, 512 GB, 16 GB DDR5"
    />
  </div>
)}

  </>
)}

{/* PC NAME */}
{operation === 'entry' &&
  selectedAssetIsComputer &&
  entryMode !== 'batch-scan' && (
    <div>
      <label className="text-sm text-slate-400">
        PC Name (opcional)
      </label>

      <input
        value={pcName}
        onChange={(e) => {
          setPcName(e.target.value)
          resetMessage()
        }}
        className={inputClass}
        placeholder="Ej. TRUEWKS-H6CV513"
        autoComplete="off"
      />
    </div>
  )}

{/* NÚMERO DE SERIE - ENTRADA INDIVIDUAL / SALIDA */}
{operation === 'entry' &&
  !(
    selectedAssetIsSerialized &&
    entryMode === 'batch-scan'
  ) && (
  <div>
    <label className="text-sm text-slate-400">
  {selectedAssetIsSerialized
    ? 'Número de serie / Código *'
    : 'Número de serie / Código (opcional)'}
</label>

    <input
      value={serial}
      onChange={(e) => {
        setSerial(e.target.value)
        resetMessage()
      }}
      className={inputClass}
      placeholder="Escanea código de barras, QR o escríbelo manualmente"
    />
  </div>
)}
{/* RECEPCIÓN MASIVA POR ESCANEO */}
{operation === 'entry' &&
  selectedAssetIsSerialized &&
  entryMode === 'batch-scan' && (
    <div className="md:col-span-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-white">
            Recepción por escaneo
          </p>

          <p className="mt-1 text-sm text-slate-400">
            {asset}
            {brand.trim() && ` · ${brand.trim()}`}
          </p>
        </div>

        <div className="text-right">
          <p className="text-2xl font-semibold text-cyan-400">
            {scannedBatchQuantity} / {expectedBatchQuantity}
          </p>

          <p className="text-xs text-slate-400">
            unidades escaneadas
          </p>
        </div>
      </div>
<div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4">
  <label className="flex cursor-pointer items-center gap-3">
    <input
      type="checkbox"
      checked={batchQuantityUnknown}
      onChange={(e) => {
        setBatchQuantityUnknown(
          e.target.checked
        )

        setQuantityError('')
        setBatchError('')

        if (e.target.checked) {
          setQuantity('')
        } else {
          setQuantity('1')
        }
      }}
      className="h-4 w-4 rounded border-white/20 bg-[#181822] text-violet-600 focus:ring-violet-500"
    />

    <div>
      <p className="text-sm font-medium text-white">
        No sé cuántas unidades recibiré
      </p>

      <p className="mt-1 text-xs text-slate-400">
        Escanea todas las unidades y finaliza el lote manualmente.
      </p>
    </div>
  </label>
</div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
  <div className="rounded-xl bg-white/5 p-3">
    <p className="text-xs text-slate-400">
      Esperados
    </p>

    <p className="mt-1 text-lg font-semibold text-white">
      {batchQuantityUnknown
        ? 'Sin límite'
        : expectedBatchQuantity}
    </p>
  </div>

  <div className="rounded-xl bg-white/5 p-3">
    <p className="text-xs text-slate-400">
      Escaneados
    </p>

    <p className="mt-1 text-lg font-semibold text-emerald-400">
      {scannedBatchQuantity}
    </p>
  </div>

  <div className="rounded-xl bg-white/5 p-3">
    <p className="text-xs text-slate-400">
      Restantes
    </p>

    <p className="mt-1 text-lg font-semibold text-amber-400">
      {batchQuantityUnknown
        ? '—'
        : remainingBatchQuantity}
    </p>
  </div>
</div>

      <div className="mt-5">
        <label className="text-sm text-slate-400">
          Escanear siguiente número de serie
        </label>

        <input
          value={batchScanCode}
          onChange={(e) => {
            setBatchScanCode(e.target.value)
            setBatchError('')
          }}
          onKeyDown={(e) => {
             if (e.key === 'Enter') {
              e.preventDefault()
              handleBatchScan()
            }
        }}
          placeholder="Esperando lectura del scanner..."
          autoComplete="off"
          className="mt-2 h-12 w-full rounded-xl border border-cyan-500/30 bg-[#111119] px-4 text-sm text-white outline-none focus:border-cyan-400"
        />

        <p className="mt-2 text-xs text-slate-500">
          Mantén este campo seleccionado mientras escaneas las unidades.
        </p>
      </div>

      {batchError && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {batchError}
        </div>
      )}
      {batchScannedCodes.length > 0 && (
  <div className="mt-5">
    <div className="mb-3 flex items-center justify-between">
      <p className="text-sm font-medium text-white">
        Códigos escaneados
      </p>

      <p className="text-xs text-slate-400">
        {batchScannedCodes.length} unidades
      </p>
    </div>

    <div className="max-h-60 space-y-2 overflow-y-auto">
      {batchScannedCodes.map((code, index) => (
        <div
          key={code}
          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {index + 1}
            </span>

            <span className="font-mono text-sm text-white">
              {code}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setBatchScannedCodes((previous) =>
                previous.filter(
                  (item) => item !== code
                )
              )

              setBatchError('')
            }}
            className="rounded-lg px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
          >
            Eliminar
          </button>
        </div>
      ))}
    </div>
  </div>
)}
    </div>
  )}

        {operation === 'exit' &&
         (scannedEquipment || quantityEquipment) && (
  <>
  <div className="md:col-span-2">
  <label className="text-sm text-slate-400">
    Tipo de salida *
  </label>

  <select
    value={exitType}
    onChange={(e) => {
      setExitType(e.target.value as ExitType)
      resetMessage()
    }}
    className={inputClass}
  >
    <option value="assignment">
      Asignación / Entrega
    </option>

    <option value="repair">
      Envío a reparación
    </option>

    <option value="replacement">
      Reemplazo
    </option>

    <option value="disposal">
      Baja / Destrucción
    </option>

    <option value="vendor-return">
      Devolución a proveedor
    </option>

  </select>
</div>
          {exitType === 'assignment' &&
  selectedAssetIsComputer && (
    <div className="md:col-span-2">
    <label className="text-sm text-slate-400">
      PC Name *
    </label>

    <input
      value={pcName}
      onChange={(e) => {
        setPcName(e.target.value)
        resetMessage()
      }}
      className={inputClass}
      placeholder="Ej. TRUEWKS-H6CV513"
      autoComplete="off"
    />

    <p className="mt-2 text-xs text-slate-500">
      Obligatorio para entregar Desktop, Laptop o All in One.
    </p>
  </div>
)}
{exitType === 'assignment' && (
  <>
            <div className="md:col-span-2">
  <label className="text-sm text-slate-400">
    Destino de la entrega *
  </label>

  <select
    value={destination}
    onChange={(e) => {
      setDestination(e.target.value as Destination)
      resetMessage()
    }}
    className={inputClass}
  >
    <option value="employee">
      A un empleado
    </option>

    <option value="station">
      A una estación de trabajo
    </option>
  </select>
</div>

<div className="md:col-span-2">
  <label className="text-sm text-slate-400">
    Ubicación destino *
  </label>

  <select
    value={destinationLocationId ?? ''}
    onChange={(e) => {
      const value = e.target.value

      setDestinationLocationId(
        value ? Number(value) : null
      )

      resetMessage()
    }}
    className={inputClass}
  >
    <option value="">
      Seleccionar ubicación
    </option>

    {locations
      .filter((location) => location.type === 'floor')
      .map((location) => (
        <option
          key={location.id}
          value={location.id}
        >
          {location.name}
        </option>
      ))}
  </select>

  <p className="mt-2 text-xs text-slate-500">
    Indica el piso y lado donde terminará el activo.
  </p>
</div>

            {destination === 'employee' ? (
              <div className="md:col-span-2">
                <label className="text-sm text-slate-400">
                  Nombre del empleado *
                </label>
                <input
                  value={employee}
                  onChange={(e) => {
                    setEmployee(e.target.value)
                    resetMessage()
                  }}
                  className={inputClass}
                  placeholder="Nombre completo"
                />
              </div>
            ) : (
              <>
                <div className="md:col-span-2">
                  <label className="text-sm text-slate-400">
                    Técnico responsable *
                  </label>
                  <input
                    value={technician}
                    onChange={(e) => {
                      setTechnician(e.target.value)
                      resetMessage()
                    }}
                    className={inputClass}
                    placeholder="Nombre del técnico"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400">
                    Piso *
                  </label>
                  <input
                    value={floor}
                    onChange={(e) => {
                      setFloor(e.target.value)
                      resetMessage()
                    }}
                    className={inputClass}
                    placeholder="Ej. 2"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400">
                    Lado *
                  </label>
                  <select
                    value={side}
                    onChange={(e) => {
                      setSide(e.target.value)
                      resetMessage()
                    }}
                    className={inputClass}
                  >
                    <option value="">Seleccionar lado</option>
                    <option value="Este">Este</option>
                    <option value="Oeste">Oeste</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm text-slate-400">
                    Estación o posición *
                  </label>
                  <input
                    value={station}
                    onChange={(e) => {
                      setStation(e.target.value)
                      resetMessage()
                    }}
                    className={inputClass}
                    placeholder="Ej. WS-025"
                  />
                </div>
              </>
            )}
            </>
)}
{exitType === 'vendor-return' && (
  <div className="md:col-span-2">
    <label className="text-sm text-slate-400">
      Proveedor *
    </label>

    <input
      value={vendor}
      onChange={(e) => {
        setVendor(e.target.value)
        resetMessage()
      }}
      className={inputClass}
      placeholder="Ej. Dell, HP, Lenovo o nombre del proveedor"
      autoComplete="off"
    />
  </div>
)}
            
            <div className="md:col-span-2">
  <label className="text-sm text-slate-400">
  {exitType === 'repair'
    ? 'Comentario (opcional)'
    : exitType === 'vendor-return'
      ? 'Motivo de devolución *'
      : exitType === 'disposal'
        ? 'Motivo de baja / destrucción *'
          : 'Motivo / uso *'}
</label>

  <textarea
    value={purpose}
    onChange={(e) => {
      setPurpose(e.target.value)
      resetMessage()
    }}
    rows={3}
    className="mt-2 w-full rounded-xl border border-white/10 bg-[#181822] p-4 text-sm text-white outline-none focus:border-violet-500"
    placeholder={
  exitType === 'repair'
    ? 'Ej. No enciende, pendiente revisión, falla de disco...'
    : exitType === 'vendor-return'
      ? 'Ej. Equipo defectuoso, garantía, devolución de compra...'
      : exitType === 'disposal'
        ? 'Indica el motivo por el que se retira el activo'
        
          : 'Describe el motivo o uso del activo'
}
  />
</div>
{exitType === 'replacement' && (
  <div className="md:col-span-2 space-y-4">
    <div>
  <label className="text-sm text-slate-400">
    Tipo de reemplazo *
  </label>

  <select
    value={replacementMode}
    onChange={(e) => {
      setReplacementMode(
        e.target.value as 'existing' | 'new'
      )
      setReplacementSerial('')
      resetMessage()
    }}
    className={inputClass}
  >
    <option value="existing">
      Usar equipo existente
    </option>

    <option value="new">
      Registrar equipo nuevo
    </option>
  </select>
</div>

    <div>
      <label className="text-sm text-slate-400">
        Equipo de reemplazo
      </label>

      <p className="mt-1 text-xs text-slate-500">
        Selecciona un equipo que ya esté disponible o registra uno nuevo.
      </p>
    </div>

    {/* MODALIDAD DE REEMPLAZO */}
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

      <button
        type="button"
        onClick={() => {
          setReplacementMode('existing')
          resetMessage()
        }}
        className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
          replacementMode === 'existing'
            ? 'border-violet-500 bg-violet-500/10 text-white'
            : 'border-white/10 bg-[#181822] text-slate-400 hover:text-white'
        }`}
      >
        Usar equipo existente
      </button>

      <button
        type="button"
        onClick={() => {
          setReplacementMode('new')
          resetMessage()
        }}
        className={`rounded-lg border px-4 py-3 text-sm font-medium transition ${
          replacementMode === 'new'
            ? 'border-violet-500 bg-violet-500/10 text-white'
            : 'border-white/10 bg-[#181822] text-slate-400 hover:text-white'
        }`}
      >
        Registrar equipo nuevo
      </button>

    </div>

    {/* EQUIPO EXISTENTE */}
    {replacementMode === 'existing' && (
      <div>

        <label className="text-sm text-slate-400">
          Seleccionar equipo disponible *
        </label>

        <select
          value={replacementSerial}
          onChange={(e) => {
            setReplacementSerial(e.target.value)
            resetMessage()
          }}
          className={inputClass}
        >
          <option value="">
            Selecciona un equipo
          </option>

          {equipment
            .filter((item) => item.status === 'available')
            .map((item) => (
              <option
                key={item.id}
                value={item.serial}
              >
                {item.pcName || item.type} — {item.brand} {item.model} — Serial: {item.serial}
              </option>
            ))}
        </select>

        <p className="mt-1 text-xs text-slate-500">
          Solo aparecen equipos actualmente disponibles en el inventario.
        </p>

      </div>
    )}

    {/* EQUIPO NUEVO */}
    {replacementMode === 'new' && (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

        <div>
          <label className="text-sm text-slate-400">
            Serial del nuevo equipo *
          </label>

          <input
            type="text"
            value={replacementSerial}
            onChange={(e) => {
              setReplacementSerial(e.target.value)
              resetMessage()
            }}
            placeholder="Ej. ABC123456"
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">
            PC Name
          </label>

          <input
            type="text"
            value={pcName}
            onChange={(e) => {
              setPcName(e.target.value)
              resetMessage()
            }}
            placeholder="Ej. TRUEWKS-XXXX"
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">
            Tipo de equipo *
          </label>

          <input
            type="text"
            value={asset}
            onChange={(e) => {
              setAsset(e.target.value)
              resetMessage()
            }}
            placeholder="Ej. Laptop"
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">
            Marca *
          </label>

          <input
            type="text"
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value)
              resetMessage()
            }}
            placeholder="Ej. Dell"
            className={inputClass}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400">
            Modelo *
          </label>

          <input
            type="text"
            value={model}
            onChange={(e) => {
              setModel(e.target.value)
              resetMessage()
            }}
            placeholder="Ej. Latitude 5420"
            className={inputClass}
          />
        </div>

      </div>
    )}

  </div>
)}
          </>
        )}

        <div className="md:col-span-2 rounded-xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-sm text-slate-400">
            Fecha y hora
          </p>
          <p className="mt-1 text-sm text-emerald-400">
            Automática al registrar la operación
          </p>
        </div>
      </div>

      {message && (
        <div
          role="alert"
          className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-200"
        >
          {message}
        </div>
      )}

      <button
  onClick={
    operation === 'entry' &&
    selectedAssetIsSerialized &&
    entryMode === 'batch-scan'
      ? handleBatchRegister
      : validate
  }
  className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-sm font-medium text-white"
>
  {operation === 'entry' &&
  selectedAssetIsSerialized &&
  entryMode === 'batch-scan'
    ? `Confirmar recepción (${scannedBatchQuantity}/${expectedBatchQuantity})`
  : entryMode === 'return'
    ? returnReason === 'replacement'
      ? 'Registrar reemplazo y asignar equipo'
      : 'Registrar devolución'
    : 'Registrar operación'}
</button>

      <div className="space-y-4">
  <div>
    <h3 className="text-lg font-semibold text-white">
      Historial de operaciones
    </h3>

    <p className="mt-1 text-sm text-slate-400">
      Entradas y salidas registradas durante esta sesión.
    </p>
  </div>

  {records.length === 0 ? (
    <div className="rounded-2xl border border-white/10 bg-[#181822] p-8 text-center text-sm text-slate-400">
      Todavía no hay operaciones registradas.
    </div>
  ) : (
    <div className="overflow-x-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="bg-white/5 text-slate-400">
          <tr>
            <th className="p-4">Operación</th>
            <th className="p-4">Activo</th>
            <th className="p-4">Marca</th>
            <th className="p-4">Número de serie</th>
            <th className="p-4">Cantidad</th>
            <th className="p-4">Destino</th>
            <th className="p-4">Motivo</th>
            <th className="p-4">Fecha</th>
          </tr>
        </thead>

        <tbody>
          {records.map((record) => (
            <tr
              key={record.id}
              className="border-t border-white/10"
            >
              <td className="p-4">
                <span
                  className={
                    record.operation === 'entry'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }
                >
                  {record.operation === 'entry'
  ? 'Entrada'
  : record.exitType === 'assignment'
    ? 'Salida · Asignación'
    : record.exitType === 'repair'
      ? 'Salida · Reparación'
      : record.exitType === 'disposal'
        ? 'Salida · Baja / Destrucción'
        : record.exitType === 'vendor-return'
          ? 'Salida · Devolución'
            : 'Salida'}
                </span>
              </td>

              <td className="p-4">{record.asset}</td>

              <td className="p-4">{record.brand}</td>
              <td className="p-4">
  {record.serial ? (
    <button
      type="button"
      onClick={() => setSelectedRecord(record)}
      className="text-violet-400 hover:text-violet-300 hover:underline"
    >
      Ver más detalles
    </button>
  ) : (
    <span className="text-slate-500">
      Sin serial
    </span>
  )}
</td>

              <td className="p-4">{record.quantity}</td>

              <td className="p-4">
  {record.operation === 'entry'
    ? 'Almacén'
    : record.exitType === 'assignment'
      ? record.destination === 'employee'
        ? record.employee
        : `Estación ${record.station} - Piso ${record.floor} ${record.side} (Técnico: ${record.technician})`
      : record.exitType === 'repair'
        ? 'Reparación'
        : record.exitType === 'disposal'
          ? 'Baja / Destrucción'
          : record.exitType === 'vendor-return'
             ? `Proveedor: ${record.vendor || 'No especificado'}`
              : '—'}
</td>

              <td className="p-4">
                {record.purpose || 'Recepción de almacén'}
              </td>

              <td className="p-4 whitespace-nowrap">
                {new Date(record.createdAt).toLocaleString(
                  'es-DO'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}

  {selectedRecord && (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    onClick={() => setSelectedRecord(null)}
  >
    <div
      className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#181822] shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Detalles de la operación
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Números de serie registrados en esta operación
          </p>
        </div>

        <button
          type="button"
          onClick={() => setSelectedRecord(null)}
          className="rounded-lg px-3 py-2 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400">
              Activo
            </p>

            <p className="mt-1 text-sm font-medium text-white">
              {selectedRecord.asset}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">
              Marca
            </p>

            <p className="mt-1 text-sm font-medium text-white">
              {selectedRecord.brand}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-400">
              Cantidad
            </p>

            <p className="mt-1 text-sm font-medium text-white">
              {selectedRecord.quantity}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">
              Números de serie
            </h4>

            <span className="text-xs text-slate-400">
              {selectedRecord.serial
                .split(',')
                .filter((serial) => serial.trim()).length}{' '}
              registrados
            </span>
          </div>

          <div className="max-h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-black/10">
            <div className="divide-y divide-white/10">
              {selectedRecord.serial
                .split(',')
                .map((serialNumber, index) => {
                  const cleanSerial =
                    serialNumber.trim()

                  if (!cleanSerial) {
                    return null
                  }

                  return (
                    <div
                      key={`${cleanSerial}-${index}`}
                      className="flex items-center gap-4 px-4 py-3"
                    >
                      <span className="w-8 shrink-0 text-right text-xs text-slate-500">
                        {index + 1}.
                      </span>

                      <span className="font-mono text-sm text-white">
                        {cleanSerial}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSelectedRecord(null)}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-medium text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
)}
  <p className="text-xs text-slate-500">
    Historial temporal de demostración. Los registros se
    perderán al actualizar la página y todavía no modifican
    las existencias reales.
  </p>
  
</div>
    </div>
  )
}