import { MongoClient } from 'mongodb'
import { basename } from 'node:path'
export async function openFixtureDatabase(dir) {
  const name = 'qroke_test_' + basename(dir).replace(/[^a-zA-Z0-9]/g, '')
  const client = await new MongoClient(
    process.env.QROKE_MONGODB_URI ||
      'mongodb://127.0.0.1:37017/?replicaSet=rs0&directConnection=true',
  ).connect()
  const db = client.db(name),
    filter = { _id: 'nwx:principal' }
  return {
    db,
    readState: async () => (await db.collection('parties').findOne(filter)).state,
    writeState: async (state) =>
      db.collection('parties').updateOne(filter, {
        $set: { state: typeof state === 'string' ? JSON.parse(state) : state },
      }),
    expireAdmin: async () =>
      db.collection('parties').updateOne(filter, { $set: { 'admin.expiresAt': 0 } }),
    blockedCount: async () =>
      db.collection('youtube_blocks').countDocuments({ scope: 'nwx:principal' }),
    close: () => client.close(),
  }
}
