import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { BarChart3, Home, LayoutDashboard, PackageSearch, Search, Shield, ShoppingBag, UserRound } from 'lucide-react'

const footerSections = [
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Contact', href: '#' },
      { label: 'FAQ', href: '#' },
      { label: 'Shipping', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
      { label: 'Cookies', href: '#' },
    ],
  },
]

function Footer() {
  const location = useLocation()
  const { currentRole } = useAuthStore()

  const getMobileLinks = () => {
    if (currentRole === 'seller') {
      return [
        { to: '/seller/shop', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/seller/products', label: 'Products', icon: PackageSearch },
        { to: '/seller/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/profile', label: 'Profile', icon: UserRound },
      ]
    }
    if (currentRole === 'admin') {
      return [
        { to: '/', label: 'Home', icon: Home },
        { to: '/products', label: 'Search', icon: Search },
        { to: '/admin', label: 'Admin', icon: Shield },
        { to: '/profile', label: 'Profile', icon: UserRound },
      ]
    }
    return [
      { to: '/', label: 'Home', icon: Home },
      { to: '/products', label: 'Search', icon: Search },
      { to: '/orders', label: 'Orders', icon: ShoppingBag },
      { to: '/profile', label: 'Profile', icon: UserRound },
    ]
  }
  const mobileLinks = getMobileLinks()

  return (
    <>
      <footer className="bg-primary text-white mt-auto hidden md:block">
        <div className="container mx-auto px-4 py-10 sm:py-12">
          {/* Top section */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:gap-12">
            {/* Brand - full width on smallest screens */}
            <div className="col-span-2 sm:col-span-1 mb-4 sm:mb-0">
              <Link to="/" className="inline-block group">
                <h3 className="text-2xl font-bold tracking-tight group-hover:text-green-300 transition-base">
                  eShop
                </h3>
              </Link>
              <p className="mt-3 text-sm leading-relaxed text-gray-300 max-w-xs">
                Your trusted online marketplace for quality products at the best prices.
              </p>
              {/* Social icons row */}
              <div className="flex items-center gap-3 mt-5">
                {['twitter', 'github', 'instagram'].map((social) => (
                  <a
                    key={social}
                    href="#"
                    aria-label={social}
                    className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center
                               hover:bg-white/20 active:scale-95 transition-base"
                  >
                    <span className="text-xs font-medium uppercase tracking-wider">
                      {social[0]}
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {footerSections.map((section) => (
              <div key={section.title}>
                <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3 sm:mb-4">
                  {section.title}
                </h4>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-gray-300 hover:text-white hover:translate-x-0.5
                                   inline-block transition-base"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-400 text-center sm:text-left">
              © {new Date().getFullYear()} eShop. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              Built with ❤️ for great shopping
            </p>
          </div>
        </div>
      </footer>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white/95 backdrop-blur-md">
        <div className={`grid gap-1 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 ${mobileLinks.length === 4 ? 'grid-cols-4' : 'grid-cols-4'}`}>
          {mobileLinks.map((link) => {
            const active = location.pathname === link.to
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-all ${active ? 'text-primary bg-primary/5' : 'text-muted-text hover:text-text'}`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </div>
        {/* Mobile mode indicator removed per design — lever in header handles switching */}
      </nav>
    </>
  )
}

export default Footer