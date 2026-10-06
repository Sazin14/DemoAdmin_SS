# EcomMS Admin

A responsive ecommerce administration workspace built with Next.js App Router, React, TypeScript, TanStack Query, React Hook Form, Zod, Recharts, and Lucide.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The temporary local development sign-in is prefilled:

- Email: `admin@ecomms.store`
- Password: `Admin123!`

This mock sign-in and the sample store data are for local development only. Replace the client-side session with the EcomMS Auth Service before production use.

## Available commands

- `npm run dev` — start the local development server
- `npm run lint` — run ESLint
- `npm run build` — type-check and create a production build
- `npm run start` — serve a production build

## Workspace

The application provides a responsive shared navigation shell for the dashboard, catalog, inventory, orders, customers, reviews, marketing, notifications, reports, team access, activity, and settings. Product and category changes plus inventory adjustments persist in browser local storage.

The catalog includes product creation/editing with validated fields, category and dynamic attribute entry, pricing, inventory thresholds, draft/review/published states, filtering, status tabs, selection, bulk status changes, pagination, and a readiness-gated publish action on product details.

## Integration boundaries

- `types/admin.ts` contains shared domain types.
- `services/store.ts` supplies clearly marked temporary mock fixtures and browser persistence.
- `services/config.ts` centralizes the Auth, Product, Order, Notification, and shared API base URLs. Copy `.env.example` to `.env.local` and adjust service URLs for your local backend.
- UI pages consume data via the local store boundary; replace that implementation with service repositories backed by EcomMS Auth, Product, Order, and Notification APIs.
- No production API endpoint, storage provider, or credential is embedded in the client.

The current sign-in is intentionally a mock and is not an authorization mechanism. Add backend session validation and server-enforced role/permission checks before exposing this app in production.
