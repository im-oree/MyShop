import { Link } from 'react-router-dom'
import { Product } from '@/types'
import { formatPrice } from '@/utils'
import { useAuthStore } from '@/store/authStore'
import * as rbac from '@/utils/rbac'

interface Props {
  product: Product
  onEdit:   (p: Product) => void
  onDelete: (p: Product) => void
}

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  physical: 'Product',
  service: 'Service',
  downloadable: 'Downloadable',
}

export default function SellerProductCard({ product, onEdit, onDelete }: Props) {
  const price       = product.salePrice ?? product.price
  const hasDiscount = product.salePrice != null && product.salePrice < product.price
  const stockStatus =
    product.stock === 0   ? 'out'
    : product.stock <= 5  ? 'low'
    : 'ok'

  const { user } = useAuthStore()
  const perms = rbac.getEffectivePermissions(user)
  const canManage = rbac.hasAccess(perms.products, 'write')

  return (
    <article className="group bg-white rounded-2xl border border-border
                        flex flex-col h-full overflow-hidden
                        hover:border-gray-200 hover:shadow-md
                        transition-all duration-200">

      {/* ── Image ── */}
      <div className="relative overflow-hidden bg-gray-100">
        <img
          src={product.images?.[0] || 'https://placehold.co/800x600?text=Product'}
          alt={product.name}
          className="w-full aspect-[4/3] object-cover
                     group-hover:scale-[1.03] transition-transform duration-300"
          loading="lazy"
        />

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute top-2 left-2 bg-accent text-white
                           text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{Math.round((1 - price / product.price) * 100)}%
          </span>
        )}

        {/* Stock badge overlay */}
        {stockStatus !== 'ok' && (
          <span className={`absolute top-2 right-2 text-[10px] font-bold
                            px-2 py-0.5 rounded-full
                            ${stockStatus === 'out'
                              ? 'bg-red-500 text-white'
                              : 'bg-amber-400 text-white'}`}>
            {stockStatus === 'out' ? 'Out of stock' : `Only ${product.stock} left`}
          </span>
        )}

        {/* Featured badge */}
        {product.featured && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1
                           bg-white/90 backdrop-blur-sm text-blue-600
                           text-[10px] font-bold px-2 py-0.5 rounded-full
                           border border-blue-100">
            ⭐ Featured
          </span>
        )}
      </div>

      {/* ── Body ── */}
      <div className="p-3 flex-1 flex flex-col gap-2.5">

        {/* Name + price */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text truncate leading-tight">
              {product.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <p className="text-[11px] text-muted-text truncate">
                {product.category}
              </p>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary whitespace-nowrap">
                {PRODUCT_TYPE_LABEL[product.productType || 'physical'] || 'Product'}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-accent leading-tight">
              {formatPrice(price)}
            </p>
            {hasDiscount && (
              <p className="text-[10px] text-muted-text line-through leading-tight">
                {formatPrice(product.price)}
              </p>
            )}
          </div>
        </div>

        {/* Stock bar (only when in stock) */}
        {product.stock > 0 && (
          <div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-muted-text">Stock</span>
              <span className={`font-semibold
                ${stockStatus === 'low' ? 'text-amber-600' : 'text-green-600'}`}>
                {product.stock} units
              </span>
            </div>
            <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500
                  ${stockStatus === 'low' ? 'bg-amber-400' : 'bg-green-500'}`}
                style={{ width: `${Math.min((product.stock / 50) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── Actions ── */}
        {/* Primary row: Edit + View */}
        <div className="grid grid-cols-2 gap-1.5">
          {canManage ? (
            <button
              onClick={() => onEdit(product)}
              className="flex items-center justify-center gap-1.5
                         bg-primary/5 text-primary border border-primary/20
                         px-3 py-2 rounded-xl text-xs font-semibold
                         hover:bg-primary/10 active:scale-[0.97]
                         transition-all duration-150"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none"
                   stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0
                     002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828
                     15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
          ) : (
            <div />
          )}

          <Link
            to={`/products/${product.id}`}
            className="flex items-center justify-center gap-1.5
                       bg-gray-50 text-text border border-border
                       px-3 py-2 rounded-xl text-xs font-semibold
                       hover:bg-gray-100 active:scale-[0.97]
                       transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none"
                 stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268
                   2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477
                   0-8.268-2.943-9.542-7z" />
            </svg>
            View
          </Link>
        </div>

        {/* Secondary row: Delete (full width, subtle) */}
        {canManage && (
          <button
            onClick={() => onDelete(product)}
            className="flex items-center justify-center gap-1.5 w-full
                       bg-white text-red-400 border border-red-100
                       px-3 py-1.5 rounded-xl text-xs font-medium
                       hover:bg-red-50 hover:text-red-600 hover:border-red-200
                       active:scale-[0.97] transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none"
                 stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0
                   01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0
                   00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete listing
          </button>
        )}
      </div>
    </article>
  )
}