import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enqueueOfflineTurn, getOfflineQueue, removeOfflineTurn } from '../voice/offlineQueue'

describe('Offline Queue', () => {
  beforeEach(async () => {
    const queue = await getOfflineQueue()
    for (const item of queue) {
      await removeOfflineTurn(item.id)
    }
  })

  it('enqueues an offline audio turn and retrieves it', async () => {
    const mockBlob = new Blob(['mock audio pcm'], { type: 'audio/wav' })
    const item = await enqueueOfflineTurn(mockBlob, new Date().toISOString(), 'Test phrase')

    if (item) {
      expect(item.id).toBeDefined()
      expect(item.idempotencyKey).toContain('offline-')

      const queue = await getOfflineQueue()
      expect(queue.length).toBeGreaterThanOrEqual(1)
      expect(queue.some((q) => q.id === item.id)).toBe(true)

      await removeOfflineTurn(item.id)
      const afterQueue = await getOfflineQueue()
      expect(afterQueue.some((q) => q.id === item.id)).toBe(false)
    }
  })
})
