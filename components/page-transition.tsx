"use client"

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * PageTransition — wraps page content with a fade+slide-up on every navigation.
 *
 * Uses pathname as the key so motion.div remounts (triggering initial→animate)
 * on each route change. No exit animation — Next.js App Router unmounts the
 * old page immediately, so exit animations aren't reliable here.
 *
 * Duration kept at 180ms: fast enough to feel instant, long enough to feel smooth.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  )
}
