export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-5 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{children}</h3>
}

export function CardValue({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-2xl font-bold text-gray-900 ${className}`}>{children}</p>
}
