"use client"

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * PageTransition — slide-up on navigation only.
 *
 * initial={false} tells framer-motion never to animate the server-rendered
 * HTML on hydration — content is visible immediately. The animate prop still
 * runs after a route change causes the key to flip, giving the slide-up on
 * navigation without any blank flash on first load.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  )
}
