export type Direction = 'bottom' | 'top' | 'left' | 'right' | 'center'
export type Effect = 'reveal' | 'cover'
export type Origin = 'own' | 'public_domain' | 'licensed'

export interface Section {
  id: string
  name: string
  color: string
  icon: string
  position: number
  active: boolean
}

export interface QuestionRow {
  id: string
  section_id: string
  text: string
  audio_path: string | null
  sound_path: string | null
  position: number
  published: boolean
}

export interface OptionRow {
  id: string
  question_id: string
  position: number
  image_path: string | null
  text: string | null
  is_correct: boolean
}

export interface NoiseRow {
  id: string
  text: string
  audio_path: string | null
  image_path: string
  direction: Direction
  effect: Effect
  position: number
  published: boolean
}

export interface SongRow {
  id: string
  title: string
  audio_path: string
  origin: Origin
  position: number
  published: boolean
}

export interface SongLineRow {
  id: string
  song_id: string
  position: number
  text: string
  start_seconds: number
}
