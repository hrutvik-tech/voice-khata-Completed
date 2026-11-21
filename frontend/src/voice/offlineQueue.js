import { get, set, del, keys, createStore } from 'idb-keyval'

const offlineStore = typeof indexedDB !== 'undefined'
  ? createStore('bk-offline-db', 'bk-offline')
  : null

const MAX_QUEUE_SIZE = 20

export async function enqueueOfflineTurn(audioBlob, recordedAt = new Date().toISOString(), textHint = '') {
  if (!offlineStore) return null

  try {
    const allKeys = await keys(offlineStore)
    if (allKeys.length >= MAX_QUEUE_SIZE) {
      console.warn('Offline queue is full (max 20 turns)')
      return null
    }

    const id = `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const idempotencyKey = `offline-${id}`

    const item = {
      id,
      idempotencyKey,
      recordedAt,
      textHint,
      audioBlob,
      timestamp: Date.now(),
    }

    await set(id, item, offlineStore)
    return item
  } catch (err) {
    console.error('Failed to enqueue offline turn:', err)
    return null
  }
}

export async function getOfflineQueue() {
  if (!offlineStore) return []
  try {
    const allKeys = await keys(offlineStore)
    const items = []
    for (const k of allKeys) {
      const item = await get(k, offlineStore)
      if (item) items.push(item)
    }
    return items.sort((a, b) => a.timestamp - b.timestamp)
  } catch (err) {
    console.error('Failed to get offline queue:', err)
    return []
  }
}

export async function removeOfflineTurn(id) {
  if (!offlineStore) return
  try {
    await del(id, offlineStore)
  } catch (err) {
    console.error('Failed to remove offline turn:', err)
  }
}

export async function syncOfflineQueue(apiClient, onSyncProgress) {
  if (!offlineStore) return []
  const queue = await getOfflineQueue()
  const results = []

  for (const item of queue) {
    try {
      const res = await apiClient.syncAudio(item.audioBlob, item.idempotencyKey, item.recordedAt)
      await removeOfflineTurn(item.id)
      results.push({ id: item.id, success: true, data: res })
      if (onSyncProgress) onSyncProgress(item.id, true)
    } catch (err) {
      console.error(`Failed to sync turn ${item.id}:`, err)
      results.push({ id: item.id, success: false, error: err })
      if (onSyncProgress) onSyncProgress(item.id, false, err)
    }
  }

  return results
}
