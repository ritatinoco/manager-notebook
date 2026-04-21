import { redirect } from 'next/navigation'
import { getConfig } from '@/lib/data/config'

export default function Home() {
  const config = getConfig()
  if (!config.bootstrapped) redirect('/setup')
  redirect('/dashboard')
}
