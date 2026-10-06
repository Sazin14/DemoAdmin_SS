'use client'

import { Children, cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactElement, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import {
  Activity, Archive, ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, Bell, Box,
  Check, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardList,
  CreditCard, Download, FileText, Filter, Grid2X2, House, LayoutDashboard, LogOut,
  Menu, MoreHorizontal, Package, Plus, Search, Settings, Shield, ShoppingBag,
  ShoppingCart, SlidersHorizontal, Star, Sun, Tag, Truck, Users, Moon, Monitor, X, type LucideIcon,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { AdminRecord, Category, Product, ProductVariant, StoreData } from '@/types/admin'
import { createCategory, createProduct, initialStore, readStore, writeStore } from '@/services/store'
import { useTheme, type ThemePreference } from './providers'

type NavItem = { label: string; href: string; icon: LucideIcon }
const navGroups: Array<{ title?: string; items: NavItem[] }> = [
  { items: [{ label: 'Overview', href: '/', icon: LayoutDashboard }] },
  { title: 'CATALOG', items: [
    { label: 'Products', href: '/products', icon: Package },
    { label: 'Categories', href: '/categories', icon: Grid2X2 },
    { label: 'Inventory', href: '/inventory', icon: Box },
  ] },
  { title: 'COMMERCE', items: [
    { label: 'Orders', href: '/orders', icon: ShoppingCart },
    { label: 'Customers', href: '/customers', icon: Users },
    { label: 'Reviews', href: '/reviews', icon: Star },
  ] },
  { title: 'GROWTH', items: [
    { label: 'Marketing', href: '/marketing', icon: Tag },
    { label: 'Notifications', href: '/notifications', icon: Bell },
    { label: 'Reports', href: '/reports', icon: BarChart3 },
  ] },
  { title: 'WORKSPACE', items: [
    { label: 'Admin users', href: '/admin-users', icon: Shield },
    { label: 'Roles & permissions', href: '/roles-permissions', icon: ClipboardList },
    { label: 'Activity log', href: '/activity-log', icon: Activity },
    { label: 'Settings', href: '/settings', icon: Settings },
  ] },
]

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const today = new Date().toISOString().slice(0, 10)
const slugTitle = (pathname: string) => pathname === '/' ? 'Overview' : pathname.split('/').filter(Boolean).map(word => word.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(' / ')
const authEvent = 'ecomms-auth-change'
const subscribeToAuth = (callback: () => void) => {
  window.addEventListener('storage', callback)
  window.addEventListener(authEvent, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(authEvent, callback)
  }
}
const getAuthSnapshot = () => window.localStorage.getItem('ecomms-admin-session') === 'active'
const subscribeToNothing = () => () => {}

const productSchema = z.object({
  name: z.string().trim().min(3, 'Use at least 3 characters'),
  sku: z.string().trim().min(3, 'SKU is required'),
  brand: z.string().trim().min(1, 'Brand is required'),
  category: z.string().min(1, 'Choose a category'),
  description: z.string().trim().min(10, 'Add a short product description'),
  price: z.coerce.number().positive('Price must be greater than zero'),
  compareAtPrice: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  lowStockThreshold: z.coerce.number().int().min(0),
  status: z.enum(['Draft', 'Pending review', 'Published', 'Archived']),
})
type ProductFormValues = z.infer<typeof productSchema>

function AppButton({ children, onClick, variant = 'secondary', disabled, type = 'button', className = '' }: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'plain'; disabled?: boolean; type?: 'button' | 'submit'; className?: string
}) {
  return <button className={`button button-${variant} ${className}`} type={type} onClick={onClick} disabled={disabled}>{children}</button>
}

function Pill({ children }: { children: string }) {
  const key = children.toLowerCase().replace(/[^a-z]+/g, '-')
  return <span className={`pill pill-${key}`}>{children}</span>
}

function ProductVisual({ image, className, alt }: { image: string; className: string; alt: string }) {
  return <span className={className}>{image.startsWith('data:image/')
    ? <Image className="thumbnail-image" src={image} alt={alt} width={160} height={160} unoptimized />
    : image}</span>
}

function Modal({ title, children, onClose, returnFocusTarget, wide = false }: { title: string; children: ReactNode; onClose: () => void; returnFocusTarget?: HTMLElement | null; wide?: boolean }) {
  const modalRef = useRef<HTMLElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  const restoreFrame = useRef<number | null>(null)

  useLayoutEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useLayoutEffect(() => {
    previousFocus.current = returnFocusTarget ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
  }, [returnFocusTarget])

  useEffect(() => {
    if (restoreFrame.current !== null) cancelAnimationFrame(restoreFrame.current)
    restoreFrame.current = null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusable = modalRef.current?.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')
    focusable?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !modalRef.current) return
      const items = [...modalRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      const target = previousFocus.current
      if (target?.isConnected) {
        restoreFrame.current = requestAnimationFrame(() => {
          target.focus()
          restoreFrame.current = null
        })
      }
    }
  }, [])

  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
    <section ref={modalRef} className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1}>
      <div className="modal-header"><h2 id="dialog-title">{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button></div>
      <div className="modal-content">{children}</div>
    </section>
  </div>
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  const errorId = useId()
  const described = error ? { 'aria-invalid': true, 'aria-describedby': errorId } : {}
  const control = Children.only(children)
  const accessibleControl = isValidElement(control)
    ? cloneElement(control as ReactElement, described)
    : control
  return <label className="field"><span>{label}</span>{accessibleControl}{error && <small className="field-error" id={errorId}>{error}</small>}</label>
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><ShoppingBag size={22} /></span><h3>{title}</h3><p>{detail}</p>{action}</div>
}

function Stat({ title, value, note, trend, icon: Icon }: { title: string; value: string; note: string; trend?: 'up' | 'down'; icon: LucideIcon }) {
  return <article className="stat-card"><span className="stat-icon"><Icon size={18} /></span><p>{title}</p><strong>{value}</strong><span className="stat-note">{trend && (trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />)}{note}</span></article>
}

function DataTable({ headings, children, empty }: { headings: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return <div className="table-wrap"><table><thead><tr>{headings.map((item, index) => <th key={typeof item === 'string' ? item : index}>{item}</th>)}</tr></thead><tbody>{children}</tbody>{empty && <tfoot><tr><td colSpan={headings.length}><EmptyState title="Nothing to show yet" detail="Try adjusting your filters or search terms." /></td></tr></tfoot>}</table></div>
}

export default function AdminConsole() {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()
  const { data: store = initialStore } = useQuery({
    queryKey: ['admin-store'],
    queryFn: readStore,
    staleTime: 0,
    refetchOnMount: 'always',
  })
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false)
  const signedIn = useSyncExternalStore(subscribeToAuth, getAuthSnapshot, () => false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [productModal, setProductModal] = useState<{ open: boolean; product?: Product }>({ open: false })
  const [categoryModal, setCategoryModal] = useState(false)
  const [inventoryTarget, setInventoryTarget] = useState<Product | null>(null)
  const [selection, setSelection] = useState<string[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const accountRef = useRef<HTMLDivElement>(null)
  const [modalReturnFocus, setModalReturnFocus] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!hydrated) return
    if (!signedIn && pathname !== '/login') router.replace('/login')
    if (signedIn && pathname === '/login') router.replace('/')
  }, [hydrated, pathname, router, signedIn])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key === 'Escape') {
        setAccountOpen(false)
        setMobileNavOpen(false)
      }
    }
    document.addEventListener('keydown', handleShortcut)
    return () => document.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!accountOpen) return
    const closeOutside = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('mousedown', closeOutside)
    return () => document.removeEventListener('mousedown', closeOutside)
  }, [accountOpen])

  const save = (next: StoreData) => {
    writeStore(next)
    queryClient.setQueryData(['admin-store'], next)
  }
  const activeHref = pathname.startsWith('/products/') ? '/products' : pathname
  const currentTitle = slugTitle(pathname)
  const unread = store.notifications.filter(item => item.status === 'Unread').length

  if (!hydrated || (pathname !== '/login' && !signedIn)) return <main className="loading-screen" aria-busy="true"><div className="loading-skeleton"><div className="skeleton-bar" /><div className="skeleton-title" /><div className="skeleton-grid"><i /><i /><i /></div><div className="skeleton-panel" /></div><span className="sr-only">Loading workspace</span></main>
  if (pathname === '/login') {
    return <Login onLogin={() => {
      window.localStorage.setItem('ecomms-admin-session', 'active')
      window.dispatchEvent(new Event(authEvent))
      router.replace('/')
    }} />
  }

  const isEditor = pathname === '/products/new' || pathname.endsWith('/edit')
  const editId = pathname.split('/')[2]
  const editProduct = store.products.find(product => product.id === editId)
  const captureModalFocus = () => {
    setModalReturnFocus(document.activeElement instanceof HTMLElement ? document.activeElement : null)
  }
  const openProduct = (product?: Product) => {
    captureModalFocus()
    setProductModal({ open: true, product })
  }
  const openCategory = () => {
    captureModalFocus()
    setCategoryModal(true)
  }
  const openInventory = (product: Product | null) => {
    captureModalFocus()
    setInventoryTarget(product)
  }

  return <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    {mobileNavOpen && <button className="mobile-scrim" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}
    <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark">e</div><div className="brand-text"><b>ecomms</b><small>COMMERCE ADMIN</small></div><button className="icon-button sidebar-collapse" onClick={() => setSidebarCollapsed(value => !value)} aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!sidebarCollapsed}><ChevronLeft size={17} /></button></div>
      <button className="store-switch" onClick={() => setNotice('Store switching will be available when multiple stores are connected.')}><span className="store-avatar">N</span><div><b>Northstar Supply</b><small>Online store</small></div><ChevronDown size={15} /></button>
      <nav className="side-nav" aria-label="Main navigation">
        {navGroups.map((group, index) => <div className="nav-group" key={group.title ?? 'main'}>
          {group.title && <div className="nav-label">{group.title}</div>}
          {group.items.map(item => <button key={item.href} title={sidebarCollapsed ? item.label : undefined} aria-current={activeHref === item.href ? 'page' : undefined} className={`nav-link ${activeHref === item.href ? 'nav-active' : ''}`} onClick={() => { router.push(item.href); setMobileNavOpen(false) }}>
            <item.icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{item.label === 'Notifications' && unread > 0 && <span className="nav-count">{unread}</span>}
          </button>)}
          {index === 0 && <div className="nav-divider" />}
        </div>)}
      </nav>
      <div className="sidebar-bottom"><button className="help-link" onClick={() => setNotice('Help center will be available soon.')}><CircleHelp size={16} /><span>Help & support</span></button><div className="user-card"><div className="user-avatar">RM</div><div className="user-meta"><b>Riley Morgan</b><small>Super admin</small></div><button className="icon-button" onClick={() => { window.localStorage.removeItem('ecomms-admin-session'); window.dispatchEvent(new Event(authEvent)); router.replace('/login') }} aria-label="Sign out"><LogOut size={16} /></button></div></div>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <button className="icon-button menu-trigger" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
        <nav className="breadcrumb" aria-label="Breadcrumb"><House size={15} /><ChevronRight size={14} /><span>{currentTitle.split(' / ')[0]}</span>{currentTitle.includes(' / ') && <><ChevronRight size={14} /><b>{currentTitle.split(' / ')[1]}</b></>}</nav>
        <div className="top-actions">
          <label className="global-search"><Search size={16} /><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search this page..." aria-label="Search current page" /><kbd>⌘ K</kbd></label>
          <button className="icon-button top-bell" aria-label="Notifications" onClick={() => router.push('/notifications')}><Bell size={18} />{unread > 0 && <i />}</button>
          <div className="account-menu" ref={accountRef}>
            <button className="top-user" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(value => !value)}><span>RM</span><ChevronDown size={14} /></button>
            {accountOpen && <div className="account-popover" role="menu" aria-label="Account and appearance">
              <div className="account-summary"><b>Riley Morgan</b><small>Super admin</small></div>
              <div className="theme-label">APPEARANCE</div>
              {(['light', 'dark', 'system'] as ThemePreference[]).map(option => <button key={option} role="menuitemradio" aria-checked={theme === option} className={`theme-choice ${theme === option ? 'theme-choice-active' : ''}`} onClick={() => setTheme(option)}>{option === 'light' ? <Sun size={15} /> : option === 'dark' ? <Moon size={15} /> : <Monitor size={15} />}<span>{option[0].toUpperCase() + option.slice(1)}</span>{theme === option && <Check size={14} />}</button>)}
              <button className="account-action" role="menuitem" onClick={() => { setAccountOpen(false); router.push('/settings') }}><Settings size={15} />Settings</button>
              <button className="account-action" role="menuitem" onClick={() => { window.localStorage.removeItem('ecomms-admin-session'); window.dispatchEvent(new Event(authEvent)); setAccountOpen(false); router.replace('/login') }}><LogOut size={15} />Sign out</button>
            </div>}
          </div>
        </div>
      </header>
      <main className="main-content" id="main-content" tabIndex={-1}>
        {isEditor ? <ProductEditor product={editProduct} products={store.products} categories={store.categories} onCancel={() => router.push('/products')} onSave={input => {
          const nextProduct = editProduct ? { ...editProduct, ...input, updatedAt: today } : createProduct(input)
          save({ ...store, products: editProduct ? store.products.map(product => product.id === editId ? nextProduct : product) : [nextProduct, ...store.products] })
          setNotice(editProduct ? 'Product changes saved' : 'Product created successfully')
          router.push('/products')
        }} /> : renderWorkspace({
          pathname, store, query, selection, setSelection, openProduct, setCategoryModal: openCategory, setInventoryTarget: openInventory,
          save, notify: setNotice, navigate: router.push, navigateEdit: id => router.push(`/products/${id}/edit`),
        })}
      </main>
    </div>

    {productModal.open && <ProductEditor product={productModal.product} products={store.products} categories={store.categories} modal returnFocusTarget={modalReturnFocus} onCancel={() => setProductModal({ open: false })} onSave={input => {
      const product = productModal.product
      const nextProduct = product ? { ...product, ...input, updatedAt: today } : createProduct(input)
      save({ ...store, products: product ? store.products.map(item => item.id === product.id ? nextProduct : item) : [nextProduct, ...store.products] })
      setProductModal({ open: false })
      setNotice(product ? 'Product updated' : 'Product added to catalog')
    }} />}
    {categoryModal && <CategoryDialog categories={store.categories} returnFocusTarget={modalReturnFocus} onClose={() => setCategoryModal(false)} onSave={categories => { save({ ...store, categories }); setCategoryModal(false); setNotice('Category created') }} />}
    {inventoryTarget && <InventoryDialog product={inventoryTarget} returnFocusTarget={modalReturnFocus} onClose={() => setInventoryTarget(null)} onSave={quantity => {
      save({ ...store, products: store.products.map(product => product.id === inventoryTarget.id ? { ...product, stock: Math.max(0, product.stock + quantity), updatedAt: today } : product) })
      setInventoryTarget(null)
      setNotice('Inventory adjustment saved')
    }} />}
    {notice && <div className="toast" role="status"><Check size={17} />{notice}<button className="icon-button" onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={15} /></button></div>}
  </div>
}

