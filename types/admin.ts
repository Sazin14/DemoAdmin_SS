export type ProductStatus = 'Draft' | 'Pending review' | 'Published' | 'Archived'

export type ProductVariant = {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  image?: string
  attributes: Record<string, string>
}

export type Product = {
  id: string
  name: string
  sku: string
  category: string
  brand: string
  description: string
  price: number
  compareAtPrice: number
  stock: number
  lowStockThreshold: number
  status: ProductStatus
  image: string
  updatedAt: string
  attributes: Record<string, string>
  variants?: ProductVariant[]
}

export type Category = {
  id: string
  name: string
  parent: string
  description: string
  active: boolean
}

export type AdminRecord = {
  id: string
  name: string
  detail: string
  status: string
  date: string
  amount?: string
  statusHistory?: OrderStatusHistoryEntry[]
}

export type OrderStatus = 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded'

export type OrderStatusHistoryEntry = {
  id: string
  from: OrderStatus | null
  to: OrderStatus
  changedAt: string
  changedBy: string
  undone?: boolean
}

export type StoreData = {
  products: Product[]
  categories: Category[]
  orders: AdminRecord[]
  customers: AdminRecord[]
  reviews: AdminRecord[]
  notifications: AdminRecord[]
  admins: AdminRecord[]
}
