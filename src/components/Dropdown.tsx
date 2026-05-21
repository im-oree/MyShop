import { useEffect, useRef, useState } from 'react'

export interface DropdownOption {
  value: string
  label: string
}

export interface DropdownProps {
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  error?: string
  multiple?: boolean
  onMultipleChange?: (values: string[]) => void
  selectedValues?: string[]
  className?: string
  buttonClassName?: string
  menuClassName?: string
  optionClassName?: string
  searchable?: boolean
}

function Dropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  label,
  disabled = false,
  error,
  multiple = false,
  onMultipleChange,
  selectedValues = [],
  className = '',
  buttonClassName = '',
  menuClassName = '',
  optionClassName = '',
  searchable = true,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      inputRef.current?.focus()
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  const displayValue = !multiple
    ? options.find((opt) => opt.value === value)?.label || placeholder
    : selectedValues.length > 0
      ? `${selectedValues.length} selected`
      : placeholder

  const handleSelect = (optValue: string) => {
    if (multiple && onMultipleChange) {
      const updated = selectedValues.includes(optValue)
        ? selectedValues.filter((v) => v !== optValue)
        : [...selectedValues, optValue]
      onMultipleChange(updated)
    } else {
      onChange(optValue)
      setIsOpen(false)
      setSearch('')
    }
  }

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-text mb-2">{label}</label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between transition-all duration-200 ${
            error
              ? 'border-red-300 bg-red-50'
              : isOpen
                ? 'border-primary bg-primary/5'
                : 'border-border bg-white'
          } ${
            disabled
              ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'hover:border-gray-300 cursor-pointer'
          } ${buttonClassName}`}
        >
          <span className={`text-sm ${value || selectedValues.length > 0 ? 'text-text' : 'text-gray-400'}`}>
            {displayValue}
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && !disabled && (
          <div className={`absolute top-full left-0 right-0 mt-2 z-50 rounded-xl border border-border bg-white shadow-lg animate-fade-in ${menuClassName}`}>
            {searchable && options.length > 5 && (
              <div className="border-b border-border p-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-3 py-2 rounded-lg border border-border outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm"
                />
              </div>
            )}

            <ul className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = multiple
                    ? selectedValues.includes(opt.value)
                    : value === opt.value

                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 transition-colors duration-150 ${
                          isSelected
                            ? 'bg-primary/10 text-primary'
                            : 'text-text hover:bg-gray-50'
                        } ${optionClassName}`}
                      >
                        {multiple && (
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-primary border-primary'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        )}
                        <span className="flex-1">{opt.label}</span>
                        {!multiple && isSelected && (
                          <svg
                            className="w-4 h-4 text-primary"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </button>
                    </li>
                  )
                })
              ) : (
                <li className="px-4 py-6 text-center text-sm text-muted-text">
                  No options found
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  )
}

export default Dropdown
