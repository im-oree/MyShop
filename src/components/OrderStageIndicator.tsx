import { Circle, Clock3, PackageCheck, Truck, CircleOff } from 'lucide-react'
import { getOrderStageIndex, getOrderStageLabel, getOrderStageTone, normalizeOrderStage, ORDER_STAGE_SEQUENCE } from '@/utils/orderStage'

function toneClasses(tone: string) {
  switch (tone) {
    case 'amber':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'blue':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'slate':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    case 'green':
      return 'bg-green-50 text-green-700 border-green-200'
    case 'red':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function iconForStage(stage: string) {
  switch (stage) {
    case 'noted':
      return Clock3
    case 'processing':
      return PackageCheck
    case 'in_transit':
      return Truck
    case 'completed':
      return Circle
    default:
      return CircleOff
  }
}

export function OrderStageBadge({ status }: { status?: string | null }) {
  const normalized = normalizeOrderStage(status)
  const tone = getOrderStageTone(status)
  const label = getOrderStageLabel(status)
  const Icon = iconForStage(normalized)

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClasses(tone)}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      {label}
    </span>
  )
}

export function OrderStageTimeline({ status }: { status?: string | null }) {
  const activeIndex = getOrderStageIndex(status)
  const normalized = normalizeOrderStage(status)
  const isCompleted = normalized === 'completed'

  return (
    <div className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-3">
        {ORDER_STAGE_SEQUENCE.map((stage, index) => {
          const isActive = index === activeIndex
          const isDone = index < activeIndex || isCompleted
          const Icon = iconForStage(stage)
          const tone = getOrderStageTone(stage)

          return (
            <div key={stage} className="flex items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                  isActive
                    ? toneClasses(tone)
                    : isDone
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2.2} />
              </div>
              <div className="hidden sm:block">
                <p className={`text-xs font-semibold ${isActive ? 'text-text' : isDone ? 'text-green-700' : 'text-muted-text'}`}>
                  {getOrderStageLabel(stage)}
                </p>
              </div>
              {index < ORDER_STAGE_SEQUENCE.length - 1 && (
                <div className={`h-0.5 w-6 sm:w-10 rounded-full ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
