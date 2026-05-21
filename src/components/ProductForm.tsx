import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuthStore } from '@/store/authStore'
import { productService } from '@/services/productService'
import { uploadImagesToImgbb } from '@/services/imgbbService'
import { PRODUCT_CATEGORIES } from '@/constants/categories'
import Dropdown from './Dropdown'
import type { Product } from '@/types'

interface ProductFormProps {
  open: boolean
  onClose: () => void
  onCreated: (product: Product) => void
  product?: Product | null
  onUpdated?: (product: Product) => void
}

type SpecEntry = { key: string; value: string }

const emptySpec = (): SpecEntry => ({ key: '', value: '' })

function ProductForm({ open, onClose, onCreated, product, onUpdated }: ProductFormProps) {
  const { user } = useAuthStore()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [imageEntries, setImageEntries] = useState<Array<{url?: string; file?: File; preview?: string}>>([])
  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tagsText, setTagsText] = useState('')
  const [priceNaira, setPriceNaira] = useState('')
  const [salePriceNaira, setSalePriceNaira] = useState('')
  const [discount, setDiscount] = useState('')
  const [stock, setStock] = useState('')
  const [featured, setFeatured] = useState(false)
  const [features, setFeatures] = useState<string[]>([''])
  const [specs, setSpecs] = useState<SpecEntry[]>([emptySpec()])

  useEffect(() => {
    if (!open) return
    setError('')
    setSaving(false)
    setUploading(false)

    // If editing existing product, populate fields
    if (product) {
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

      // build image entries preserving order
      setImageEntries((product.images || []).map((url) => ({ url })))
    } else {
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
    }
  }, [open, product])

  useEffect(() => {
    // cleanup previews for entries with file
    return () => {
      imageEntries.forEach((e) => {
        if (e.preview) URL.revokeObjectURL(e.preview)
      })
    }
  }, [imageEntries])

  if (!open) return null

  const updateFeature = (index: number, value: string) => {
    setFeatures((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  const addFeature = () => setFeatures((current) => [...current, ''])
  const removeFeature = (index: number) => setFeatures((current) => current.filter((_, itemIndex) => itemIndex !== index))

  const updateSpec = (index: number, field: keyof SpecEntry, value: string) => {
    setSpecs((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))
  }

  const addSpec = () => setSpecs((current) => [...current, emptySpec()])
  const removeSpec = (index: number) => setSpecs((current) => current.filter((_, itemIndex) => itemIndex !== index))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')

    if (!user) {
      setError('You must be logged in.')
      return
    }

    if (!productName.trim() || !description.trim() || !category.trim()) {
      setError('Name, description, and category are required.')
      return
    }

    if (imageEntries.length === 0) {
      setError('Please add at least one product image.')
      return
    }

    setSaving(true)
    setUploading(true)

    try {
      // Prepare images in order: upload entries that have file, keep existing urls
      setUploading(true)
      const uploadQueue = imageEntries
      const uploadedImages: string[] = []
      for (const entry of uploadQueue) {
        if (entry.file) {
          const [url] = await uploadImagesToImgbb([entry.file])
          uploadedImages.push(url)
        } else if (entry.url) {
          uploadedImages.push(entry.url)
        }
      }
      const tags = tagsText.split(',').map((tag) => tag.trim()).filter(Boolean)
      const featureList = features.map((feature) => feature.trim()).filter(Boolean)
      const specMap = specs.reduce<Record<string, string>>((acc, item) => {
        const key = item.key.trim()
        const value = item.value.trim()
        if (key && value) {
          acc[key] = value
        }
        return acc
      }, {})

      const payload = {
        name: productName.trim(),
        description: description.trim(),
        price: Math.round(Number(priceNaira || '0') * 100),
        salePrice: salePriceNaira ? Math.round(Number(salePriceNaira) * 100) : undefined,
        discount: discount ? Number(discount) : undefined,
        category: category.trim(),
        tags,
        stock: Number(stock || '0'),
        featured,
        images: uploadedImages,
        features: featureList,
        specs: specMap,
        sellerName: user.sellerProfile?.shopName || user.name,
        currency: 'NGN',
      }

      if (product) {
        const updated = await productService.update(product.id, payload)
        onUpdated?.(updated)
        onClose()
      } else {
        const created = await productService.create(payload)
        onCreated(created)
        onClose()
      }
    } catch (submitError) {
      console.error('Create product failed:', submitError)
      setError(submitError instanceof Error ? submitError.message : 'Failed to create product')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-border">
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-text">Add Product</h2>
              <p className="text-sm text-muted-text mt-1">Upload multiple images and save the same shape used in Firestore seed data.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-text hover:bg-gray-50">
              Close
            </button>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text mb-2">Product name</label>
                <input value={productName} onChange={(event) => setProductName(event.target.value)} className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" placeholder="Portable Rechargeable Fan" />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-2">Description</label>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={6} className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" placeholder="Write a detailed description..." />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Dropdown
                  label="Category"
                  options={PRODUCT_CATEGORIES.map((cat) => ({
                    value: cat,
                    label: cat,
                  }))}
                  value={category}
                  onChange={setCategory}
                  placeholder="Select a category"
                  error={!category && productName ? 'Category is required' : ''}
                />
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Tags</label>
                  <input value={tagsText} onChange={(event) => setTagsText(event.target.value)} className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" placeholder="fan, rechargeable, portable" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Price (NGN)</label>
                  <input value={priceNaira} onChange={(event) => setPriceNaira(event.target.value)} type="number" min="0" step="0.01" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" placeholder="68500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Sale price (NGN)</label>
                  <input value={salePriceNaira} onChange={(event) => setSalePriceNaira(event.target.value)} type="number" min="0" step="0.01" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" placeholder="60280" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Discount %</label>
                  <input value={discount} onChange={(event) => setDiscount(event.target.value)} type="number" min="0" max="100" step="1" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" placeholder="12" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Stock</label>
                  <input value={stock} onChange={(event) => setStock(event.target.value)} type="number" min="0" step="1" className="w-full rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" placeholder="75" />
                </div>
                <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 self-end">
                  <input checked={featured} onChange={(event) => setFeatured(event.target.checked)} type="checkbox" className="h-4 w-4" />
                  <span className="text-sm font-medium text-text">Feature this product</span>
                </label>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-text mb-2">Product images</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(event) => {
                    const newFiles = Array.from(event.target.files || [])
                    const entries = newFiles.map((f) => ({ file: f as File, preview: URL.createObjectURL(f) }))
                    setImageEntries((cur) => [...cur, ...entries])
                  }}
                  className="block w-full rounded-xl border border-border px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white"
                />
                <p className="text-xs text-muted-text mt-2">Select multiple files. They will be uploaded to IMGBB before saving the product. You can remove or reorder images below.</p>
              </div>

              {imageEntries.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {imageEntries.map((entry, index) => (
                    <div key={index} className="relative">
                      <img src={entry.preview ?? entry.url} alt={`Image ${index + 1}`} className="h-32 w-full rounded-2xl object-cover border border-border" />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button type="button" onClick={() => {
                          setImageEntries((cur) => {
                            const next = cur.slice()
                            next.splice(index, 1)
                            return next
                          })
                        }} className="bg-white/80 rounded-md px-2 py-1 text-xs text-danger">Remove</button>
                        <button type="button" onClick={() => setImageEntries((cur) => {
                          if (index === 0) return cur
                          const next = cur.slice()
                          const [item] = next.splice(index, 1)
                          next.splice(index - 1, 0, item)
                          return next
                        })} className="bg-white/80 rounded-md px-2 py-1 text-xs">Up</button>
                        <button type="button" onClick={() => setImageEntries((cur) => {
                          if (index === cur.length - 1) return cur
                          const next = cur.slice()
                          const [item] = next.splice(index, 1)
                          next.splice(index + 1, 0, item)
                          return next
                        })} className="bg-white/80 rounded-md px-2 py-1 text-xs">Down</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text">Features</label>
                  <button type="button" onClick={addFeature} className="text-sm font-medium text-secondary hover:underline">+ Add feature</button>
                </div>
                <div className="space-y-2">
                  {features.map((feature, index) => (
                    <div key={`feature-${index}`} className="flex gap-2">
                      <input value={feature} onChange={(event) => updateFeature(index, event.target.value)} className="flex-1 rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" placeholder="Premium quality materials" />
                      {features.length > 1 && (
                        <button type="button" onClick={() => removeFeature(index)} className="rounded-xl border border-border px-3 text-sm text-danger hover:bg-red-50">Remove</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-text">Specs</label>
                  <button type="button" onClick={addSpec} className="text-sm font-medium text-secondary hover:underline">+ Add spec</button>
                </div>
                <div className="space-y-2">
                  {specs.map((spec, index) => (
                    <div key={`spec-${index}`} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <input value={spec.key} onChange={(event) => updateSpec(index, 'key', event.target.value)} className="rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" placeholder="Battery" />
                      <input value={spec.value} onChange={(event) => updateSpec(index, 'value', event.target.value)} className="rounded-xl border border-border px-4 py-3 outline-none focus:border-primary" placeholder="2000 mAh" />
                      {specs.length > 1 && (
                        <button type="button" onClick={() => removeSpec(index)} className="rounded-xl border border-border px-3 text-sm text-danger hover:bg-red-50">Remove</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border pt-5">
            <button type="button" onClick={onClose} className="rounded-xl border border-border px-5 py-3 text-sm font-medium text-text hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving || uploading} className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60">
              {saving || uploading ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductForm
