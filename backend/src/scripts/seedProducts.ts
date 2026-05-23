import dotenv from 'dotenv'
import admin from 'firebase-admin'
import { Currency } from '../types/index.js'

dotenv.config()

type SeedProduct = {
  name: string
  sellerName?: string
  description: string
  price: number
  images: string[]
  category: string
  tags: string[]
  stock: number
  discount?: number
  salePrice?: number
  featured: boolean
  features?: string[]
  specs?: Record<string, string>
}

const projectId = process.env.FIREBASE_PROJECT_ID
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL

if (!projectId || !privateKey || !clientEmail) {
  throw new Error('Missing Firebase credentials. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL.')
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      privateKey,
      clientEmail,
    }),
  })
}

const db = admin.firestore()
const collection = db.collection('products')

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

const PRODUCT_CATEGORIES_BY_TYPE: Record<string, string[]> = {
  physical: [
    'Electronics',
    'Fashion & Apparel',
    'Home & Garden',
    'Sports & Outdoors',
    'Health & Beauty',
    'Food & Groceries',
    'Toys & Games',
    'Automotive',
    'Office Supplies',
    'Computing',
    'Mobile & Accessories',
  ],
  service: [
    'Consulting',
    'Design Services',
    'Development Services',
    'Repairs & Maintenance',
    'Coaching & Training',
    'Home Services',
    'Business Services',
    'Creative Services',
  ],
  downloadable: [
    'E-books & Guides',
    'Templates',
    'Design Assets',
    'Software & Plugins',
    'Courses & Tutorials',
    'Audio & Music',
    'Video Assets',
    'Documents & Forms',
  ],
}

const sellers = [
  'Tech Hub', 'Comfort Living', 'Green Energy', 'Power Systems', 'Gadget Store',
  'Home Essentials', 'Daily Deals', 'Urban Outfitters', 'Book Corner', 'Sportify'
]

const adjectives = ['Smart', 'Portable', 'Ultra', 'Compact', 'Premium', 'Eco', 'Wireless', 'Rechargeable', 'Pro', 'Mini']
const nouns = ['Speaker', 'Charger', 'Fan', 'Lantern', 'Powerbank', 'Adapter', 'Battery', 'Headphones', 'Blender', 'Kettle', 'Backpack', 'Jacket', 'Sneakers']

async function seedProducts(): Promise<void> {
  console.log('Cleaning up old seeded products...')
  const existingDocs = await collection.listDocuments()
  const seedDocs = existingDocs.filter((doc) => doc.id.startsWith('seed-'))

  for (const doc of seedDocs) await doc.delete()
  console.log(`Deleted ${seedDocs.length} old seed documents.`)

  const total = 1500
  let created = 0
  const batchLimit = 500
  let batch = db.batch()
  let ops = 0

  for (let i = 1; i <= total; i++) {
    // choose a product type distribution: mostly physical, some services and downloadable
    const roll = Math.random()
    const productType: 'physical' | 'service' | 'downloadable' = roll < 0.8 ? 'physical' : roll < 0.9 ? 'service' : 'downloadable'
    const catList = PRODUCT_CATEGORIES_BY_TYPE[productType]
    const cat = catList[i % catList.length]
    const seller = sellers[i % sellers.length]
    const name = `${adjectives[i % adjectives.length]} ${nouns[i % nouns.length]} ${i}`
    const id = `seed-${slugify(name)}`
    const price = randInt(1500, 250000)
    const hasDiscount = Math.random() < 0.25
    const discount = hasDiscount ? [5,10,12,15,20][Math.floor(Math.random()*5)] : undefined
    const salePrice = discount ? Math.round(price * (100 - discount) / 100) : undefined
    const stock = randInt(0, 300)
    const featured = Math.random() < 0.08
    const tags = [cat.toLowerCase().split(' ')[0], nouns[i % nouns.length].toLowerCase(), 'sale']

    const images = [
      `https://picsum.photos/seed/${slugify(name)}-1/800/600`,
      `https://picsum.photos/seed/${slugify(name)}-2/800/600`,
      `https://picsum.photos/seed/${slugify(name)}-3/800/600`,
    ]

    const product: SeedProduct & any = {
      name,
      sellerName: seller,
      description: `${name} by ${seller}. High quality ${nouns[i % nouns.length].toLowerCase()} suitable for ${cat.toLowerCase()}.`,
      price,
      images,
      category: cat,
      tags,
      stock,
      discount,
      salePrice,
      featured,
      features: [`${nouns[i % nouns.length]} built to last`, 'Quality guaranteed', '2-year warranty'],
      specs: {
        Brand: seller,
        Model: `Model-${i}`,
        Origin: 'Imported',
      },
    }

    // attach type-specific fields
    product.productType = productType
    if (productType === 'service') {
      product.serviceDetails = {
        deliveryMode: ['online','onsite','hybrid'][i % 3],
        duration: `${randInt(1,8)} hours`,
        turnaround: `${randInt(1,7)} days`,
        bookingNotes: 'Contact seller to schedule service',
      }
    }

    if (productType === 'downloadable') {
      product.downloadableDetails = {
        downloadUrl: images[0],
        fileFormat: ['PDF','ZIP','MP3','MP4'][i % 4],
        fileSizeMb: randInt(1,500),
        licenseInfo: 'Standard license',
      }
    }

    const ref = collection.doc(id)
    // remove undefined fields because Firestore rejects undefined by default
    const doc: any = {
      ...product,
      id,
      currency: Currency.NGN,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    Object.keys(doc).forEach((k) => {
      if ((doc as any)[k] === undefined) delete (doc as any)[k]
    })

    batch.set(ref, doc)

    ops += 1
    created += 1

    if (ops >= batchLimit) {
      await batch.commit()
      console.log(`Committed ${ops} documents...`)
      batch = db.batch()
      ops = 0
    }
  }

  if (ops > 0) {
    await batch.commit()
    console.log(`Committed ${ops} documents...`)
  }

  console.log(`\n✅ Seed complete: ${created} new products created.`)
}

seedProducts().catch((error) => {
  console.error('Product seed failed:', error)
  process.exit(1)
})
