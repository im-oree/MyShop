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

const products: SeedProduct[] = [
  {
    name: 'Duracell AA Alkaline Battery Pack',
    sellerName: 'Batter Shop Official',
    description: 'Premium Duracell AA alkaline batteries pack (4-pack). Reliable power source for remotes, toys, flashlights, gaming controllers, and all your everyday electronics. With Duracell\'s proven longevity and reliability, these batteries last longer and are perfect for high-drain devices. Ideal for both household use and emergency backup power needs. Each battery delivers consistent power output.',
    price: 8500,
    images: [
      'https://picsum.photos/600/400?random=1',
      'https://picsum.photos/600/400?random=11',
      'https://picsum.photos/600/400?random=21',
      'https://picsum.photos/600/400?random=31',
    ],
    category: 'Batteries',
    tags: ['aa', 'alkaline', 'duracell', 'household'],
    stock: 120,
    discount: 10,
    salePrice: 7650,
    featured: true,
    features: ['Premium quality materials', 'Designed for durability and long-lasting use', 'Tested and certified for safety', 'Eco-friendly packaging', 'Compatible with high-drain devices'],
    specs: {
      'Brand': 'Duracell',
      'Category': 'Alkaline Batteries',
      'Type': 'AA (Double A)',
      'Capacity': '2900 mAh',
      'Voltage': '1.5V',
      'Warranty': '12 months',
      'Origin': 'USA',
    },
  },
  {
    name: 'Anker PowerCore 20,000mAh Power Bank',
    sellerName: 'Tech Hub Electronics',
    description: 'Anker PowerCore 20,000mAh portable power bank with exceptional capacity. Charge your devices 6+ times with this lightweight and durable power bank. Dual USB-A output allows simultaneous charging of two devices at full speed. Features advanced PowerIQ technology for optimized charging speed detection. Built-in safety charging protection system protects all device types from overcharging. Perfect for travel, outdoor adventures, and daily commute. 18-month warranty included.',
    price: 285000,
    images: [
      'https://picsum.photos/600/400?random=2',
      'https://picsum.photos/600/400?random=12',
      'https://picsum.photos/600/400?random=22',
      'https://picsum.photos/600/400?random=32',
    ],
    category: 'Power Banks',
    tags: ['anker', 'power-bank', 'fast-charge', 'portable'],
    stock: 48,
    discount: 5,
    salePrice: 270750,
    featured: true,
    features: ['20,000mAh capacity for 6+ full charges', 'Dual USB output for simultaneous charging', 'PowerIQ technology for intelligent charging', 'Compact and lightweight design', 'Multi-layer safety protection system'],
    specs: {
      'Brand': 'Anker',
      'Capacity': '20,000 mAh',
      'Output Ports': '2x USB-A',
      'Weight': '356g',
      'Charging Time': '8-9 hours',
      'Warranty': '18 months',
      'Origin': 'China (Quality certified)',
    },
  },
  {
    name: 'APC 12V 7Ah Rechargeable Battery',
    sellerName: 'Power Systems Ltd',
    description: 'APC 12V 7Ah sealed lead-acid rechargeable battery. Professional-grade power solution designed for UPS systems, security alarms, emergency lighting, and backup power applications. Superior cycle life and reliability with 3-5 year lifespan. Maintenance-free operation with no memory effect. Designed for heavy charging cycles. Perfect for commercial and industrial use. Compact design fits standard UPS enclosures. Built-in safety vents prevent gas buildup.',
    price: 155000,
    images: [
      'https://picsum.photos/600/400?random=3',
      'https://picsum.photos/600/400?random=13',
      'https://picsum.photos/600/400?random=23',
      'https://picsum.photos/600/400?random=33',
    ],
    category: 'Rechargeable Batteries',
    tags: ['apc', 'ups', 'sla', 'backup-power'],
    stock: 64,
    featured: false,
    features: ['Sealed lead-acid technology', 'Maintenance-free operation', 'Deep cycle capability', 'Professional-grade reliability', 'Safety vents for protection'],
    specs: {
      'Brand': 'APC',
      'Type': 'Sealed Lead-Acid (SLA)',
      'Voltage': '12V',
      'Capacity': '7Ah',
      'Applications': 'UPS, Alarms, Emergency Lighting',
      'Warranty': '24 months',
      'Origin': 'Belgium',
    },
  },
  {
    name: 'Solar LED Lantern with Built-in Battery',
    sellerName: 'Green Energy Solutions',
    description: 'Eco-friendly solar LED lantern with integrated rechargeable battery. Perfect for camping, outdoor activities, emergency power outages, and garden lighting. Equipped with bright LED bulbs providing 200+ lumens of light. Charges fully in 6-8 hours of sunlight. Built-in USB charging port allows charging of small devices. Weatherproof and durable design rates IP65. Runtime up to 15 hours on full charge. No electricity costs, completely solar-powered. 2-year warranty on battery.',
    price: 42000,
    images: [
      'https://picsum.photos/600/400?random=4',
      'https://picsum.photos/600/400?random=14',
      'https://picsum.photos/600/400?random=24',
      'https://picsum.photos/600/400?random=34',
    ],
    category: 'Solar Lighting',
    tags: ['solar', 'lantern', 'portable-light', 'camping'],
    stock: 90,
    discount: 15,
    salePrice: 35700,
    featured: true,
    features: ['Solar-powered, zero electricity costs', '200+ lumens of bright LED light', 'Built-in USB charging port', 'Weatherproof IP65 rating', 'Up to 15 hours runtime'],
    specs: {
      'Type': 'Solar LED Lantern',
      'Light Output': '200+ lumens',
      'Battery': '2000 mAh lithium',
      'Charging Time': '6-8 hours (sunlight)',
      'Runtime': '15 hours (low)', 
      'Warranty': '24 months',
      'Origin': 'China',
    },
  },
  {
    name: 'Nokia BL-5C Replacement Battery',
    sellerName: 'Classic Phones Store',
    description: 'Original Nokia BL-5C lithium-ion replacement battery. Compatible with Nokia 1100, 1110, 1112, 1200, 1209, 1680c, 3100, 3110, 5140, 6230, 6600, N70, N91, and many other classic Nokia models. Capacity: 1020mAh for up to 8 hours talk time. Genuine quality with excellent performance. Original packaging with authenticity guarantee. Perfect for restoring old Nokia phones to working condition. Environmentally friendly battery manufacturing process.',
    price: 12500,
    images: [
      'https://picsum.photos/600/400?random=5',
      'https://picsum.photos/600/400?random=15',
      'https://picsum.photos/600/400?random=25',
      'https://picsum.photos/600/400?random=35',
    ],
    category: 'Phone Batteries',
    tags: ['nokia', 'replacement', 'mobile-battery'],
    stock: 150,
    featured: false,
    features: ['Compatible with 20+ Nokia models', 'Genuine quality assurance', 'Up to 8 hours talk time', 'Environmentally friendly', '1020 mAh capacity'],
    specs: {
      'Brand': 'Nokia Original',
      'Model': 'BL-5C',
      'Capacity': '1020 mAh',
      'Voltage': '3.7V',
      'Talk Time': 'Up to 8 hours',
      'Warranty': '12 months',
      'Origin': 'Finland',
    },
  },
  {
    name: '200Ah Deep Cycle Inverter Battery',
    sellerName: 'Industrial Power Corp',
    description: 'Professional 200Ah deep cycle lithium battery for home inverters, solar systems, and extended backup power. Designed to handle thousands of charge-discharge cycles with minimal degradation. Lightweight compared to lead-acid alternatives (60% lighter). Built-in Battery Management System (BMS) for safety monitoring and cell balancing. Compatible with 48V and 96V inverter systems. Ideal for off-grid setups, RV power systems, and commercial backup applications. 10-year warranty. Real-time monitoring via app included.',
    price: 2450000,
    images: [
      'https://picsum.photos/600/400?random=6',
      'https://picsum.photos/600/400?random=16',
      'https://picsum.photos/600/400?random=26',
      'https://picsum.photos/600/400?random=36',
    ],
    category: 'Inverter Batteries',
    tags: ['inverter', 'deep-cycle', 'backup', 'power'],
    stock: 18,
    discount: 8,
    salePrice: 2254000,
    featured: true,
    features: ['200Ah high capacity', 'Lithium deep cycle technology', 'Built-in BMS for safety', '60% lighter than lead-acid', 'Real-time app monitoring'],
    specs: {
      'Brand': 'Industrial Power Corp',
      'Type': 'Lithium Deep Cycle',
      'Capacity': '200 Ah',
      'Voltage': '48V/96V compatible',
      'Cycle Life': '5000+ cycles',
      'Warranty': '10 years',
      'Origin': 'Germany',
    },
  },
  {
    name: 'USB-C Fast Charging Wall Adapter',
    sellerName: 'Tech Connect Store',
    description: 'Compact and powerful USB-C PD (Power Delivery) wall charger supporting up to 65W output. Charges laptops, tablets, and smartphones at maximum speed. Universal compatibility with all USB-C devices including MacBook Pro, iPad Pro, Samsung Galaxy, Google Pixel, and Android phones. Foldable plug design for convenient portability. Smart Temperature Control ensures safety during extended charging sessions. Compact design fits any power outlet without blocking adjacent sockets. Includes 2-year global warranty.',
    price: 18000,
    images: [
      'https://picsum.photos/600/400?random=7',
      'https://picsum.photos/600/400?random=17',
      'https://picsum.photos/600/400?random=27',
      'https://picsum.photos/600/400?random=37',
    ],
    category: 'Chargers',
    tags: ['usb-c', 'charger', 'fast-charge', 'adapter'],
    stock: 200,
    featured: false,
    features: ['65W Power Delivery output', 'Foldable plug design', 'Smart temperature control', 'Universal USB-C compatibility', 'Compact and travel-friendly'],
    specs: {
      'Brand': 'Tech Connect',
      'Output': '65W USB-C PD',
      'Compatibility': 'MacBook, iPad Pro, Phones',
      'Design': 'Foldable plug',
      'Safety': 'Temperature control',
      'Warranty': '24 months',
      'Origin': 'Taiwan',
    },
  },
  {
    name: 'Portable Rechargeable Fan',
    sellerName: 'Comfort Living Appliances',
    description: 'Ultra-quiet portable rechargeable fan with 3 adjustable speed settings (low, medium, high). Perfect for home, office, bedroom, or outdoor use during hot weather. Built-in 2000mAh rechargeable battery provides 8+ hours of runtime on low speed, 4+ hours on high speed. USB-C charging port included for convenient recharging. Compact and lightweight design (only 300g) makes it highly portable. Whisper-quiet operation at just 25dB on lowest setting. 90-degree tilt feature for optimal air circulation. Energy-efficient brushless motor.',
    price: 68500,
    images: [
      'https://picsum.photos/600/400?random=8',
      'https://picsum.photos/600/400?random=18',
      'https://picsum.photos/600/400?random=28',
      'https://picsum.photos/600/400?random=38',
    ],
    category: 'Home Appliances',
    tags: ['fan', 'rechargeable', 'portable', 'cooling'],
    stock: 75,
    discount: 12,
    salePrice: 60280,
    featured: false,
    features: ['3 speed settings (low, medium, high)', '2000mAh battery', 'Ultra-quiet operation', '90-degree tilt feature', 'USB-C fast charging'],
    specs: {
      'Brand': 'Comfort Living',
      'Type': 'Portable Rechargeable Fan',
      'Battery': '2000 mAh',
      'Runtime': '8+ hours (low)',
      'Noise Level': '25dB (low)',
      'Warranty': '12 months',
      'Origin': 'Japan',
    },
  },
]

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function seedProducts(): Promise<void> {
  // Delete existing seeded products
  console.log('Cleaning up old seeded products...')
  const existingDocs = await collection.listDocuments()
  const seedDocs = existingDocs.filter((doc) => doc.id.startsWith('seed-'))
  
  for (const doc of seedDocs) {
    await doc.delete()
  }
  
  console.log(`Deleted ${seedDocs.length} old seed documents.\n`)

  let created = 0

  for (const product of products) {
    const id = `seed-${slugify(product.name)}`
    const ref = collection.doc(id)
    const now = new Date()
    
    await ref.set({
      ...product,
      id,
      currency: Currency.NGN,
      createdAt: now,
      updatedAt: now,
    })
    created += 1
    console.log(`✓ Created: ${product.name}`)
  }

  console.log(`\n✅ Seed complete: ${created} new products created.`)
}

seedProducts().catch((error) => {
  console.error('Product seed failed:', error)
  process.exit(1)
})