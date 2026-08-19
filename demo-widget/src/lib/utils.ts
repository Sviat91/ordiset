import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Vite's `base` config only rewrites asset URLs it processes itself
// (bundled imports, index.html tags) — it does not rewrite hardcoded
// root-absolute strings like '/logo.png' pointing at files in `public/`.
// Routing those through BASE_URL keeps them correct when this app is
// embedded at a sub-path instead of served from the domain root.
export function asset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
}
