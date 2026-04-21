import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/nav/Sidebar'

export const metadata: Metadata = {
  title: 'Capacity Planner',
  description: 'Sprint capacity planning for Client Runtime',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </body>
    </html>
  )
}
