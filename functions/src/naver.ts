export async function getBlogMentionCount(
  query: string,
  clientId: string,
  clientSecret: string,
): Promise<number> {
  const url = new URL('https://openapi.naver.com/v1/search/blog.json')
  url.searchParams.set('query', query)
  url.searchParams.set('display', '1')

  const res = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  })

  if (!res.ok) return 0

  const data = (await res.json()) as { total?: number }
  return data.total ?? 0
}

async function checkExemplaryRestaurant(
  placeName: string,
  clientId: string,
  clientSecret: string,
): Promise<boolean> {
  const count = await getBlogMentionCount(
    `"${placeName}" 모범음식점`,
    clientId,
    clientSecret,
  )
  return count > 0
}

export interface BlogEnrichment {
  blogScores: Map<string, number>
  exemplaryFlags: Map<string, boolean>
}

export async function enrichWithBlogData<T extends { place_name: string }>(
  places: T[],
  clientId: string,
  clientSecret: string,
): Promise<BlogEnrichment> {
  const blogScores = new Map<string, number>()
  const exemplaryFlags = new Map<string, boolean>()
  const topPlaces = places.slice(0, 15)

  await Promise.all(
    topPlaces.map(async (place) => {
      const [mentions, isExemplary] = await Promise.all([
        getBlogMentionCount(place.place_name, clientId, clientSecret),
        checkExemplaryRestaurant(place.place_name, clientId, clientSecret),
      ])
      blogScores.set(place.place_name, mentions)
      exemplaryFlags.set(place.place_name, isExemplary)
    }),
  )

  return { blogScores, exemplaryFlags }
}
