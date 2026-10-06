const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''

export const serviceEndpoints = {
  api: apiBaseUrl,
  auth: process.env.NEXT_PUBLIC_AUTH_API_URL ?? `${apiBaseUrl}/auth`,
  products: process.env.NEXT_PUBLIC_PRODUCT_API_URL ?? `${apiBaseUrl}/products`,
  orders: process.env.NEXT_PUBLIC_ORDER_API_URL ?? `${apiBaseUrl}/orders`,
  notifications: process.env.NEXT_PUBLIC_NOTIFICATION_API_URL ?? `${apiBaseUrl}/notifications`,
}
