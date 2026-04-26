import type { MetadataRoute } from 'next'

const BASE_URL = 'https://sentrixchain.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: `${BASE_URL}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/docs/faucet`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
