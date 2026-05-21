import { initializeFirebase, getFirestore } from '../config/firebase.js'

async function main() {
  initializeFirebase()
  const db = getFirestore()

  const all = await db.collection('notifications').limit(50).get()
  console.log('Total notifications docs:', all.size)

  for (const doc of all.docs) {
    const d = doc.data() as any
    console.log(JSON.stringify({
      id: d.id,
      userId: d.userId,
      type: d.type,
      title: d.title,
      readAt: d.readAt ?? null,
      createdAt: d.createdAt,
      link: d.link,
    }))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
