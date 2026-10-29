export interface Section {
  id: string
  name: string
  color: string
  icon: string
  position: number
  active: boolean
}

export interface QuestionOption {
  id: string
  position: number
  image_path: string | null
  text: string | null
  is_correct: boolean
}

export interface Question {
  id: string
  section_id: string
  text: string
  audio_path: string | null
  sound_path: string | null
  position: number
  question_options: QuestionOption[]
}

export type Direction = 'bottom' | 'top' | 'left' | 'right' | 'center'
export type Effect = 'reveal' | 'cover'

export interface NoiseActivity {
  id: string
  text: string
  audio_path: string | null
  image_path: string
  direction: Direction
  effect: Effect
  position: number
}

export interface Song {
  id: string
  title: string
  audio_path: string
  position: number
}

export interface SongLine {
  id: string
  position: number
  text: string
  start_seconds: number
}
