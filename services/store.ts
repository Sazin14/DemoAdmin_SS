import type { AdminRecord, Category, Product, StoreData } from '@/types/admin'

// MOCK DATA: Temporary development fixtures replaceable by the corresponding service APIs.
const demoProducts: Product[] = [
  { id: 'prd-1001', name: 'AeroTune Wireless Headphones', sku: 'AT-WH-401', category: 'Electronics / Audio', brand: 'AeroTune', description: 'Comfortable over-ear wireless headphones with active noise cancellation and up to 32 hours of battery life.', price: 89.99, compareAtPrice: 119.99, stock: 42, lowStockThreshold: 12, status: 'Published', image: '🎧', updatedAt: '2026-10-05', attributes: { Connectivity: 'Bluetooth 5.3', Colour: 'Midnight black' } },
  { id: 'prd-1002', name: 'Everyday Canvas Backpack', sku: 'EC-BP-022', category: 'Accessories / Bags', brand: 'Northline', description: 'A durable everyday backpack with a padded laptop sleeve and water-resistant canvas.', price: 64, compareAtPrice: 0, stock: 8, lowStockThreshold: 10, status: 'Published', image: '🎒', updatedAt: '2026-10-04', attributes: { Material: 'Recycled canvas', Capacity: '22 L' } },
  { id: 'prd-1003', name: 'Ceramic Pour-over Set', sku: 'CP-SET-018', category: 'Home / Kitchen', brand: 'Stillhouse', description: 'Hand-finished stoneware pour-over coffee set for slow mornings.', price: 48.5, compareAtPrice: 55, stock: 24, lowStockThreshold: 8, status: 'Published', image: '☕', updatedAt: '2026-10-03', attributes: { Material: 'Stoneware', Colour: 'Sand' } },
  { id: 'prd-1004', name: 'Studio Knit Running Shoe', sku: 'SK-RS-205', category: 'Apparel / Footwear', brand: 'Form Athletics', description: 'Lightweight knit running shoes designed for daily training and all-day comfort.', price: 112, compareAtPrice: 0, stock: 0, lowStockThreshold: 15, status: 'Draft', image: '👟', updatedAt: '2026-10-02', attributes: { Upper: 'Engineered knit', Gender: 'Unisex' } },
  { id: 'prd-1005', name: 'Luma Desk Lamp', sku: 'LM-DL-009', category: 'Home / Lighting', brand: 'Luma Works', description: 'Minimal adjustable desk lamp with warm dimmable LED lighting.', price: 76, compareAtPrice: 92, stock: 6, lowStockThreshold: 10, status: 'Pending review', image: '💡', updatedAt: '2026-10-01', attributes: { Finish: 'Brushed brass', Bulb: 'LED 8 W' } },
  { id: 'prd-1006', name: 'Insulated Trail Bottle', sku: 'ITB-750-BL', category: 'Outdoors / Hydration', brand: 'Open Range', description: 'Double-wall stainless steel bottle that keeps drinks cold on long trail days.', price: 32, compareAtPrice: 0, stock: 96, lowStockThreshold: 20, status: 'Published', image: '🧴', updatedAt: '2026-09-30', attributes: { Capacity: '750 ml', Material: 'Stainless steel' } },
]

const demoCategories: Category[] = [
  { id: 'cat-1', name: 'Electronics', parent: '', description: 'Devices, audio and accessories', active: true },
  { id: 'cat-2', name: 'Audio', parent: 'Electronics', description: 'Headphones, speakers and audio gear', active: true },
  { id: 'cat-3', name: 'Home', parent: '', description: 'Thoughtful essentials for every room', active: true },
  { id: 'cat-4', name: 'Kitchen', parent: 'Home', description: 'Cooking and coffee essentials', active: true },
  { id: 'cat-5', name: 'Apparel', parent: '', description: 'Everyday clothing and footwear', active: true },
  { id: 'cat-6', name: 'Outdoors', parent: '', description: 'Gear for the journey', active: true },
]

const records = (items: Array<[string, string, string, string, string, string?]>): AdminRecord[] =>
  items.map(([id, name, detail, status, date, amount]) => ({ id, name, detail, status, date, amount }))

