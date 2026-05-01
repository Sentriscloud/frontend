import type { MetadataRoute } from 'next'
import { routing } from '../../i18n/routing'

const BASE_URL = 'https://sentrixchain.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  const entries: MetadataRoute.Sitemap = []

  for (const locale of routing.locales) {
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    })
    entries.push({
      url: `${BASE_URL}/${locale}/docs/faucet`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    })
    entries.push({
      url: `${BASE_URL}/${locale}/docs/tokenomics`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    })
  }

  return entries
}