// MOCK AUTH: Temporary local-only sign-in. Replace with the EcomMS Auth Service before production.
function Login({ onLogin }: { onLogin: () => void }) {
  const [error, setError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    if (values.get('email') === 'admin@ecomms.store' && values.get('password') === 'Admin123!') onLogin()
    else setError('The email or password is incorrect.')
  }
  return <main className="login-screen"><div className="login-card"><div className="brand login-brand"><div className="brand-mark">e</div><div><b>ecomms</b><small>COMMERCE ADMIN</small></div></div><span className="eyebrow">ADMIN WORKSPACE</span><h1>Welcome back</h1><p>Sign in to manage your store operations.</p><form onSubmit={submit} className="login-form"><Field label="Work email"><input name="email" type="email" placeholder="you@company.com" defaultValue="admin@ecomms.store" required /></Field><Field label="Password"><input name="password" type="password" placeholder="Enter your password" defaultValue="Admin123!" required /></Field>{error && <p className="field-error">{error}</p>}<AppButton type="submit" variant="primary" className="button-full">Sign in to workspace <ArrowRight size={16} /></AppButton></form><small className="login-foot">Secure access for your team</small></div></main>
}

function PageHeading({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{children && <div className="heading-actions">{children}</div>}</div>
}

function renderWorkspace(props: {
  pathname: string; store: StoreData; query: string; selection: string[]; setSelection: (ids: string[]) => void;
  openProduct: (product?: Product) => void; setCategoryModal: (open: boolean) => void; setInventoryTarget: (product: Product | null) => void;
  save: (store: StoreData) => void; notify: (text: string) => void; navigate: (href: string) => void; navigateEdit: (id: string) => void;
}) {
  const { pathname, store, query, selection, setSelection, openProduct, setCategoryModal, setInventoryTarget, save, notify, navigate, navigateEdit } = props
  const filter = query.toLowerCase()
  const filteredProducts = store.products.filter(product => `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(filter))

  if (pathname === '/' || pathname === '/dashboard') return <Dashboard store={store} navigate={navigate} />
  if (pathname === '/products') return <Products products={filteredProducts} allProducts={store.products} categories={store.categories} selection={selection} setSelection={setSelection} onAdd={() => navigate('/products/new')} onEdit={navigateEdit} onView={id => navigate(`/products/${id}`)} onOpen={openProduct} onExport={() => downloadCsv('ecomms-products.csv', [['Name', 'SKU', 'Category', 'Brand', 'Price', 'Stock', 'Status'], ...store.products.map(product => [product.name, product.sku, product.category, product.brand, String(product.price), String(product.stock), product.status])])} onBulk={status => {
    const allowedTransition = (product: Product) => status === 'Pending review'
      ? product.status === 'Draft'
      : status === 'Published'
        ? product.status === 'Pending review' && Boolean(product.name && product.sku && product.category && product.price > 0 && product.image.startsWith('data:image/'))
        : status === 'Draft'
          ? product.status === 'Published' || product.status === 'Pending review'
          : status === 'Archived' && product.status !== 'Archived'
    const eligible = store.products.filter(product => selection.includes(product.id) && allowedTransition(product))
    if (eligible.length === 0) {
      notify('No selected products can make that status change')
      return
    }
    save({ ...store, products: store.products.map(product => eligible.some(item => item.id === product.id) ? { ...product, status, updatedAt: today } : product) })
    setSelection([])
    notify(`${eligible.length} product${eligible.length === 1 ? '' : 's'} moved to ${status.toLowerCase()}`)
  }} onDeleteMany={ids => {
    save({ ...store, products: store.products.filter(product => !ids.includes(product.id)) })
    setSelection([])
    notify(`${ids.length} products deleted`)
  }} />
  if (pathname.startsWith('/products/')) {
    const product = store.products.find(item => item.id === pathname.split('/')[2])
    if (!product) return <div className="page-content"><EmptyState title="Product not found" detail="It may have been removed from the catalog." action={<AppButton onClick={() => navigate('/products')}>Back to products</AppButton>} /></div>
    return <ProductDetail product={product} onBack={() => navigate('/products')} onEdit={() => navigateEdit(product.id)} onChangeStatus={status => {
      if (status === 'Published' && (!product.name || !product.sku || !product.category || product.price <= 0 || !product.image.startsWith('data:image/'))) {
        notify('Complete the product readiness checklist before publishing')
        return
      }
      save({ ...store, products: store.products.map(item => item.id === product.id ? { ...item, status, updatedAt: today } : item) })
      notify(status === 'Pending review' ? 'Product submitted for review' : `Product ${status.toLowerCase()}`)
    }} onDuplicate={() => {
      const duplicate = createProduct({ ...product, name: `${product.name} (copy)`, sku: `${product.sku}-COPY`, status: 'Draft' })
      save({ ...store, products: [duplicate, ...store.products] })
      notify('Product duplicated as a draft')
      navigate(`/products/${duplicate.id}/edit`)
    }} onDelete={() => {
      if (window.confirm(`Delete ${product.name}? This cannot be undone.`)) {
        save({ ...store, products: store.products.filter(item => item.id !== product.id) })
        notify('Product deleted')
        navigate('/products')
      }
    }} />
  }
  if (pathname === '/categories') return <Categories categories={store.categories.filter(category => `${category.name} ${category.parent} ${category.description}`.toLowerCase().includes(filter))} products={store.products} onCreate={() => setCategoryModal(true)} onDelete={id => {
    const category = store.categories.find(item => item.id === id)
    if (category && window.confirm(`Delete ${category.name}?`)) {
      save({ ...store, categories: store.categories.filter(item => item.id !== id) })
      notify('Category deleted')
    }
  }} />
  if (pathname === '/inventory') return <Inventory products={filteredProducts} onAdjust={setInventoryTarget} onExport={() => downloadCsv('ecomms-inventory.csv', [['Product', 'SKU', 'Category', 'Available', 'Threshold', 'Status'], ...store.products.map(product => [product.name, product.sku, product.category, String(product.stock), String(product.lowStockThreshold), product.stock === 0 ? 'Out of stock' : product.stock <= product.lowStockThreshold ? 'Low stock' : 'In stock'])])} notify={notify} />
  if (pathname === '/orders') return <RecordsPage title="Orders" description="Track, fulfill, and manage customer orders." icon={ShoppingCart} records={store.orders} headings={['ORDER & CUSTOMER', 'ORDER DETAILS', 'DATE', 'TOTAL', 'STATUS', '']} query={filter} action="Update status" onAction={record => {
    const next = record.status === 'Pending' ? 'Processing' : record.status === 'Processing' ? 'Shipped' : record.status === 'Shipped' ? 'Delivered' : 'Delivered'
    if (['Delivered', 'Cancelled', 'Refunded'].includes(record.status)) {
      notify(`Order ${record.id} is already ${record.status.toLowerCase()}`)
      return
    }
    save({ ...store, orders: store.orders.map(item => item.id === record.id ? { ...item, status: next } : item) })
    notify(`Order ${record.id} marked ${next.toLowerCase()}`)
  }} />
  if (pathname === '/customers') return <RecordsPage title="Customers" description="Understand your customers and their order activity." icon={Users} records={store.customers} headings={['CUSTOMER', 'CONTACT & ACTIVITY', 'STATUS', 'LAST ORDER', 'LIFETIME VALUE', '']} query={filter} />
  if (pathname === '/reviews') return <RecordsPage title="Reviews" description="Review customer feedback and keep your product community healthy." icon={Star} records={store.reviews} headings={['REVIEW & PRODUCT', 'CUSTOMER FEEDBACK', 'REVIEWED', 'STATUS', 'ACTIONS']} query={filter} action="Approve" onAction={record => {
    save({ ...store, reviews: store.reviews.map(item => item.id === record.id ? { ...item, status: item.status === 'Pending' ? 'Approved' : 'Rejected' } : item) })
    notify('Review moderation updated')
  }} />
  if (pathname === '/notifications') return <Notifications records={store.notifications} save={records => save({ ...store, notifications: records })} />
  if (pathname === '/marketing') return <Marketing notify={notify} />
  if (pathname === '/reports') return <Reports />
  if (pathname === '/admin-users') return <RecordsPage title="Admin users" description="Manage teammates with access to your store." icon={Shield} records={store.admins} headings={['TEAM MEMBER', 'EMAIL & ROLE', 'STATUS', 'LAST ACTIVE', '']} query={filter} />
  if (pathname === '/roles-permissions') return <Roles notify={notify} />
  if (pathname === '/activity-log') return <ActivityLog />
  if (pathname === '/settings') return <SettingsPage notify={notify} />
  return <div className="page-content"><EmptyState title="Page not found" detail="This workspace section does not exist." action={<AppButton onClick={() => navigate('/')}>Back to overview</AppButton>} /></div>
}

function Dashboard({ store, navigate }: { store: StoreData; navigate: (href: string) => void }) {
  const lowStock = store.products.filter(product => product.stock <= product.lowStockThreshold)
  const chartData = [
    { day: 'Mon', sales: 2880 }, { day: 'Tue', sales: 3420 }, { day: 'Wed', sales: 3100 },
    { day: 'Thu', sales: 4280 }, { day: 'Fri', sales: 3860 }, { day: 'Sat', sales: 5020 }, { day: 'Sun', sales: 4680 },
  ]
  return <div className="page-content">
    <PageHeading title="Good morning, Riley" description="Here's what's happening with your store today."><AppButton onClick={() => navigate('/reports')}><Download size={15} />Export report</AppButton><AppButton variant="primary" onClick={() => navigate('/products/new')}><Plus size={16} />Add product</AppButton></PageHeading>
    <div className="stats-grid">
      <Stat title="Total revenue" value="$27,240" note="+12.8% vs last period" trend="up" icon={CreditCard} />
      <Stat title="Today's revenue" value="$2,486.50" note="+8.2% vs yesterday" trend="up" icon={BarChart3} />
      <Stat title="Orders" value="48" note="12 need attention" trend="up" icon={ShoppingCart} />
      <Stat title="Customers" value={String(store.customers.length + 1240)} note="+6.4% this month" trend="up" icon={Users} />
    </div>
    <div className="dashboard-grid">
      <section className="panel sales-panel"><div className="panel-heading"><div><h2>Sales overview</h2><p>Daily gross revenue for this week</p></div><select aria-label="Sales period"><option>This week</option><option>This month</option><option>This year</option></select></div><div className="chart-legend"><span /> Revenue <strong>$27,240</strong><small><ArrowUpRight size={13} /> 12.8%</small></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 15, right: 5, left: -22, bottom: 0 }}><defs><linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#178a70" stopOpacity={0.17} /><stop offset="95%" stopColor="#178a70" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={value => `$${value / 1000}k`} /><Tooltip formatter={value => money(Number(value))} contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--foreground)', fontSize: 12 }} /><Area dataKey="sales" type="monotone" stroke="#16866e" strokeWidth={2.5} fill="url(#sales-fill)" /></AreaChart></ResponsiveContainer></div></section>
      <section className="panel"><div className="panel-heading"><div><h2>Order activity</h2><p>Latest customer orders</p></div><button className="text-action" onClick={() => navigate('/orders')}>View all <ArrowRight size={14} /></button></div><div className="compact-list">{store.orders.slice(0, 4).map(order => <div className="compact-row" key={order.id}><div className="record-avatar">{order.name.split(' ').map(part => part[0]).join('')}</div><div className="compact-main"><b>{order.name}</b><small>{order.id} · {order.date}</small></div><div className="compact-side"><b>{order.amount}</b><Pill>{order.status}</Pill></div></div>)}</div></section>
    </div>
    <div className="dashboard-grid lower-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Inventory to watch</h2><p>{lowStock.length} products below their stock threshold</p></div><button className="text-action" onClick={() => navigate('/inventory')}>Manage inventory <ArrowRight size={14} /></button></div><div className="compact-list">{lowStock.slice(0, 4).map(product => <div className="compact-row" key={product.id}><ProductVisual image={product.image} alt={product.name} className="product-emoji small-emoji" /><div className="compact-main"><b>{product.name}</b><small>{product.sku}</small></div><div className="compact-side"><b>{product.stock} left</b><Pill>Low stock</Pill></div></div>)}</div>{lowStock.length === 0 && <p className="muted-message">All products are above their stock thresholds.</p>}</section>
      <section className="panel"><div className="panel-heading"><div><h2>Store snapshot</h2><p>At a glance</p></div><button className="text-action" onClick={() => navigate('/products')}>Catalog <ArrowRight size={14} /></button></div><div className="snapshot-grid"><div><span>Active products</span><b>{store.products.filter(product => product.status === 'Published').length}</b></div><div><span>Pending orders</span><b>{store.orders.filter(order => order.status === 'Pending' || order.status === 'Processing').length}</b></div><div><span>Reviews to check</span><b>{store.reviews.filter(review => review.status === 'Pending').length}</b></div><div><span>Unread alerts</span><b>{store.notifications.filter(item => item.status === 'Unread').length}</b></div></div></section>
    </div>
  </div>
}

function Products({ products, allProducts, categories, selection, setSelection, onAdd, onEdit, onView, onOpen, onExport, onBulk, onDeleteMany }: {
  products: Product[]; allProducts: Product[]; categories: Category[]; selection: string[]; setSelection: (ids: string[]) => void;
  onAdd: () => void; onEdit: (id: string) => void; onView: (id: string) => void; onOpen: (product: Product) => void; onExport: () => void; onBulk: (status: Product['status']) => void; onDeleteMany: (ids: string[]) => void
}) {
  const [statusFilter, setStatusFilter] = useState('All status')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [sortNewest, setSortNewest] = useState(true)
  const [page, setPage] = useState(1)
  const filtered = products.filter(product => (statusFilter === 'All status' || product.status === statusFilter) && (categoryFilter === 'All categories' || product.category.toLowerCase().includes(categoryFilter.toLowerCase())))
    .sort((a, b) => sortNewest ? b.updatedAt.localeCompare(a.updatedAt) : a.name.localeCompare(b.name))
  const perPage = 6
  const visible = filtered.slice((page - 1) * perPage, page * perPage)
  const allVisibleSelected = visible.length > 0 && visible.every(product => selection.includes(product.id))
  return <div className="page-content">
    <PageHeading title="Products" description={`${allProducts.length} products in your catalog. Manage listings, pricing, and availability.`}><AppButton onClick={onExport}><Download size={15} />Export</AppButton><AppButton variant="primary" onClick={onAdd}><Plus size={16} />Add product</AppButton></PageHeading>
    <div className="stats-strip"><span><b>{allProducts.length}</b> Total products</span><i /><span><b>{allProducts.filter(product => product.status === 'Published').length}</b> Published</span><i /><span><b>{allProducts.filter(product => product.status === 'Draft').length}</b> Drafts</span><i /><span><b>{allProducts.filter(product => product.stock <= product.lowStockThreshold).length}</b> Low stock</span></div>
    <section className="panel table-panel">
      <div className="table-toolbar"><div className="tabs"><button aria-pressed={statusFilter === 'All status'} className={statusFilter === 'All status' ? 'tab-active' : ''} onClick={() => { setStatusFilter('All status'); setPage(1) }}>All <span>{products.length}</span></button>{['Published', 'Draft', 'Pending review'].map(status => <button key={status} aria-pressed={statusFilter === status} className={statusFilter === status ? 'tab-active' : ''} onClick={() => { setStatusFilter(status); setPage(1) }}>{status}</button>)}</div><div className="table-controls"><label className="control-select"><Filter size={14} /><select aria-label="Filter by category" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option>All categories</option>{categories.map(category => <option key={category.id}>{category.name}</option>)}</select></label><button className="small-control" onClick={() => setSortNewest(!sortNewest)}><SlidersHorizontal size={14} />{sortNewest ? 'Newest' : 'A to Z'}</button></div></div>
      {selection.length > 0 && <div className="bulk-bar"><span>{selection.length} selected</span><AppButton onClick={() => onBulk('Pending review')}>Submit for review</AppButton><AppButton onClick={() => onBulk('Published')}>Publish</AppButton><AppButton onClick={() => onBulk('Draft')}>Move to draft</AppButton><AppButton onClick={() => onBulk('Archived')}>Archive</AppButton><AppButton variant="danger" onClick={() => { if (window.confirm(`Delete ${selection.length} selected products? This cannot be undone.`)) onDeleteMany(selection) }}>Delete</AppButton><button className="icon-button" onClick={() => setSelection([])} aria-label="Clear selection"><X size={15} /></button></div>}
      <DataTable headings={[<input key="select-all" aria-label="Select all visible products" type="checkbox" checked={allVisibleSelected} onChange={event => setSelection(event.target.checked ? [...new Set([...selection, ...visible.map(product => product.id)])] : selection.filter(id => !visible.some(product => product.id === id)))} />, 'PRODUCT', 'SKU', 'CATEGORY', 'PRICE', 'INVENTORY', 'STATUS', 'UPDATED', '']} empty={visible.length === 0}>
        {visible.map(product => <tr key={product.id}>
          <td><input aria-label={`Select ${product.name}`} type="checkbox" checked={selection.includes(product.id)} onChange={event => setSelection(event.target.checked ? [...selection, product.id] : selection.filter(id => id !== product.id))} /></td>
          <td><button className="product-cell" onClick={() => onView(product.id)}><ProductVisual image={product.image} alt={product.name} className="product-emoji" /><span><b>{product.name}</b><small>{product.brand}</small></span></button></td>
          <td className="mono">{product.sku}</td><td>{product.category}</td><td className="price-cell">{money(product.price)}{product.compareAtPrice > product.price && <small>{money(product.compareAtPrice)}</small>}</td>
          <td><span className={product.stock <= product.lowStockThreshold ? 'stock-low' : 'stock-ok'}>{product.stock} in stock</span></td><td><Pill>{product.status}</Pill></td><td className="date-cell">{new Date(`${product.updatedAt}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
          <td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${product.name}`} onClick={() => onEdit(product.id)}><FileText size={16} /></button><button className="icon-button" aria-label={`More actions for ${product.name}`} onClick={() => onOpen(product)}><MoreHorizontal size={17} /></button></div></td>
        </tr>)}
      </DataTable>
      <div className="table-footer"><span>Showing {filtered.length ? (page - 1) * perPage + 1 : 0}–{Math.min(page * perPage, filtered.length)} of {filtered.length} products</span><div><button className="icon-button" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button><button className="page-number">{page}</button><button className="icon-button" disabled={page * perPage >= filtered.length} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={16} /></button></div></div>
    </section>
  </div>
}

function ProductEditor({ product, products, categories, onCancel, onSave, modal = false, returnFocusTarget }: {
  product?: Product; products: Product[]; categories: Category[]; onCancel: () => void; onSave: (product: Omit<Product, 'id' | 'updatedAt'>) => void; modal?: boolean; returnFocusTarget?: HTMLElement | null
}) {
  const [attribute, setAttribute] = useState('')
  const [attributeValue, setAttributeValue] = useState('')
  const [attributes, setAttributes] = useState<Record<string, string>>(product?.attributes ?? {})
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants ?? [])
  const [image, setImage] = useState(product?.image ?? '📦')
  const [mediaError, setMediaError] = useState('')
  const [variantName, setVariantName] = useState('')
  const [variantSku, setVariantSku] = useState('')
  const [variantPrice, setVariantPrice] = useState('')
  const [variantStock, setVariantStock] = useState('')
  const { register, handleSubmit, control, setError, formState: { errors, isSubmitting } } = useForm<z.input<typeof productSchema>, unknown, z.output<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? { ...product } : { name: '', sku: '', brand: '', category: '', description: '', price: 0, compareAtPrice: 0, stock: 0, lowStockThreshold: 10, status: 'Draft' },
  })
  const compareAtPrice = useWatch({ control, name: 'compareAtPrice' })
  const price = useWatch({ control, name: 'price' })
  const currentStatus = useWatch({ control, name: 'status' })
  const submit = (data: ProductFormValues) => {
    const duplicateSku = products.some(item => item.sku.toLowerCase() === data.sku.toLowerCase() && item.id !== product?.id)
    if (duplicateSku) {
      setError('sku', { type: 'validate', message: 'This SKU is already in use.' })
      return
    }
    onSave({ ...data, image, attributes, variants })
  }
  const handleImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMediaError('Choose an image file.')
      event.target.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setMediaError('Images must be 2 MB or smaller.')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onerror = () => setMediaError('This image could not be read. Try another file.')
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImage(reader.result)
        setMediaError('')
      } else {
        setMediaError('This image could not be read. Try another file.')
      }
    }
    reader.readAsDataURL(file)
  }
  const content = <form className="product-form" onSubmit={handleSubmit(submit)}>
    <div className="editor-main">
      <section className="panel form-panel"><div className="section-title"><div><h2>Product information</h2><p>Name and describe your product.</p></div><span className="required-note">* Required</span></div>
        <Field label="Product name *" error={errors.name?.message}><input {...register('name')} placeholder="e.g. Classic Everyday Backpack" /></Field>
        <div className="form-row"><Field label="Brand *" error={errors.brand?.message}><input {...register('brand')} placeholder="Brand name" /></Field><Field label="SKU *" error={errors.sku?.message}><input {...register('sku')} placeholder="e.g. BP-CLASSIC-01" /></Field></div>
        <Field label="Description *" error={errors.description?.message}><textarea {...register('description')} rows={5} placeholder="Describe what makes this product special..." /></Field>
      </section>
      <section className="panel form-panel"><div className="section-title"><div><h2>Category & attributes</h2><p>Organize your catalog and add product details.</p></div></div>
        <Field label="Category *" error={errors.category?.message}><select {...register('category')}><option value="">Select category</option>{categories.map(category => { const fullName = category.parent ? `${category.parent} / ${category.name}` : category.name; return <option key={category.id} value={fullName}>{fullName}</option> })}</select></Field>
        <div className="attribute-list">{Object.entries(attributes).map(([key, value]) => <div className="attribute-row" key={key}><b>{key}</b><span>{value}</span><button type="button" className="icon-button" onClick={() => setAttributes(current => Object.fromEntries(Object.entries(current).filter(([name]) => name !== key)))} aria-label={`Remove ${key}`}><X size={14} /></button></div>)}</div>
        <div className="attribute-add"><input aria-label="Attribute name" value={attribute} onChange={event => setAttribute(event.target.value)} placeholder="Attribute name" /><input aria-label="Attribute value" value={attributeValue} onChange={event => setAttributeValue(event.target.value)} placeholder="Value" /><AppButton onClick={() => { if (attribute.trim() && attributeValue.trim()) { setAttributes({ ...attributes, [attribute.trim()]: attributeValue.trim() }); setAttribute(''); setAttributeValue('') } }}><Plus size={14} />Add</AppButton></div>
      </section>
      <section className="panel form-panel"><div className="section-title"><div><h2>Variants</h2><p>Add sizes, colors, or other options with their own SKU and stock.</p></div></div>
        {variants.length > 0 && <div className="variant-list"><div className="variant-row variant-header"><b>OPTION</b><b>SKU</b><b>PRICE</b><b>STOCK</b><span /></div>{variants.map(variant => <div className="variant-row" key={variant.id}><b>{variant.name}</b><span className="mono">{variant.sku}</span><span>{money(variant.price)}</span><span>{variant.stock}</span><button type="button" className="icon-button" onClick={() => setVariants(current => current.filter(item => item.id !== variant.id))} aria-label={`Remove variant ${variant.name}`}><X size={14} /></button></div>)}</div>}
        <div className="variant-add"><input aria-label="Variant option" value={variantName} onChange={event => setVariantName(event.target.value)} placeholder="Option e.g. Black / Large" /><input aria-label="Variant SKU" value={variantSku} onChange={event => setVariantSku(event.target.value)} placeholder="Variant SKU" /><input aria-label="Variant price" type="number" min="0" step="0.01" value={variantPrice} onChange={event => setVariantPrice(event.target.value)} placeholder="Price" /><input aria-label="Variant stock" type="number" min="0" value={variantStock} onChange={event => setVariantStock(event.target.value)} placeholder="Stock" /><AppButton onClick={() => {
          const priceValue = Number(variantPrice)
          const stockValue = Number(variantStock)
          if (variantName.trim() && variantSku.trim() && priceValue > 0 && Number.isInteger(stockValue) && stockValue >= 0) {
            setVariants(current => [...current, { id: `var-${Date.now()}`, name: variantName.trim(), sku: variantSku.trim(), price: priceValue, stock: stockValue, attributes: { Option: variantName.trim() } }])
            setVariantName('')
            setVariantSku('')
            setVariantPrice('')
            setVariantStock('')
          }
        }}><Plus size={14} />Add variant</AppButton></div>
      </section>
      <section className="panel form-panel"><div className="section-title"><div><h2>Media</h2><p>Choose a main product image. Additional gallery uploads can connect to your media service.</p></div></div><div className="media-editor">{image.startsWith('data:image/') ? <Image className="media-preview" src={image} alt="Product main image preview" width={160} height={160} unoptimized /> : <span className="product-emoji media-emoji">{image}</span>}<div className="media-controls"><label className="button"><Plus size={14} />{image.startsWith('data:image/') ? 'Replace image' : 'Upload image'}<input type="file" accept="image/*" onChange={handleImage} /></label><small>PNG, JPG, or WebP · up to 2 MB</small>{image !== '📦' && <button type="button" className="delete-link" onClick={() => setImage('📦')}>Remove image</button>}{mediaError && <span className="field-error">{mediaError}</span>}</div></div><small className="media-note">This development image is saved with the browser data. Connect object storage for production uploads.</small></section>
    </div>
    <aside className="editor-aside">
      <section className="panel form-panel"><div className="section-title"><div><h2>Pricing</h2><p>Set your product price.</p></div></div><Field label="Price *" error={errors.price?.message}><div className="input-prefix"><span>$</span><input type="number" min="0" step="0.01" {...register('price')} /></div></Field><Field label="Compare-at price"><div className="input-prefix"><span>$</span><input type="number" min="0" step="0.01" {...register('compareAtPrice')} /></div></Field>      <div className="discount-preview">{Number(compareAtPrice) > Number(price) && Number(price) > 0 ? `${Math.round((1 - Number(price) / Number(compareAtPrice)) * 100)}% discount` : 'No discount applied'}</div></section>
      <section className="panel form-panel"><div className="section-title"><div><h2>Inventory</h2><p>Track availability and restocks.</p></div></div><Field label="Available quantity"><input type="number" min="0" {...register('stock')} /></Field><Field label="Low-stock threshold"><input type="number" min="0" {...register('lowStockThreshold')} /></Field></section>
      <section className="panel form-panel"><div className="section-title"><div><h2>Publishing</h2><p>Choose how this product appears.</p></div></div><input type="hidden" {...register('status')} /><div className="editor-status"><span>Current status</span><Pill>{currentStatus ?? 'Draft'}</Pill></div><div className="publish-note">Publishing and review status are managed from the product details page.</div></section>
    </aside>
    <div className="editor-footer"><AppButton onClick={onCancel}>Cancel</AppButton><span>Changes are saved in this browser.</span><AppButton type="submit" variant="primary" disabled={isSubmitting}>{product ? 'Save changes' : 'Create product'}</AppButton></div>
  </form>
  if (modal) return <Modal title={product ? 'Edit product' : 'Add product'} onClose={onCancel} returnFocusTarget={returnFocusTarget} wide><div className="modal-editor">{content}</div></Modal>
  return <div className="page-content editor-page"><PageHeading title={product ? 'Edit product' : 'Add product'} description={product ? `Update listing details for ${product.name}.` : 'Create a new product listing for your store.'}><button className="back-link" onClick={onCancel}><ChevronLeft size={16} />Back to products</button></PageHeading>{content}</div>
}

function ProductDetail({ product, onBack, onEdit, onChangeStatus, onDuplicate, onDelete }: {
  product: Product; onBack: () => void; onEdit: () => void; onChangeStatus: (status: Product['status']) => void; onDuplicate: () => void; onDelete: () => void
}) {
  const readiness = [
    ['Product name', Boolean(product.name)],
    ['Category', Boolean(product.category)],
    ['SKU', Boolean(product.sku)],
    ['Price', product.price > 0],
    ['Inventory configured', product.stock >= 0],
    ['Main image', product.image.startsWith('data:image/')],
  ] as const
  const ready = readiness.every(([, complete]) => complete)
  return <div className="page-content">
    <PageHeading title="Product details" description={`${product.sku} · Last updated ${new Date(`${product.updatedAt}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}><AppButton onClick={onBack}><ChevronLeft size={15} />Products</AppButton><AppButton onClick={onDuplicate}><Plus size={15} />Duplicate</AppButton><AppButton variant="primary" onClick={onEdit}>Edit product</AppButton></PageHeading>
    <div className="product-detail-grid">
      <div className="editor-main">
        <section className="panel detail-hero"><ProductVisual image={product.image} alt={product.name} className="detail-product-art" /><div className="detail-product-copy"><div className="detail-title-line"><h2>{product.name}</h2><Pill>{product.status}</Pill></div><p>{product.brand} · {product.category}</p><div className="detail-price">{money(product.price)}{product.compareAtPrice > product.price && <del>{money(product.compareAtPrice)}</del>}</div><p className="detail-description">{product.description || 'No product description has been added.'}</p></div></section>
        <section className="panel form-panel"><div className="section-title"><div><h2>Inventory</h2><p>Current availability for this listing.</p></div></div><div className="detail-metrics"><div><span>Available</span><b>{product.stock} units</b></div><div><span>Low-stock threshold</span><b>{product.lowStockThreshold} units</b></div><div><span>Availability</span><b className={product.stock <= product.lowStockThreshold ? 'stock-low' : 'stock-ok'}>{product.stock === 0 ? 'Out of stock' : product.stock <= product.lowStockThreshold ? 'Low stock' : 'In stock'}</b></div></div></section>
        <section className="panel form-panel"><div className="section-title"><div><h2>Product attributes</h2><p>Category-specific details for customers.</p></div></div>{Object.keys(product.attributes).length ? <div className="detail-attributes">{Object.entries(product.attributes).map(([key, value]) => <div key={key}><span>{key}</span><b>{value}</b></div>)}</div> : <p className="muted-message">No product attributes have been added.</p>}{product.variants && product.variants.length > 0 && <><div className="variant-detail-heading"><h3>Variants</h3><span>{product.variants.length} options</span></div><div className="variant-list">{product.variants.map(variant => <div className="variant-row" key={variant.id}><b>{variant.name}</b><span className="mono">{variant.sku}</span><span>{money(variant.price)}</span><span>{variant.stock} in stock</span></div>)}</div></>}</section>
      </div>
      <aside className="editor-aside">
        <section className="panel form-panel"><div className="section-title"><div><h2>Publishing</h2><p>Move this listing through its lifecycle.</p></div></div><div className="readiness-heading"><b>Product readiness</b><Pill>{ready ? 'Ready' : 'Needs attention'}</Pill></div><div className="readiness-list">{readiness.map(([label, complete]) => <div key={label}><span className={complete ? 'readiness-check' : 'readiness-missing'}>{complete ? <Check size={13} /> : <X size={13} />}</span>{label}</div>)}</div>
          {product.status === 'Draft' && <AppButton variant="primary" className="button-full" onClick={() => onChangeStatus('Pending review')}>Submit for review <ArrowRight size={14} /></AppButton>}
          {product.status === 'Pending review' && <AppButton variant="primary" className="button-full" disabled={!ready} onClick={() => onChangeStatus('Published')}>Publish product <ArrowRight size={14} /></AppButton>}
          {product.status === 'Published' && <AppButton className="button-full" onClick={() => onChangeStatus('Draft')}>Unpublish product</AppButton>}
          {product.status !== 'Archived' && <AppButton variant="danger" className="button-full archive-action" onClick={() => { if (window.confirm(`Archive ${product.name}?`)) onChangeStatus('Archived') }}><Archive size={14} />Archive product</AppButton>}
          {product.status === 'Archived' && <p className="muted-message">This product is archived and hidden from the store.</p>}
        </section>
        <section className="panel form-panel"><div className="section-title"><div><h2>Product information</h2><p>Listing identifiers.</p></div></div><div className="detail-attributes"><div><span>SKU</span><b className="mono">{product.sku}</b></div><div><span>Brand</span><b>{product.brand}</b></div><div><span>Category</span><b>{product.category}</b></div><div><span>Updated</span><b>{product.updatedAt}</b></div></div></section>
        <button className="delete-link" onClick={onDelete}><X size={14} />Delete product</button>
      </aside>
    </div>
  </div>
}

function Categories({ categories, products, onCreate, onDelete }: { categories: Category[]; products: Product[]; onCreate: () => void; onDelete: (id: string) => void }) {
  return <div className="page-content"><PageHeading title="Categories" description="Organize products into clear, browsable collections."><AppButton variant="primary" onClick={onCreate}><Plus size={16} />Add category</AppButton></PageHeading>
    <div className="stats-grid category-stats"><Stat title="Categories" value={String(categories.length)} note="Across your catalog" icon={Grid2X2} /><Stat title="Active" value={String(categories.filter(item => item.active).length)} note="Visible in your store" icon={Check} /><Stat title="Uncategorized products" value={String(products.filter(product => !categories.some(category => product.category.includes(category.name))).length)} note="Review catalog placement" icon={Package} /><Stat title="Products" value={String(products.length)} note="Total catalog listings" icon={ShoppingBag} /></div>
    <section className="panel table-panel"><div className="panel-heading panel-heading-padded"><div><h2>All categories</h2><p>Categories can be nested to build a product hierarchy.</p></div><button className="text-action" onClick={onCreate}><Plus size={15} />New category</button></div><DataTable headings={['CATEGORY', 'DESCRIPTION', 'PRODUCTS', 'STATUS', '']} empty={categories.length === 0}>{categories.map(category => <tr key={category.id}><td><div className="category-name">{category.parent && <span className="tree-branch">↳</span>}<span className="category-icon"><Grid2X2 size={16} /></span><b>{category.name}</b>{category.parent && <small>in {category.parent}</small>}</div></td><td>{category.description || '—'}</td><td>{products.filter(product => product.category.toLowerCase().includes(category.name.toLowerCase())).length}</td><td><Pill>{category.active ? 'Active' : 'Inactive'}</Pill></td><td><button className="icon-button" aria-label={`Delete ${category.name}`} onClick={() => onDelete(category.id)}><MoreHorizontal size={17} /></button></td></tr>)}</DataTable></section>
  </div>
}

function Inventory({ products, onAdjust, onExport, notify }: { products: Product[]; onAdjust: (product: Product) => void; onExport: () => void; notify: (message: string) => void }) {
  const [status, setStatus] = useState('All inventory')
  const visible = products.filter(product => status === 'All inventory' || (status === 'Low stock' ? product.stock <= product.lowStockThreshold : product.stock === 0))
  const total = products.reduce((sum, product) => sum + product.stock, 0)
  return <div className="page-content"><PageHeading title="Inventory" description="Monitor stock levels and keep your bestsellers available."><AppButton onClick={onExport}><Download size={15} />Export inventory</AppButton></PageHeading>
    <div className="stats-grid"><Stat title="Total units" value={String(total)} note="Across all SKUs" icon={Box} /><Stat title="Low stock" value={String(products.filter(product => product.stock <= product.lowStockThreshold && product.stock > 0).length)} note="Restock soon" icon={ArrowDownRight} /><Stat title="Out of stock" value={String(products.filter(product => product.stock === 0).length)} note="Unavailable listings" icon={Package} /><Stat title="Inventory value" value={money(products.reduce((sum, product) => sum + product.stock * product.price, 0))} note="At current prices" icon={CreditCard} /></div>
    <section className="panel table-panel"><div className="table-toolbar"><div className="tabs">{['All inventory', 'Low stock', 'Out of stock'].map(item => <button aria-pressed={status === item} className={status === item ? 'tab-active' : ''} key={item} onClick={() => setStatus(item)}>{item}</button>)}</div><div className="table-controls"><span className="table-count">{visible.length} SKUs</span></div></div><DataTable headings={['PRODUCT', 'SKU', 'AVAILABLE', 'THRESHOLD', 'STATUS', 'UNIT PRICE', '']} empty={visible.length === 0}>{visible.map(product => <tr key={product.id}><td><div className="product-cell"><ProductVisual image={product.image} alt={product.name} className="product-emoji" /><span><b>{product.name}</b><small>{product.category}</small></span></div></td><td className="mono">{product.sku}</td><td><b>{product.stock}</b> units</td><td>{product.lowStockThreshold} units</td><td><Pill>{product.stock === 0 ? 'Out of stock' : product.stock <= product.lowStockThreshold ? 'Low stock' : 'In stock'}</Pill></td><td>{money(product.price)}</td><td><AppButton onClick={() => onAdjust(product)}>Adjust</AppButton></td></tr>)}</DataTable><div className="table-footer"><span>Stock adjustments are recorded to your inventory activity.</span><button className="text-action" onClick={() => notify('Inventory adjustments are tracked in your store activity feed.')}><Activity size={14} />View history</button></div></section>
  </div>
}

function RecordsPage({ title, description, icon: Icon, records, headings, query, action, onAction }: {
  title: string; description: string; icon: LucideIcon; records: AdminRecord[]; headings: string[]; query: string; action?: string; onAction?: (record: AdminRecord) => void
}) {
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const visible = records.filter(item => `${item.id} ${item.name} ${item.detail} ${item.status}`.toLowerCase().includes(query) && (statusFilter === 'All statuses' || item.status === statusFilter))
  const statuses = [...new Set(records.map(record => record.status))]
  return <div className="page-content"><PageHeading title={title} description={description}>{title === 'Orders' && <AppButton onClick={() => downloadCsv('ecomms-orders.csv', [['Order', 'Customer', 'Details', 'Date', 'Total', 'Status'], ...records.map(record => [record.id, record.name, record.detail, record.date, record.amount ?? '', record.status])])}><Download size={15} />Export</AppButton>}</PageHeading>
    <div className="stats-grid record-stats"><Stat title={`Total ${title.toLowerCase()}`} value={String(records.length + (title === 'Customers' ? 1240 : 0))} note="Current records" icon={Icon} />{title === 'Orders' ? <><Stat title="Needs attention" value={String(records.filter(record => ['Pending', 'Processing'].includes(record.status)).length)} note="Orders in progress" icon={Activity} /><Stat title="Fulfilled" value={String(records.filter(record => record.status === 'Delivered').length)} note="Successfully delivered" icon={Truck} /><Stat title="Refunds" value={String(records.filter(record => record.status === 'Refunded').length)} note="This period" icon={CreditCard} /></> : <><Stat title="Active" value={String(records.filter(record => ['Active', 'Approved', 'Shipped', 'Delivered'].includes(record.status)).length)} note="In good standing" icon={Check} /><Stat title="Needs review" value={String(records.filter(record => ['Pending', 'Unread'].includes(record.status)).length)} note="Awaiting action" icon={Activity} /><Stat title="Updated recently" value={String(records.filter(record => record.date.includes('Oct')).length)} note="Past 7 days" icon={ArrowUpRight} /></>}</div>
    <section className="panel table-panel"><div className="panel-heading panel-heading-padded"><div><h2>{title} overview</h2><p>Search results update from the global search field.</p></div><label className="small-control"><Filter size={14} /><select aria-label={`Filter ${title.toLowerCase()} by status`} value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option>All statuses</option>{statuses.map(status => <option key={status}>{status}</option>)}</select></label></div>
      <DataTable headings={headings} empty={visible.length === 0}>{visible.map(record => {
        const order = title === 'Orders'
        const customer = title === 'Customers'
        const review = title === 'Reviews'
        const admin = title === 'Admin users'
        return <tr key={record.id}>
          <td><div className="primary-record"><b>{order ? record.id : record.name}</b><small>{order ? record.name : review ? record.id : admin ? record.id : ''}</small></div></td>
          <td><div className="primary-record"><span>{order ? record.detail : record.name}</span><small>{order ? '' : record.detail}</small></div></td>
          {!customer && !admin && !review && <td>{record.date}</td>}
          {customer && <td><Pill>{record.status}</Pill></td>}
          {admin && <td><Pill>{record.status}</Pill></td>}
          {(order || customer || review) && <td>{order ? record.amount : customer ? record.date : record.date}</td>}
          {(order || review) && <td><Pill>{record.status}</Pill></td>}
          {(customer || admin) && <td>{customer ? record.amount : record.date}</td>}
          <td>{onAction && <AppButton disabled={order && ['Delivered', 'Cancelled', 'Refunded'].includes(record.status)} onClick={() => onAction(record)}>{order ? action : review ? record.status === 'Pending' ? 'Approve' : 'Moderate' : 'View'} <ChevronDown size={13} /></AppButton>}</td>
        </tr>
      })}</DataTable><div className="table-footer"><span>Showing {visible.length} of {records.length} records</span><div><button className="icon-button" disabled aria-label="Previous page"><ChevronLeft size={16} /></button><button className="page-number">1</button><button className="icon-button" disabled aria-label="Next page"><ChevronRight size={16} /></button></div></div></section>
  </div>
}

function Notifications({ records, save }: { records: AdminRecord[]; save: (records: AdminRecord[]) => void }) {
  const [activeFilter, setActiveFilter] = useState('All')
  const visible = records.filter(record => activeFilter === 'All' || (activeFilter === 'Unread' ? record.status === 'Unread' : record.status === 'Read'))
  return <div className="page-content"><PageHeading title="Notifications" description="Stay on top of important store activity and system alerts.">{records.some(record => record.status === 'Unread') && <AppButton onClick={() => save(records.map(record => ({ ...record, status: 'Read' })))}><CheckCheck size={15} />Mark all as read</AppButton>}</PageHeading>
    <section className="panel"><div className="table-toolbar"><div className="tabs">{['All', 'Unread', 'Read'].map(item => <button aria-pressed={activeFilter === item} className={activeFilter === item ? 'tab-active' : ''} key={item} onClick={() => setActiveFilter(item)}>{item}</button>)}</div><span className="table-count">{records.filter(record => record.status === 'Unread').length} unread</span></div><div className="notification-list">{visible.map(record => <article className={`notification-row ${record.status === 'Unread' ? 'notification-unread' : ''}`} key={record.id}><span className="notification-icon">{record.id.startsWith('NTF-31') ? <Box size={18} /> : record.id.startsWith('NTF-30') ? <ShoppingCart size={18} /> : <Star size={18} />}</span><div className="notification-body"><b>{record.name}</b><p>{record.detail}</p><small>{record.date}</small></div><div className="notification-actions">{record.status === 'Unread' && <span className="unread-dot" />}<button className="small-control" onClick={() => save(records.map(item => item.id === record.id ? { ...item, status: item.status === 'Unread' ? 'Read' : 'Unread' } : item))}>{record.status === 'Unread' ? 'Mark read' : 'Mark unread'}</button></div></article>)}{visible.length === 0 && <EmptyState title="You're all caught up" detail="There are no notifications in this view." />}</div></section>
  </div>
}

function Marketing({ notify }: { notify: (text: string) => void }) {
  const [tab, setTab] = useState('Coupons')
  const [enabled, setEnabled] = useState<Record<string, boolean>>({ 'WELCOME10': true, 'FREESHIP': true, 'FALL25': false })
  const offers = [
    { code: 'WELCOME10', name: 'Welcome offer', discount: '10% off', audience: 'First-time customers', uses: '284 / 500', end: 'Nov 30, 2026' },
    { code: 'FREESHIP', name: 'Free shipping', discount: 'Free shipping', audience: 'All customers', uses: '92 / 250', end: 'Oct 31, 2026' },
    { code: 'FALL25', name: 'Fall collection', discount: '$25 off', audience: 'Selected products', uses: '0 / 100', end: 'Nov 15, 2026' },
  ]
  return <div className="page-content"><PageHeading title="Marketing" description="Create campaigns that bring customers back to your store."><AppButton variant="primary" onClick={() => notify(`New ${tab.toLowerCase().slice(0, -1)} setup started`)}><Plus size={16} />Create {tab.slice(0, -1).toLowerCase()}</AppButton></PageHeading>
    <section className="panel"><div className="table-toolbar"><div className="tabs">{['Coupons', 'Promotions', 'Banners'].map(item => <button key={item} aria-pressed={tab === item} className={tab === item ? 'tab-active' : ''} onClick={() => setTab(item)}>{item}</button>)}</div><span className="table-count">Campaign workspace</span></div>
      {tab === 'Coupons' ? <DataTable headings={['COUPON', 'DISCOUNT', 'AUDIENCE', 'USAGE', 'ENDS', 'STATUS', '']}><>{offers.map(offer => <tr key={offer.code}><td><div className="primary-record"><b>{offer.name}</b><small className="mono">{offer.code}</small></div></td><td>{offer.discount}</td><td>{offer.audience}</td><td>{offer.uses}</td><td>{offer.end}</td><td><Pill>{enabled[offer.code] ? 'Active' : 'Paused'}</Pill></td><td><button className={`toggle ${enabled[offer.code] ? 'toggle-on' : ''}`} onClick={() => setEnabled({ ...enabled, [offer.code]: !enabled[offer.code] })} aria-label={`Toggle ${offer.code}`}><span /></button></td></tr>)}</></DataTable> : <EmptyState title={`No ${tab.toLowerCase()} yet`} detail={`Your ${tab.toLowerCase()} will appear here after you create them.`} action={<AppButton variant="primary" onClick={() => notify(`${tab.slice(0, -1)} created`)}><Plus size={15} />Create {tab.slice(0, -1).toLowerCase()}</AppButton>} />}</section>
    <div className="info-banner"><Tag size={17} /><div><b>Campaign insights</b><span>Review redemption and conversion performance in Reports.</span></div></div>
  </div>
}

function Reports() {
  const [period, setPeriod] = useState('Last 7 days')
  const data = [{ day: 'Sep 30', sales: 2850 }, { day: 'Oct 1', sales: 3200 }, { day: 'Oct 2', sales: 2980 }, { day: 'Oct 3', sales: 4110 }, { day: 'Oct 4', sales: 3720 }, { day: 'Oct 5', sales: 4980 }, { day: 'Oct 6', sales: 4380 }]
  return <div className="page-content"><PageHeading title="Reports" description="Explore sales trends and understand what is driving your business."><select className="period-select" value={period} onChange={event => setPeriod(event.target.value)}><option>Last 7 days</option><option>Last 30 days</option><option>This year</option></select><AppButton onClick={() => downloadCsv('ecomms-sales-report.csv', [['Type', 'Name', 'Value'], ['Summary', 'Gross sales', '$27,240.00'], ['Summary', 'Orders', '184'], ['Summary', 'Average order value', '$148.04'], ['Summary', 'Refunds', '$412.50'], ...data.map(item => ['Daily sales', item.day, String(item.sales)])])}><Download size={15} />Export</AppButton></PageHeading>
    <div className="stats-grid"><Stat title="Gross sales" value="$27,240.00" note="+12.8% from previous period" trend="up" icon={CreditCard} /><Stat title="Orders" value="184" note="+8.4% from previous period" trend="up" icon={ShoppingCart} /><Stat title="Average order value" value="$148.04" note="+3.2% from previous period" trend="up" icon={BarChart3} /><Stat title="Refunds" value="$412.50" note="0.8% of gross sales" icon={ArrowDownRight} /></div>
    <section className="panel sales-panel report-panel"><div className="panel-heading"><div><h2>Sales performance</h2><p>Gross sales · {period.toLowerCase()}</p></div><select aria-label="Select report metric"><option>Gross sales</option><option>Net sales</option><option>Orders</option></select></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data} margin={{ top: 16, right: 8, left: -20, bottom: 0 }}><defs><linearGradient id="report-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#178a70" stopOpacity={0.16} /><stop offset="95%" stopColor="#178a70" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line)" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={value => `$${value / 1000}k`} /><Tooltip formatter={value => money(Number(value))} contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--foreground)', fontSize: 12 }} /><Area dataKey="sales" type="monotone" stroke="#16866e" strokeWidth={2.5} fill="url(#report-fill)" /></AreaChart></ResponsiveContainer></div></section>
    <div className="reports-grid"><section className="panel"><div className="panel-heading"><div><h2>Top products</h2><p>By units sold</p></div></div>{initialStore.products.slice(0, 4).map((product, index) => <div className="rank-row" key={product.id}><span>{String(index + 1).padStart(2, '0')}</span><b>{product.name}</b><strong>{[84, 62, 48, 31][index]} sold</strong></div>)}</section><section className="panel"><div className="panel-heading"><div><h2>By channel</h2><p>Revenue breakdown</p></div></div><div className="channel-row"><span>Online store</span><b>$21,680.00</b><div><i style={{ width: '80%' }} /></div></div><div className="channel-row"><span>Social commerce</span><b>$4,020.00</b><div><i style={{ width: '42%' }} /></div></div><div className="channel-row"><span>Direct sales</span><b>$1,540.00</b><div><i style={{ width: '24%' }} /></div></div></section></div>
  </div>
}

function Roles({ notify }: { notify: (message: string) => void }) {
  const permissions = ['View products', 'Create and edit products', 'Publish products', 'Manage orders', 'Manage customers', 'Moderate reviews', 'View reports', 'Manage team access']
  const roles = ['Super admin', 'Product manager', 'Order manager', 'Customer support']
  return <div className="page-content"><PageHeading title="Roles & permissions" description="Control what each team role can see and manage."><AppButton onClick={() => notify('Role creation will be available when team access is connected to the Auth Service.')}><Plus size={15} />Create role</AppButton></PageHeading><div className="info-banner"><Shield size={18} /><div><b>Permission-based access</b><span>Role changes take effect when connected to the authentication service.</span></div></div><section className="panel permission-panel"><div className="panel-heading panel-heading-padded"><div><h2>Role access matrix</h2><p>Review the access granted to each role.</p></div></div><div className="table-wrap"><table><thead><tr><th>PERMISSION</th>{roles.map(role => <th key={role}>{role}</th>)}</tr></thead><tbody>{permissions.map((permission, index) => <tr key={permission}><td><b>{permission}</b><small className="permission-scope">{['catalog', 'catalog', 'catalog', 'orders', 'customers', 'reviews', 'reports', 'team'][index]}</small></td>{roles.map((role, roleIndex) => <td key={role}><span className={`permission-check ${roleIndex === 0 || (roleIndex === 1 && index < 3) || (roleIndex === 2 && index === 3) ? 'permission-yes' : (roleIndex === 3 && [0, 3, 4, 5].includes(index) ? 'permission-yes' : '')}`}>{roleIndex === 0 || (roleIndex === 1 && index < 3) || (roleIndex === 2 && index === 3) || (roleIndex === 3 && [0, 3, 4, 5].includes(index)) ? <Check size={15} /> : '—'}</span></td>)}</tr>)}</tbody></table></div></section></div>
}

function ActivityLog() {
  const events = [
    ['RM', 'Riley Morgan', 'Updated product details', 'AeroTune Wireless Headphones', 'Today, 10:42 AM'],
    ['CN', 'Casey Nguyen', 'Adjusted inventory', 'Everyday Canvas Backpack · +12 units', 'Today, 9:18 AM'],
    ['JW', 'Jamie Wilson', 'Updated order status', 'Order ORD-2047 · Shipped', 'Today, 8:56 AM'],
    ['RM', 'Riley Morgan', 'Created category', 'Outdoors', 'Yesterday, 4:32 PM'],
    ['CN', 'Casey Nguyen', 'Submitted product for review', 'Luma Desk Lamp', 'Yesterday, 2:10 PM'],
  ]
  return <div className="page-content"><PageHeading title="Activity log" description="A record of changes made by your team."><AppButton onClick={() => downloadCsv('ecomms-activity.csv', [['Admin', 'Action', 'Target', 'Timestamp'], ...events.map(event => [event[1], event[2], event[3], event[4]])])}><Download size={15} />Export log</AppButton></PageHeading><div className="stats-grid"><Stat title="Events this week" value="128" note="Across all team members" icon={Activity} /><Stat title="Team members active" value="3" note="Past 7 days" icon={Users} /><Stat title="Latest event" value="10:42 AM" note="Today" icon={FileText} /><Stat title="Security events" value="0" note="No unusual activity" icon={Shield} /></div><section className="panel table-panel"><div className="panel-heading panel-heading-padded"><div><h2>Recent activity</h2><p>Most recent administrative actions.</p></div><span className="table-count">5 events</span></div><div className="activity-list">{events.map((event, index) => <div className="activity-row" key={index}><div className="user-avatar activity-avatar">{event[0]}</div><div className="activity-main"><b>{event[1]} <span>{event[2].toLowerCase()}</span></b><small>{event[3]}</small></div><time>{event[4]}</time></div>)}</div></section></div>
}

function SettingsPage({ notify }: { notify: (text: string) => void }) {
  const [section, setSection] = useState('Store details')
  const [saved, setSaved] = useState({ store: 'Northstar Supply', email: 'hello@northstarsupply.co', currency: 'USD', timezone: 'America/New_York', lowStock: '10', orderEmails: true, reviewEmails: true })
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setSaved({
      ...saved,
      store: String(form.get('store') ?? saved.store),
      email: String(form.get('email') ?? saved.email),
      currency: String(form.get('currency') ?? saved.currency),
      timezone: String(form.get('timezone') ?? saved.timezone),
      lowStock: String(form.get('threshold') ?? saved.lowStock),
    })
    notify(`${section} settings saved`)
  }
  const sections = [
    { name: 'Store details', icon: ShoppingBag },
    { name: 'Payments', icon: CreditCard },
    { name: 'Shipping', icon: Truck },
    { name: 'Notifications', icon: Bell },
    { name: 'Security', icon: Shield },
  ]
  return <div className="page-content">
    <PageHeading title="Settings" description="Configure your store preferences and operational defaults." />
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings sections">{sections.map(item => <button key={item.name} className={section === item.name ? 'settings-active' : ''} aria-current={section === item.name ? 'page' : undefined} onClick={() => setSection(item.name)}><item.icon size={16} />{item.name}</button>)}</nav>
      <form className="panel settings-panel" onSubmit={submit}>
        <div className="panel-heading"><div><h2>{section}</h2><p>{section === 'Store details' ? 'Basic information used across your admin and storefront.' : section === 'Notifications' ? 'Choose which store updates are delivered to your inbox.' : section === 'Security' ? 'Manage access to your administrative workspace.' : `${section} preferences for your store.`}</p></div></div>
        {section === 'Store details' && <>
          <Field label="Store name"><input name="store" defaultValue={saved.store} required /></Field>
          <Field label="Contact email"><input name="email" type="email" defaultValue={saved.email} required /></Field>
          <div className="form-row"><Field label="Store currency"><select name="currency" defaultValue={saved.currency}><option value="USD">USD — US Dollar</option><option value="CAD">CAD — Canadian Dollar</option><option value="EUR">EUR — Euro</option></select></Field><Field label="Time zone"><select name="timezone" defaultValue={saved.timezone}><option>America/New_York</option><option>Europe/London</option><option>Asia/Dhaka</option></select></Field></div>
          <hr /><div className="settings-subhead"><div><b>Inventory alerts</b><small>Get notified when stock falls below your threshold.</small></div></div><Field label="Default low-stock threshold"><input name="threshold" type="number" min="0" defaultValue={saved.lowStock} /></Field>
        </>}
        {section === 'Notifications' && <><label className="switch-row"><span>New order notifications</span><input type="checkbox" checked={saved.orderEmails} onChange={event => setSaved({ ...saved, orderEmails: event.target.checked })} /></label><label className="switch-row"><span>Product review notifications</span><input type="checkbox" checked={saved.reviewEmails} onChange={event => setSaved({ ...saved, reviewEmails: event.target.checked })} /></label></>}
        {section === 'Payments' && <div className="settings-info"><CreditCard size={19} /><div><b>Payment provider settings</b><p>Provider credentials and payment methods are configured through your payment service. No sensitive payment credentials are stored in this admin frontend.</p><AppButton onClick={() => notify('Payment provider configuration requires a connected backend service.')}>Provider configuration</AppButton></div></div>}
        {section === 'Shipping' && <><Field label="Default handling time"><select defaultValue="1 business day"><option>Same day</option><option>1 business day</option><option>2 business days</option><option>3 business days</option></select></Field><Field label="Shipping notice"><input placeholder="e.g. Free shipping over $75" defaultValue="Free shipping on orders over $75" /></Field><div className="info-banner"><Truck size={17} /><div><b>Shipping rates</b><span>Carrier rates and live label purchases are configured when the Order Service is connected.</span></div></div></>}
        {section === 'Security' && <div className="settings-info"><Shield size={19} /><div><b>Administrative session</b><p>This development workspace uses a local-only session. Production authentication and team permissions must be enforced by the EcomMS Auth Service.</p><AppButton onClick={() => notify('Security session settings are controlled by the Auth Service.')}>Session settings</AppButton></div></div>}
        <div className="settings-save"><span>Changes are local to this development workspace.</span><AppButton variant="primary" type="submit">Save settings</AppButton></div>
      </form>
    </div>
  </div>
}

function CategoryDialog({ categories, onClose, onSave, returnFocusTarget }: { categories: Category[]; onClose: () => void; onSave: (categories: Category[]) => void; returnFocusTarget?: HTMLElement | null }) {
  const [name, setName] = useState('')
  const [parent, setParent] = useState('')
  const [error, setError] = useState('')
  return <Modal title="Create category" onClose={onClose} returnFocusTarget={returnFocusTarget}><form onSubmit={event => { event.preventDefault(); if (name.trim().length < 2) { setError('Enter at least 2 characters.'); return } onSave([...categories, { ...createCategory(name.trim(), parent), description: 'New product category' }]) }}><Field label="Category name *" error={error}><input autoFocus value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Accessories" /></Field><Field label="Parent category"><select value={parent} onChange={event => setParent(event.target.value)}><option value="">No parent (top-level)</option>{categories.filter(category => !category.parent).map(category => <option key={category.id} value={category.name}>{category.name}</option>)}</select></Field><div className="modal-actions"><AppButton onClick={onClose}>Cancel</AppButton><AppButton type="submit" variant="primary">Create category</AppButton></div></form></Modal>
}

function InventoryDialog({ product, onClose, onSave, returnFocusTarget }: { product: Product; onClose: () => void; onSave: (quantity: number) => void; returnFocusTarget?: HTMLElement | null }) {
  const [quantity, setQuantity] = useState('1')
  const [operation, setOperation] = useState<'add' | 'remove'>('add')
  const [reason, setReason] = useState('Restock')
  const amount = Math.floor(Number(quantity))
  return <Modal title="Adjust inventory" onClose={onClose} returnFocusTarget={returnFocusTarget}><div className="inventory-product"><ProductVisual image={product.image} alt={product.name} className="product-emoji" /><div><b>{product.name}</b><small>{product.sku} · {product.stock} currently available</small></div></div><form onSubmit={event => { event.preventDefault(); if (amount > 0) onSave(operation === 'add' ? amount : -amount) }}><div className="form-row"><Field label="Adjustment"><select value={operation} onChange={event => setOperation(event.target.value as 'add' | 'remove')}><option value="add">Add stock</option><option value="remove">Remove stock</option></select></Field><Field label="Quantity"><input type="number" min="1" value={quantity} onChange={event => setQuantity(event.target.value)} required /></Field></div><Field label="Reason"><select value={reason} onChange={event => setReason(event.target.value)}><option>Restock</option><option>Damaged goods</option><option>Manual correction</option><option>Return received</option></select></Field><div className="inventory-result"><span>New available quantity</span><b>{Math.max(0, product.stock + (operation === 'add' ? amount : -amount))} units</b></div><div className="modal-actions"><AppButton onClick={onClose}>Cancel</AppButton><AppButton type="submit" variant="primary">Save adjustment</AppButton></div></form></Modal>
}