// MOCK DATA: Operations data remains replaceable through this repository boundary.
export const initialStore: StoreData = {
  products: demoProducts,
  categories: demoCategories,
  orders: records([
    ['ORD-2048', 'Avery Patel', '3 items · Card ending 4821', 'Processing', 'Oct 06, 2026', '$248.50'],
    ['ORD-2047', 'Jordan Lee', '2 items · Card ending 1904', 'Shipped', 'Oct 06, 2026', '$156.00'],
    ['ORD-2046', 'Morgan Chen', '1 item · Wallet', 'Pending', 'Oct 05, 2026', '$89.99'],
    ['ORD-2045', 'Sam Rivera', '4 items · Card ending 6630', 'Delivered', 'Oct 05, 2026', '$312.40'],
    ['ORD-2044', 'Taylor Brooks', '1 item · Card ending 0751', 'Refunded', 'Oct 04, 2026', '$48.50'],
  ]),
  customers: records([
    ['CUS-701', 'Avery Patel', 'avery.patel@email.test · 8 orders', 'Active', 'Oct 06, 2026', '$1,284'],
    ['CUS-702', 'Jordan Lee', 'jordan.lee@email.test · 5 orders', 'Active', 'Oct 06, 2026', '$742'],
    ['CUS-703', 'Morgan Chen', 'morgan.chen@email.test · 3 orders', 'Active', 'Oct 05, 2026', '$419'],
    ['CUS-704', 'Sam Rivera', 'sam.rivera@email.test · 12 orders', 'Active', 'Oct 04, 2026', '$2,106'],
  ]),
  reviews: records([
    ['REV-88', 'Avery Patel · AeroTune Wireless Headphones', '“Clear sound and comfortable all day.” · ★★★★★', 'Pending', 'Oct 06, 2026'],
    ['REV-87', 'Morgan Chen · Ceramic Pour-over Set', '“Beautiful finish, makes a great cup.” · ★★★★☆', 'Pending', 'Oct 05, 2026'],
    ['REV-86', 'Taylor Brooks · Luma Desk Lamp', '“Exactly what my desk needed.” · ★★★★★', 'Approved', 'Oct 04, 2026'],
  ]),
  notifications: records([
    ['NTF-31', 'Stock running low', 'Everyday Canvas Backpack · 8 units remaining', 'Unread', '10 minutes ago'],
    ['NTF-30', 'New order received', 'Order ORD-2048 · $248.50', 'Unread', '32 minutes ago'],
    ['NTF-29', 'Review needs moderation', 'AeroTune Wireless Headphones · 5 stars', 'Read', '1 hour ago'],
  ]),
  admins: records([
    ['ADM-1', 'Riley Morgan', 'riley@ecomms.store · Super admin', 'Active', 'Sep 12, 2026'],
    ['ADM-2', 'Casey Nguyen', 'casey@ecomms.store · Product manager', 'Active', 'Sep 18, 2026'],
    ['ADM-3', 'Jamie Wilson', 'jamie@ecomms.store · Order manager', 'Active', 'Sep 25, 2026'],
  ]),
}

const storageKey = 'ecomms-admin-store-v1'

export function readStore(): StoreData {
  if (typeof window === 'undefined') return initialStore
  try {
    const saved = window.localStorage.getItem(storageKey)
    return saved ? { ...initialStore, ...JSON.parse(saved) as Partial<StoreData> } : initialStore
  } catch (error) {
    console.error('Unable to read saved admin data.', error)
    return initialStore
  }
}

export function writeStore(data: StoreData): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(data))
  } catch (error) {
    console.error('Unable to save admin data.', error)
    throw new Error('Your changes could not be saved in this browser.')
  }
}

export const createProduct = (input: Omit<Product, 'id' | 'updatedAt'>): Product => ({
  ...input,
  id: `prd-${Date.now()}`,
  updatedAt: new Date().toISOString().slice(0, 10),
})

export const createCategory = (name: string, parent = ''): Category => ({
  id: `cat-${Date.now()}`,
  name,
  parent,
  description: '',
  active: true,
})
