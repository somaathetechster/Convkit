import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { ConvkitRecording, RecordedMessage, ConvkitUser } from '@convkit/protocol'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const RECORDINGS_DIR = path.join(__dirname, '..', '..', '..', '..', 'recordings')

fs.mkdirSync(RECORDINGS_DIR, { recursive: true })

const active = new Map<string, ConvkitRecording>()

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

function recordingPath(id: string): string {
  return path.join(RECORDINGS_DIR, `${id}.json`)
}

export function startRecording(name: string, user: ConvkitUser, sessionId: string): ConvkitRecording {
  const recording: ConvkitRecording = {
    id: `rec_${generateId()}`,
    name,
    createdAt: new Date().toISOString(),
    user,
    sessionId,
    messages: []
  }
  active.set(sessionId, recording)
  return recording
}

export function stopRecording(sessionId: string): ConvkitRecording | null {
  const recording = active.get(sessionId)
  if (!recording) return null
  active.delete(sessionId)
  fs.writeFileSync(recordingPath(recording.id), JSON.stringify(recording, null, 2))
  return recording
}

export function addMessageToRecording(sessionId: string, message: RecordedMessage): void {
  const recording = active.get(sessionId)
  if (!recording) return
  recording.messages.push(message)
}

export function isRecording(sessionId: string): boolean {
  return active.has(sessionId)
}

export function getActiveRecording(sessionId: string): ConvkitRecording | undefined {
  return active.get(sessionId)
}

export function listRecordings(): ConvkitRecording[] {
  let files: string[]
  try {
    files = fs.readdirSync(RECORDINGS_DIR).filter(f => f.endsWith('.json'))
  } catch {
    return []
  }

  const recordings: ConvkitRecording[] = []
  for (const file of files) {
    try {
      recordings.push(JSON.parse(fs.readFileSync(path.join(RECORDINGS_DIR, file), 'utf8')) as ConvkitRecording)
    } catch {
      continue
    }
  }

  return recordings.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function getRecording(id: string): ConvkitRecording | null {
  try {
    return JSON.parse(fs.readFileSync(recordingPath(id), 'utf8')) as ConvkitRecording
  } catch {
    return null
  }
}

export function deleteRecording(id: string): boolean {
  try {
    fs.unlinkSync(recordingPath(id))
    return true
  } catch {
    return false
  }
}
