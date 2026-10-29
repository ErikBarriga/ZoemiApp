import { supabase } from './supabase'
import type { NoiseActivity, Question, Section, Song, SongLine } from '../types'

const PREFIX = 'zoemi:cache:'

/**
 * Intenta leer de internet; si falla (sin conexión o proyecto en pausa),
 * usa la última copia guardada en el dispositivo.
 */
async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  try {
    const data = await load()
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(data))
    } catch {
      /* almacenamiento lleno o bloqueado: se ignora */
    }
    return data
  } catch (err) {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw) return JSON.parse(raw) as T
    throw err
  }
}

export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
}

export function getSections(): Promise<Section[]> {
  return cached('sections', async () => {
    const { data, error } = await supabase
      .from('sections')
      .select('id,name,color,icon,position,active')
      .eq('active', true)
      .order('position')
    if (error) throw error
    return (data ?? []) as Section[]
  })
}

export function getQuestions(sectionId: string): Promise<Question[]> {
  return cached('questions:' + sectionId, async () => {
    const { data, error } = await supabase
      .from('questions')
      .select(
        'id,section_id,text,audio_path,sound_path,position,question_options(id,position,image_path,text,is_correct)'
      )
      .eq('section_id', sectionId)
      .eq('published', true)
      .order('position')
    if (error) throw error
    return (data ?? []) as Question[]
  })
}

export function getNoiseActivities(): Promise<NoiseActivity[]> {
  return cached('noise', async () => {
    const { data, error } = await supabase
      .from('noise_activities')
      .select('id,text,audio_path,image_path,direction,effect,position')
      .eq('published', true)
      .order('position')
    if (error) throw error
    return (data ?? []) as NoiseActivity[]
  })
}

export function getSongs(): Promise<Song[]> {
  return cached('songs', async () => {
    const { data, error } = await supabase
      .from('songs')
      .select('id,title,audio_path,position')
      .eq('published', true)
      .order('position')
    if (error) throw error
    return (data ?? []) as Song[]
  })
}

export function getSong(songId: string): Promise<{ song: Song; lines: SongLine[] }> {
  return cached('song:' + songId, async () => {
    const [songRes, linesRes] = await Promise.all([
      supabase
        .from('songs')
        .select('id,title,audio_path,position')
        .eq('id', songId)
        .eq('published', true)
        .single(),
      supabase
        .from('song_lines')
        .select('id,position,text,start_seconds')
        .eq('song_id', songId)
        .order('position')
    ])
    if (songRes.error) throw songRes.error
    if (linesRes.error) throw linesRes.error
    const lines = (linesRes.data ?? []).map((l) => ({
      ...l,
      start_seconds: Number(l.start_seconds)
    })) as SongLine[]
    return { song: songRes.data as Song, lines }
  })
}

const prefetched = new Set<string>()

/**
 * Descarga audios e imágenes por adelantado para que el service worker los
 * guarde y la actividad funcione sin conexión. Es "mejor esfuerzo".
 */
export async function prefetchMedia(urls: Array<string | null | undefined>): Promise<void> {
  const pending = urls.filter((u): u is string => Boolean(u) && !prefetched.has(u as string))
  pending.forEach((u) => prefetched.add(u))
  const worker = async () => {
    for (;;) {
      const next = pending.shift()
      if (!next) return
      try {
        await fetch(next, { mode: 'cors' })
      } catch {
        prefetched.delete(next)
      }
    }
  }
  await Promise.all([worker(), worker(), worker()])
}
