import { useEffect, useMemo, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { productService } from '@/services/productService'
import { uploadImagesToImgbb } from '@/services/imgbbService'
import { getCategoriesForProductType } from '@/constants/categories'
import Dropdown from './Dropdown'
import type { Product, ProductType } from '@/types'
import { formatPrice } from '@/utils'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Image as ImageIcon,
  Tag,
  DollarSign,
  Boxes,
  Sparkles,
  ClipboardCheck,
  Upload,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

interface ProductFormProps {
  open: boolean
  onClose: () => void
  onCreated: (product: Product) => void
  product?: Product | null
  onUpdated?: (product: Product) => void
}

type SpecEntry = { key: string; value: string }
type ImageEntry = { url?: string; file?: File; preview?: string }

const PRODUCT_TYPE_OPTIONS: Array<{ value: ProductType; label: string }> = [
  { value: 'physical', label: 'Physical Product' },
  { value: 'service', label: 'Service' },
  { value: 'downloadable', label: 'Downloadable Content' },
]

const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  physical: 'Physical Product',
  service: 'Service',
  downloadable: 'Downloadable Content',
}

const emptySpec = (): SpecEntry => ({ key: '', value: '' })

const STEPS = [
  { id: 'basics',   label: 'Basics',    icon: Tag,            sub: 'Name & category' },
  { id: 'pricing',  label: 'Pricing',   icon: DollarSign,     sub: 'Price & discount' },
  { id: 'inventory',label: 'Inventory', icon: Boxes,          sub: 'Stock & tags' },
  { id: 'media',    label: 'Media',     icon: ImageIcon,      sub: 'Product photos' },
  { id: 'details',  label: 'Details',   icon: Sparkles,       sub: 'Features & specs' },
  { id: 'review',   label: 'Review',    icon: ClipboardCheck, sub: 'Publish' },
] as const

type StepId = typeof STEPS[number]['id']

