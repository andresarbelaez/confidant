import type { MouseEvent } from 'react'

export function scrollToHash(e: MouseEvent<HTMLAnchorElement>, hash: string) {
  const el = document.getElementById(hash.replace('#', ''))
  if (el) {
    e.preventDefault()
    el.scrollIntoView({ behavior: 'smooth' })
    window.history.pushState(null, '', hash)
  }
}
