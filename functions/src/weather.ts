import type { WeatherInfo } from './types'

export async function fetchWeather(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<WeatherInfo | null> {
  const url = new URL('https://api.openweathermap.org/data/2.5/weather')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('appid', apiKey)
  url.searchParams.set('units', 'metric')
  url.searchParams.set('lang', 'kr')

  const res = await fetch(url.toString())
  if (!res.ok) return null

  const data = (await res.json()) as {
    main?: { temp?: number; feels_like?: number }
    weather?: Array<{ description?: string }>
  }

  return {
    temp: data.main?.temp ?? 20,
    feelsLike: data.main?.feels_like ?? data.main?.temp ?? 20,
    description: data.weather?.[0]?.description ?? '맑음',
  }
}

export function buildWeatherComment(weather: WeatherInfo | null): string | null {
  if (!weather) return null
  return `현재 ${Math.round(weather.temp)}°C (${weather.description})`
}
