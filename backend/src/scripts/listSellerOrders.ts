import { initializeFirebase, getFirestore as _getFirestore } from '../config/firebase.js'

async function main() {
  initializeFirebase()
  const db = _getFirestore()

  const snapshot = await db.collection('sellerOrders').limit(50).get()
  console.log(`Found ${snapshot.size} sellerOrders`)
  for (const doc of snapshot.docs) {
    const d = doc.data()
    console.log(JSON.stringify(d, null, 2))
  }

  // show some orders
  const ordersSnap = await db.collection('orders').limit(10).get()
  console.log(`Found ${ordersSnap.size} orders`)
  for (const doc of ordersSnap.docs) {
    const d = doc.data()
    console.log(JSON.stringify({ id: d.id, items: d.items?.slice(0,3), totalAmount: d.totalAmount }, null, 2))
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
