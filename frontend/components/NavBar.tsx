'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'SCIM Validator' },
  { href: '/entra', label: 'Entra Simulation' },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-800 bg-gray-900/60 backdrop-blur sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 flex items-center gap-1 h-12">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-4">SCIM Tools</span>
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded text-sm transition ${
                active
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
