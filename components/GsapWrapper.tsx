"use client"
import React, { useRef } from 'react'
import { usePathname } from 'next/navigation'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

export default function GsapWrapper({ children }: { children: React.ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useGSAP(() => {
    if (container.current) {
      gsap.fromTo(
        container.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
      )
    }
  }, { dependencies: [pathname] })

  return (
    <div ref={container} className="flex flex-col flex-1">
      {children}
    </div>
  )
}
