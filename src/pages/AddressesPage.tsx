import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { addressService } from '@/services/authService'

function AddressesPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [addresses, setAddresses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ street: '', city: '', state: '', zipCode: '', country: 'Nigeria', isDefault: false, phone: '', whatsapp: '' })

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    loadAddresses()
  }, [isAuthenticated, navigate])

  const loadAddresses = async () => {
    try {
      setLoading(true)
      const data = await addressService.getAll()
      setAddresses(data || [])
    } catch (err) {
      console.error('Failed to load addresses:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAddress = async () => {
    if (!form.street || !form.city || !form.state || !form.zipCode || !form.phone) {
      alert('Please fill all required fields (including phone)')
      return
    }
    try {
      await addressService.add(form)
      setForm({ street: '', city: '', state: '', zipCode: '', country: 'Nigeria', isDefault: false, phone: '', whatsapp: '' })
      setShowForm(false)
      await loadAddresses()
    } catch (err) {
      alert('Failed to add address')
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (confirm('Delete this address?')) {
      try {
        await addressService.delete(id)
        await loadAddresses()
      } catch (err) {
        alert('Failed to delete address')
      }
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Shipping Addresses</h1>
      {loading && <div>Loading...</div>}
      <div className="space-y-3 mb-6">
        {addresses.map(addr => (
          <div key={addr.id} className="bg-card p-4 rounded border flex justify-between items-start">
            <div>
              <div className="font-medium">{addr.street}</div>
              <div className="text-sm text-muted-text">{addr.city}, {addr.state} {addr.zipCode}</div>
              <div className="text-sm">Phone: {addr.phone}</div>
              {addr.whatsapp && <div className="text-sm text-muted-text">WhatsApp: {addr.whatsapp}</div>}
            </div>
            <button
              onClick={() => handleDeleteAddress(addr.id)}
              className="text-danger text-sm hover:underline"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="bg-secondary text-white px-4 py-2 rounded font-medium"
        >
          Add New Address
        </button>
      )}
      {showForm && (
        <div className="bg-card p-4 rounded mb-4">
          <input
            type="text"
            placeholder="Street"
            value={form.street}
            onChange={e => setForm({ ...form, street: e.target.value })}
            className="block w-full p-2 border rounded mb-2"
          />
          <input
            type="text"
            placeholder="City"
            value={form.city}
            onChange={e => setForm({ ...form, city: e.target.value })}
            className="block w-full p-2 border rounded mb-2"
          />
          <input
            type="text"
            placeholder="State"
            value={form.state}
            onChange={e => setForm({ ...form, state: e.target.value })}
            className="block w-full p-2 border rounded mb-2"
          />
          <input
            type="text"
            placeholder="Zip Code"
            value={form.zipCode}
            onChange={e => setForm({ ...form, zipCode: e.target.value })}
            className="block w-full p-2 border rounded mb-2"
          />
          <input
            type="tel"
            placeholder="Phone (required)"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="block w-full p-2 border rounded mb-2"
            required
          />
          <input
            type="tel"
            placeholder="WhatsApp number (optional)"
            value={form.whatsapp}
            onChange={e => setForm({ ...form, whatsapp: e.target.value })}
            className="block w-full p-2 border rounded mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddAddress}
              className="bg-secondary text-white px-4 py-2 rounded font-medium flex-1"
            >
              Save Address
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="bg-muted-text text-white px-4 py-2 rounded font-medium flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AddressesPage
