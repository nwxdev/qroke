import type { Db } from 'mongodb'
import type { PartyRow } from './mongo-database'
export async function cleanupParties(db: Db, now = new Date(), batchSize = 25) {
  const rows = await db
    .collection<PartyRow>('parties')
    .find({
      pinHash: { $exists: true },
      purgeAt: { $lte: now },
      $or: [{ closedAt: { $exists: true } }, { expiresAt: { $lte: now } }],
    })
    .limit(batchSize)
    .toArray()
  for (const row of rows) {
    // Retain the party marker until all children are deleted; retries are idempotent.
    for (const collection of [
      'guests',
      'devices',
      'votes',
      'youtube_blocks',
      'oauth',
      'memberships',
    ])
      await db.collection(collection).deleteMany({ scope: row._id })
    await db.collection<PartyRow>('parties').deleteOne({ _id: row._id, purgeAt: { $lte: now } })
  }
  return rows.length
}
