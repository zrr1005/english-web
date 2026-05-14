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

// --- Scores (aggregated from records) ---

export async function getDictationScore(materialId: string): Promise<number | null> {
  const records = await db.records
    .where('materialId').equals(materialId)
    .toArray()
  const writeActions = records.flatMap(r => r.actions).filter(a => a.actionType === 'write')
  if (writeActions.length === 0) return null
  return Math.round(writeActions.reduce((s, a) => s + a.accuracy, 0) / writeActions.length)
}

export async function getShadowScore(materialId: string): Promise<number | null> {
  const records = await db.records
    .where('materialId').equals(materialId)
    .toArray()
  // Shadow records: all actions are 'speak' type from shadow mode
  // We identify shadow records by having >50% speak actions (vs mixed practice)
  const shadowRecords = records.filter(r => {
    const speakCount = r.actions.filter(a => a.actionType === 'speak').length
    return speakCount > 0 && speakCount === r.actions.length
  })
  if (shadowRecords.length === 0) return null
  const bestShadow = shadowRecords.reduce((best, r) => r.overallScore > best.overallScore ? r : best, shadowRecords[0])
  return bestShadow.overallScore
}

// --- Translation ---

export async function saveTranslation(materialId: string, translation: string, source: 'bilibili' | 'llm' | 'manual'): Promise<void> {
  const material = await db.materials.get(materialId)
  if (material) {
    await db.materials.put({ ...material, translation, translationSource: source })
  }
}