function ProductForm({ open, onClose, onCreated, product, onUpdated }: ProductFormProps) {
  const { user, setProductFormOpen } = useAuthStore()

  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [productType, setProductType]   = useState<ProductType>('physical')
  const [productName, setProductName]   = useState('')
  const [description, setDescription]   = useState('')
  const [category, setCategory]         = useState('')
  const [tagsText, setTagsText]         = useState('')
  const [priceNaira, setPriceNaira]     = useState('')
  const [salePriceNaira, setSalePriceNaira] = useState('')
  const [discount, setDiscount]         = useState('')
  const [stock, setStock]               = useState('')
  const [featured, setFeatured]         = useState(false)
  const [features, setFeatures]         = useState<string[]>([''])
  const [specs, setSpecs]               = useState<SpecEntry[]>([emptySpec()])
  const [imageEntries, setImageEntries] = useState<ImageEntry[]>([])
  const [serviceDeliveryMode, setServiceDeliveryMode] = useState<'online' | 'onsite' | 'hybrid'>('online')
  const [serviceDuration, setServiceDuration] = useState('')
  const [serviceTurnaround, setServiceTurnaround] = useState('')
  const [serviceBookingNotes, setServiceBookingNotes] = useState('')
  const [downloadUrl, setDownloadUrl] = useState('')
  const [downloadFormat, setDownloadFormat] = useState('')
  const [downloadSizeMb, setDownloadSizeMb] = useState('')
  const [downloadLicenseInfo, setDownloadLicenseInfo] = useState('')

  useEffect(() => {
    setProductFormOpen(open)

    return () => {
      setProductFormOpen(false)
    }
  }, [open, setProductFormOpen])

  const isEditMode = !!product
  const availableCategories = useMemo(() => getCategoriesForProductType(productType), [productType])

  useEffect(() => {
    if (!category) return
    if (!availableCategories.includes(category)) {
      setCategory('')
    }
  }, [availableCategories, category])

  /* ── Populate / reset on open ── */
  useEffect(() => {
    if (!open) return
    setError('')
    setSaving(false)
    setUploading(false)
    setStepIndex(0)

    if (product) {
      setProductType(product.productType || 'physical')
      setProductName(product.name || '')
      setDescription(product.description || '')
      setCategory(product.category || '')
      setTagsText((product.tags || []).join(', '))
      setPriceNaira(((product.price ?? 0) / 100).toString())
      setSalePriceNaira(product.salePrice ? ((product.salePrice ?? 0) / 100).toString() : '')
      setDiscount(product.discount ? String(product.discount) : '')
      setStock(String(product.stock ?? 0))
      setFeatured(Boolean(product.featured))
      setFeatures((product.features && product.features.length) ? product.features : [''])
      setSpecs(
        product.specs
          ? Object.entries(product.specs).map(([k, v]) => ({ key: k, value: v }))
          : [emptySpec()]
      )
      setImageEntries((product.images || []).map((url) => ({ url })))
      setServiceDeliveryMode(product.serviceDetails?.deliveryMode || 'online')
      setServiceDuration(product.serviceDetails?.duration || '')
      setServiceTurnaround(product.serviceDetails?.turnaround || '')
      setServiceBookingNotes(product.serviceDetails?.bookingNotes || '')
      setDownloadUrl(product.downloadableDetails?.downloadUrl || '')
      setDownloadFormat(product.downloadableDetails?.fileFormat || '')
      setDownloadSizeMb(
        product.downloadableDetails?.fileSizeMb != null
          ? String(product.downloadableDetails.fileSizeMb)
          : ''
      )
      setDownloadLicenseInfo(product.downloadableDetails?.licenseInfo || '')
    } else {
      setProductType('physical')
      setProductName('')
      setDescription('')
      setCategory('')
      setTagsText('')
      setPriceNaira('')
      setSalePriceNaira('')
      setDiscount('')
      setStock('')
      setFeatured(false)
      setFeatures([''])
      setSpecs([emptySpec()])
      setImageEntries([])
      setServiceDeliveryMode('online')
      setServiceDuration('')
      setServiceTurnaround('')
      setServiceBookingNotes('')
      setDownloadUrl('')
      setDownloadFormat('')
      setDownloadSizeMb('')
      setDownloadLicenseInfo('')
    }
  }, [open, product])

  /* ── Cleanup blob URLs ── */
  useEffect(() => {
    return () => {
      imageEntries.forEach((e) => e.preview && URL.revokeObjectURL(e.preview))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Per-step validation ── */
  const stepValidity = useMemo(() => {
    const map: Record<StepId, { ok: boolean; reason?: string }> = {
      basics:    { ok: !!productName.trim() && !!description.trim() && !!category.trim() && !!productType },
      pricing:   { ok: !!priceNaira && Number(priceNaira) > 0 },
      inventory: { ok: productType === 'physical' ? stock !== '' && Number(stock) >= 0 : true },
      media:     { ok: productType === 'physical' ? imageEntries.length > 0 : true },
      details:   {
        ok:
          productType === 'service'
            ? !!serviceDuration.trim()
            : productType === 'downloadable'
            ? !!downloadUrl.trim()
            : true,
      },
      review:    { ok: true },
    }
    if (!productName.trim()) map.basics.reason = 'Product name required'
    else if (!description.trim()) map.basics.reason = 'Description required'
    else if (!category.trim()) map.basics.reason = 'Category required'

    if (!priceNaira || Number(priceNaira) <= 0) map.pricing.reason = 'Set a valid price'
    if (productType === 'physical' && (stock === '' || Number(stock) < 0)) map.inventory.reason = 'Set stock quantity'
    if (productType === 'physical' && imageEntries.length === 0) map.media.reason = 'Add at least one image'
    if (productType === 'service' && !serviceDuration.trim()) map.details.reason = 'Add service duration'
    if (productType === 'downloadable' && !downloadUrl.trim()) map.details.reason = 'Download URL is required'

    return map
  }, [
    productName,
    description,
    category,
    productType,
    priceNaira,
    stock,
    imageEntries.length,
    serviceDuration,
    downloadUrl,
  ])

  const currentStep = STEPS[stepIndex]
  const canGoNext   = stepValidity[currentStep.id].ok
  const isLastStep  = stepIndex === STEPS.length - 1

  /* ── Navigation ── */
  const goNext = () => {
    if (!canGoNext) {
      setError(stepValidity[currentStep.id].reason || 'Please complete this step')
      return
    }
    setError('')
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  }
  const goBack = () => {
    setError('')
    setStepIndex((i) => Math.max(i - 1, 0))
  }
  const jumpTo = (i: number) => {
    // allow jumping back freely; jumping forward only if all prior steps valid
    if (i <= stepIndex) {
      setStepIndex(i); setError('')
      return
    }
    for (let k = 0; k < i; k++) {
      if (!stepValidity[STEPS[k].id].ok) {
        setError(stepValidity[STEPS[k].id].reason || 'Complete earlier steps first')
        return
      }
    }
    setStepIndex(i); setError('')
  }

  /* ── Features / specs helpers ── */
  const updateFeature = (i: number, v: string) => setFeatures(cur => cur.map((f, idx) => idx === i ? v : f))
  const addFeature    = () => setFeatures(cur => [...cur, ''])
  const removeFeature = (i: number) => setFeatures(cur => cur.filter((_, idx) => idx !== i))

  const updateSpec = (i: number, field: keyof SpecEntry, v: string) =>
    setSpecs(cur => cur.map((s, idx) => idx === i ? { ...s, [field]: v } : s))
  const addSpec    = () => setSpecs(cur => [...cur, emptySpec()])
  const removeSpec = (i: number) => setSpecs(cur => cur.filter((_, idx) => idx !== i))

  /* ── Submit ── */
  const handleSubmit = async () => {
    setError('')
    if (!user) { setError('You must be logged in.'); return }

    // Final validation sweep
    for (const step of STEPS) {
      if (!stepValidity[step.id].ok) {
        setStepIndex(STEPS.findIndex(s => s.id === step.id))
        setError(stepValidity[step.id].reason || 'Please complete all required fields')
        return
      }
    }

    setSaving(true)
    setUploading(true)
    try {
      const uploadedImages: string[] = []
      for (const entry of imageEntries) {
        if (entry.file) {
          const [url] = await uploadImagesToImgbb([entry.file])
          uploadedImages.push(url)
        } else if (entry.url) {
          uploadedImages.push(entry.url)
        }
      }
      const tags        = tagsText.split(',').map(t => t.trim()).filter(Boolean)
      const featureList = features.map(f => f.trim()).filter(Boolean)
      const specMap     = specs.reduce<Record<string, string>>((acc, item) => {
        const k = item.key.trim(); const v = item.value.trim()
        if (k && v) acc[k] = v
        return acc
      }, {})

      const payload = {
        name: productName.trim(),
        description: description.trim(),
        productType,
        price: Math.round(Number(priceNaira || '0') * 100),
        salePrice: salePriceNaira ? Math.round(Number(salePriceNaira) * 100) : undefined,
        discount: discount ? Number(discount) : undefined,
        category: category.trim(),
        tags,
        stock: productType === 'physical' ? Number(stock || '0') : 999999,
        featured,
        images: uploadedImages.length > 0 ? uploadedImages : ['https://placehold.co/1000x750?text=Product'],
        features: featureList,
        specs: specMap,
        currency: 'NGN',
        serviceDetails:
          productType === 'service'
            ? {
                deliveryMode: serviceDeliveryMode,
                duration: serviceDuration.trim() || undefined,
                turnaround: serviceTurnaround.trim() || undefined,
                bookingNotes: serviceBookingNotes.trim() || undefined,
              }
            : undefined,
        downloadableDetails:
          productType === 'downloadable'
            ? {
                downloadUrl: downloadUrl.trim() || undefined,
                fileFormat: downloadFormat.trim() || undefined,
                fileSizeMb: downloadSizeMb ? Number(downloadSizeMb) : undefined,
                licenseInfo: downloadLicenseInfo.trim() || undefined,
              }
            : undefined,
      }

      if (product) {
        const updated = await productService.update(product.id, payload)
        onUpdated?.(updated)
      } else {
        const created = await productService.create(payload)
        onCreated(created)
      }
      onClose()
    } catch (e) {
      console.error('Save product failed:', e)
      setError(e instanceof Error ? e.message : 'Failed to save product')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  if (!open) return null

  /* ── Render helpers for each step ── */
  const renderBasics = () => (
    <div className="space-y-5">
      <div>
        <Dropdown
          label="Product type *"
          options={PRODUCT_TYPE_OPTIONS}
          value={productType}
          onChange={(value) => setProductType(value as ProductType)}
          placeholder="Select product type"
        />
        <p className="text-xs text-muted-text mt-1.5">Choose whether you are listing a physical item, service, or downloadable content.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-text mb-2">Product name *</label>
        <input
          value={productName}
          onChange={e => setProductName(e.target.value)}
          autoFocus
          className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="e.g. Portable Rechargeable Fan"
        />
        <p className="text-xs text-muted-text mt-1.5">Keep it clear and short. This is what shoppers see first.</p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-text mb-2">Description *</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={5}
          className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
          placeholder="Describe the product, its uses, what's in the box…"
        />
        <p className="text-xs text-muted-text mt-1.5">{description.length} characters</p>
      </div>

      <div>
        <Dropdown
          label="Category *"
          options={availableCategories.map(cat => ({ value: cat, label: cat }))}
          value={category}
          onChange={setCategory}
          placeholder={`Select a ${PRODUCT_TYPE_LABEL[productType].toLowerCase()} category`}
        />
      </div>
    </div>
  )

  const renderPricing = () => {
    const price = Number(priceNaira || 0) * 100
    const sale  = Number(salePriceNaira || 0) * 100
    const showSavings = sale > 0 && sale < price

    return (
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-text mb-2">Price (NGN) *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-text">₦</span>
            <input
              value={priceNaira}
              onChange={e => setPriceNaira(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              autoFocus
              className="w-full rounded-xl border border-border pl-8 pr-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="68500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Sale price (NGN)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-text">₦</span>
              <input
                value={salePriceNaira}
                onChange={e => setSalePriceNaira(e.target.value)}
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-border pl-8 pr-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="60280"
              />
            </div>
            <p className="text-xs text-muted-text mt-1.5">Optional — shown as discounted price</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Discount %</label>
            <input
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              type="number"
              min="0"
              max="100"
              step="1"
              className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="12"
            />
            <p className="text-xs text-muted-text mt-1.5">Optional</p>
          </div>
        </div>

        {showSavings && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-text">Customers save </span>
              <span className="font-semibold text-green-700">{formatPrice(price - sale)}</span>
            </div>
            <span className="text-xs font-semibold text-green-700 bg-white px-2 py-1 rounded-full">
              {Math.round(((price - sale) / price) * 100)}% OFF
            </span>
          </div>
        )}
      </div>
    )
  }

  const renderInventory = () => (
    <div className="space-y-5">
      {productType === 'physical' ? (
        <div>
          <label className="block text-sm font-semibold text-text mb-2">Stock quantity *</label>
          <input
            value={stock}
            onChange={e => setStock(e.target.value)}
            type="number"
            min="0"
            step="1"
            autoFocus
            className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="75"
          />
          <p className="text-xs text-muted-text mt-1.5">How many units do you have available?</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-gray-50 px-4 py-3 text-sm text-muted-text">
          Stock tracking is optional for {PRODUCT_TYPE_LABEL[productType].toLowerCase()} listings.
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-text mb-2">Tags</label>
        <input
          value={tagsText}
          onChange={e => setTagsText(e.target.value)}
          className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="fan, rechargeable, portable"
        />
        <p className="text-xs text-muted-text mt-1.5">Comma-separated. Helps shoppers find your product.</p>
        {tagsText && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tagsText.split(',').map(t => t.trim()).filter(Boolean).map((t, i) => (
              <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-border p-4 cursor-pointer hover:border-primary/40 transition-colors">
        <input
          checked={featured}
          onChange={e => setFeatured(e.target.checked)}
          type="checkbox"
          className="h-5 w-5 mt-0.5 accent-primary"
        />
        <div>
          <span className="text-sm font-semibold text-text">Feature this product</span>
          <p className="text-xs text-muted-text mt-0.5">Featured products show up on the home page and rank higher in search.</p>
        </div>
      </label>
    </div>
  )

  const renderMedia = () => (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-text mb-2">
          Product images {productType === 'physical' ? '*' : '(optional)'}
        </label>
        <label className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-gray-50 hover:bg-gray-100 px-6 py-10 cursor-pointer transition-colors">
          <Upload className="w-8 h-8 text-gray-400" />
          <p className="text-sm font-semibold text-text">Click to upload images</p>
          <p className="text-xs text-muted-text">
            PNG, JPG up to 5MB each • Multiple files allowed
            {productType !== 'physical' ? ' • Add a cover image to improve conversion' : ''}
          </p>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={e => {
              const newFiles = Array.from(e.target.files || [])
              const entries = newFiles.map(f => ({ file: f, preview: URL.createObjectURL(f) }))
              setImageEntries(cur => [...cur, ...entries])
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {imageEntries.length > 0 && (
        <div>
          <p className="text-xs text-muted-text mb-2">
            {imageEntries.length} image{imageEntries.length > 1 ? 's' : ''} • First image is the main photo
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {imageEntries.map((entry, index) => (
              <div key={index} className="relative group rounded-2xl overflow-hidden border border-border">
                <img
                  src={entry.preview ?? entry.url}
                  alt={`Image ${index + 1}`}
                  className="h-32 w-full object-cover"
                />
                {index === 0 && (
                  <span className="absolute top-2 left-2 text-[10px] font-bold bg-primary text-white px-2 py-0.5 rounded-full">
                    MAIN
                  </span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setImageEntries(cur => {
                      if (index === 0) return cur
                      const next = cur.slice()
                      const [it] = next.splice(index, 1)
                      next.splice(index - 1, 0, it)
                      return next
                    })}
                    className="p-1.5 bg-white rounded-lg text-text hover:bg-gray-100"
                    aria-label="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageEntries(cur => {
                      if (index === cur.length - 1) return cur
                      const next = cur.slice()
                      const [it] = next.splice(index, 1)
                      next.splice(index + 1, 0, it)
                      return next
                    })}
                    className="p-1.5 bg-white rounded-lg text-text hover:bg-gray-100"
                    aria-label="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageEntries(cur => cur.filter((_, i) => i !== index))}
                    className="p-1.5 bg-white rounded-lg text-danger hover:bg-red-50"
                    aria-label="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderDetails = () => (
    <div className="space-y-6">
      {productType === 'service' && (
        <div className="space-y-4 rounded-2xl border border-border p-4">
          <h4 className="text-sm font-semibold text-text">Service details</h4>

          <Dropdown
            label="Delivery mode"
            options={[
              { value: 'online', label: 'Online' },
              { value: 'onsite', label: 'On-site' },
              { value: 'hybrid', label: 'Hybrid' },
            ]}
            value={serviceDeliveryMode}
            onChange={(value) => setServiceDeliveryMode(value as 'online' | 'onsite' | 'hybrid')}
            placeholder="Choose delivery mode"
          />

          <div>
            <label className="block text-sm font-semibold text-text mb-2">Service duration *</label>
            <input
              value={serviceDuration}
              onChange={(e) => setServiceDuration(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. 60 mins, 2 sessions, 1 week"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-2">Turnaround time</label>
            <input
              value={serviceTurnaround}
              onChange={(e) => setServiceTurnaround(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="e.g. Delivered within 48 hours"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-2">Booking notes</label>
            <textarea
              value={serviceBookingNotes}
              onChange={(e) => setServiceBookingNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Any requirements customers should know before booking"
            />
          </div>
        </div>
      )}

      {productType === 'downloadable' && (
        <div className="space-y-4 rounded-2xl border border-border p-4">
          <h4 className="text-sm font-semibold text-text">Download details</h4>

          <div>
            <label className="block text-sm font-semibold text-text mb-2">Download URL *</label>
            <input
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="https://..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-text mb-2">File format</label>
              <input
                value={downloadFormat}
                onChange={(e) => setDownloadFormat(e.target.value)}
                className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="PDF, ZIP, MP4"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-2">File size (MB)</label>
              <input
                value={downloadSizeMb}
                onChange={(e) => setDownloadSizeMb(e.target.value)}
                type="number"
                min="0"
                step="0.1"
                className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="24.5"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-text mb-2">License / usage notes</label>
            <textarea
              value={downloadLicenseInfo}
              onChange={(e) => setDownloadLicenseInfo(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="e.g. personal use only, one seat license"
            />
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-text">Features</label>
          <button
            type="button"
            onClick={addFeature}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add feature
          </button>
        </div>
        <p className="text-xs text-muted-text mb-3">Optional — list standout features (e.g. "Wireless charging").</p>
        <div className="space-y-2">
          {features.map((feature, index) => (
            <div key={`feature-${index}`} className="flex gap-2">
              <input
                value={feature}
                onChange={e => updateFeature(index, e.target.value)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="e.g. Premium quality materials"
              />
              {features.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeFeature(index)}
                  className="rounded-xl border border-border px-3 text-sm text-danger hover:bg-red-50"
                  aria-label="Remove feature"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-semibold text-text">Specifications</label>
          <button
            type="button"
            onClick={addSpec}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" /> Add spec
          </button>
        </div>
        <p className="text-xs text-muted-text mb-3">Optional — technical details (e.g. Battery → 2000 mAh).</p>
        <div className="space-y-2">
          {specs.map((spec, index) => (
            <div key={`spec-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <input
                value={spec.key}
                onChange={e => updateSpec(index, 'key', e.target.value)}
                className="rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Battery"
              />
              <input
                value={spec.value}
                onChange={e => updateSpec(index, 'value', e.target.value)}
                className="rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="2000 mAh"
              />
              {specs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSpec(index)}
                  className="rounded-xl border border-border px-3 text-sm text-danger hover:bg-red-50"
                  aria-label="Remove spec"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderReview = () => {
    const price = Number(priceNaira || 0) * 100
    const sale  = Number(salePriceNaira || 0) * 100
    const tagList = tagsText.split(',').map(t => t.trim()).filter(Boolean)
    const featureList = features.filter(f => f.trim())
    const specList = specs.filter(s => s.key.trim() && s.value.trim())

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-text">Review everything before {isEditMode ? 'saving changes' : 'publishing'}.</p>

        <div className="rounded-2xl border border-border overflow-hidden">
          {/* Main image */}
          {imageEntries[0] && (
            <img
              src={imageEntries[0].preview ?? imageEntries[0].url}
              alt={productName}
              className="w-full h-48 object-cover bg-gray-100"
            />
          )}

          <div className="p-4 space-y-4">
            <div>
              <h3 className="text-lg font-bold text-text">{productName}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-text">{category}</p>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {PRODUCT_TYPE_LABEL[productType]}
                </span>
              </div>
            </div>

            <p className="text-sm text-text leading-relaxed line-clamp-3">{description}</p>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-text">
                {formatPrice(sale > 0 ? sale : price)}
              </span>
              {sale > 0 && sale < price && (
                <span className="text-sm text-muted-text line-through">{formatPrice(price)}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-xs">
              <div>
                <span className="text-muted-text">Availability: </span>
                <span className="font-semibold text-text">
                  {productType === 'physical' ? `${stock} units` : 'Unlimited'}
                </span>
              </div>
              <div>
                <span className="text-muted-text">Images: </span>
                <span className="font-semibold text-text">{imageEntries.length}</span>
              </div>
              {featured && (
                <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                  <Sparkles className="w-3 h-3" /> Featured
                </span>
              )}
            </div>

            {tagList.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tagList.map((t, i) => (
                  <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-text">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {featureList.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-1.5">Features</p>
                <ul className="text-sm text-text space-y-0.5">
                  {featureList.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {specList.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-text uppercase tracking-wider mb-1.5">Specs</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  {specList.map((s, i) => (
                    <div key={i} className="flex justify-between border-b border-border py-1">
                      <span className="text-muted-text">{s.key}</span>
                      <span className="font-medium text-text">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {productType === 'service' && (
              <div className="rounded-xl border border-border p-3 text-xs space-y-1.5">
                <p><span className="text-muted-text">Delivery:</span> <span className="font-semibold text-text capitalize">{serviceDeliveryMode}</span></p>
                <p><span className="text-muted-text">Duration:</span> <span className="font-semibold text-text">{serviceDuration || 'Not provided'}</span></p>
                {serviceTurnaround && <p><span className="text-muted-text">Turnaround:</span> <span className="font-semibold text-text">{serviceTurnaround}</span></p>}
              </div>
            )}

            {productType === 'downloadable' && (
              <div className="rounded-xl border border-border p-3 text-xs space-y-1.5">
                <p><span className="text-muted-text">Download URL:</span> <span className="font-semibold text-text break-all">{downloadUrl || 'Not provided'}</span></p>
                {downloadFormat && <p><span className="text-muted-text">Format:</span> <span className="font-semibold text-text">{downloadFormat}</span></p>}
                {downloadSizeMb && <p><span className="text-muted-text">Size:</span> <span className="font-semibold text-text">{downloadSizeMb} MB</span></p>}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const stepContent: Record<StepId, JSX.Element> = {
    basics:    renderBasics(),
    pricing:   renderPricing(),
    inventory: renderInventory(),
    media:     renderMedia(),
    details:   renderDetails(),
    review:    renderReview(),
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-stretch sm:items-center justify-center bg-black/50 sm:p-4">
      <div className="w-full max-w-2xl bg-white sm:rounded-3xl shadow-2xl border border-border flex flex-col h-full sm:max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-text truncate">
              {isEditMode ? 'Edit Product' : 'Add New Product'}
            </h2>
            <p className="text-xs text-muted-text">
              Step {stepIndex + 1} of {STEPS.length} • {currentStep.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Stepper ── */}
        <div className="px-4 sm:px-6 pt-4 shrink-0">
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mb-3">
            <div
              className="h-full bg-primary transition-all duration-500 rounded-full"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          {/* Step pills — scrollable on mobile */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 hide-scrollbar">
            {STEPS.map((s, i) => {
              const isDone   = i < stepIndex
              const isActive = i === stepIndex
              const Icon     = s.icon
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => jumpTo(i)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold border transition-all ${
                    isActive
                      ? 'bg-primary text-white border-primary'
                      : isDone
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-white text-muted-text border-border'
                  }`}
                >
                  {isDone
                    ? <Check className="w-3.5 h-3.5" />
                    : <Icon className="w-3.5 h-3.5" />}
                  <span>{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          <div className="mb-4">
            <h3 className="text-base font-bold text-text">{currentStep.label}</h3>
            <p className="text-xs text-muted-text">{currentStep.sub}</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
              {error}
            </div>
          )}

          {stepContent[currentStep.id]}
        </div>

        {/* ── Footer / Nav ── */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-t border-border bg-gray-50 shrink-0">
          <button
            type="button"
            onClick={stepIndex === 0 ? onClose : goBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text hover:bg-gray-50"
          >
            {stepIndex === 0 ? (
              'Cancel'
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                Back
              </>
            )}
          </button>

          {!isLastStep ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || uploading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
            >
              {saving || uploading ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  {uploading ? 'Uploading…' : 'Saving…'}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {isEditMode ? 'Save Changes' : 'Publish Product'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductForm