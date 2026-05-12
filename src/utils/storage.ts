import Dexie, { type Table } from 'dexie'
import type { TextMaterial, PracticeRecord } from '../types'

class EnglishDB extends Dexie {
  materials!: Table<TextMaterial, string>
  records!: Table<PracticeRecord, string>

  constructor() {
    super('SpeakEasyDB')
    this.version(1).stores({
      materials: 'id, title, createdAt',
      records: 'id, materialId, mode, createdAt',
    })
  }
}

const db = new EnglishDB()

// --- Materials ---

export async function saveMaterial(material: TextMaterial): Promise<void> {
  await db.materials.put(material)
}

export async function getMaterial(id: string): Promise<TextMaterial | undefined> {
  return db.materials.get(id)
}

export async function getAllMaterials(): Promise<TextMaterial[]> {
  return db.materials.orderBy('createdAt').reverse().toArray()
}

export async function deleteMaterial(id: string): Promise<void> {
  await db.materials.delete(id)
  // Also delete related records
  await db.records.where('materialId').equals(id).delete()
}

// --- Records ---

export async function saveRecord(record: PracticeRecord): Promise<void> {
  await db.records.put(record)
}

export async function getRecord(id: string): Promise<PracticeRecord | undefined> {
  return db.records.get(id)
}

export async function getRecordsByMaterial(materialId: string): Promise<PracticeRecord[]> {
  return db.records.where('materialId').equals(materialId).toArray()
}
