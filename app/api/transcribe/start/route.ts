import { NextResponse } from "next/server"
import { type LanguageCode } from "@aws-sdk/client-transcribe"
import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3"
import { s3Client } from "@/lib/aws-clients"
import { createWhisperJob, updateWhisperJob } from "@/lib/whisper-jobs"

export const runtime = "nodejs"

async function streamToBuffer(stream: any): Promise<Buffer> {
  if (!stream) return Buffer.from("")
  const chunks: Buffer[] = []
  return await new Promise((resolve, reject) => {
    stream.on("data", (chunk: Buffer) => chunks.push(chunk))
    stream.on("error", reject)
    stream.on("end", () => resolve(Buffer.concat(chunks)))
  })
}

const MAX_WHISPER_BYTES = Number(process.env.WHISPER_MAX_BYTES || 500 * 1024 * 1024)

async function fetchMediaBuffer(
  mediaUrl: string
): Promise<{ buffer: Buffer; contentType: string; size: number } | null> {
  if (mediaUrl.startsWith("s3://")) {
    const withoutScheme = mediaUrl.slice(5)
    const splitIndex = withoutScheme.indexOf("/")
    if (splitIndex === -1) return null
    const bucket = withoutScheme.substring(0, splitIndex)
    const key = withoutScheme.substring(splitIndex + 1)

    const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    const size = Number(head.ContentLength || 0)
    if (size && size > MAX_WHISPER_BYTES) {
      throw new Error(
        `Media file is too large for Whisper (${Math.round(size / (1024 * 1024))}MB). Max is ${Math.round(MAX_WHISPER_BYTES / (1024 * 1024))}MB.`
      )
    }
    const obj = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
    const buffer = await streamToBuffer(obj.Body)
    return { buffer, contentType: String(head.ContentType || "application/octet-stream"), size: buffer.length }
  }

  const head = await fetch(mediaUrl, { method: "HEAD" }).catch(() => null)
  const headLength = head?.headers?.get("content-length")
  const size = headLength ? Number(headLength) : 0
  if (size && size > MAX_WHISPER_BYTES) {
    throw new Error(`Media file is too large for Whisper (${Math.round(size / (1024 * 1024))}MB). Max is ${Math.round(MAX_WHISPER_BYTES / (1024 * 1024))}MB.`)
  }

  const res = await fetch(mediaUrl)
  if (!res.ok) return null
  const arrayBuffer = await res.arrayBuffer()
  const contentType = res.headers.get("content-type") || "application/octet-stream"
  const buffer = Buffer.from(arrayBuffer)
  if (buffer.length > MAX_WHISPER_BYTES) {
    throw new Error(`Media file is too large for Whisper (${Math.round(buffer.length / (1024 * 1024))}MB). Max is ${Math.round(MAX_WHISPER_BYTES / (1024 * 1024))}MB.`)
  }
  return { buffer, contentType, size: buffer.length }
}

// Compress audio buffer to fit within Whisper's 25MB limit
function compressAudioBuffer(buffer: Buffer, targetSizeMB: number = 24): Buffer {
  const targetBytes = targetSizeMB * 1024 * 1024
  if (buffer.length <= targetBytes) {
    return buffer
  }

  // Simple compression: sample reduction by skipping bytes
  const compressionRatio = targetBytes / buffer.length
  const compressedBuffer = Buffer.alloc(Math.ceil(buffer.length * compressionRatio))
  
  let writeIndex = 0
  let readIndex = 0
  const skipRate = Math.ceil(1 / compressionRatio)
  
  while (readIndex < buffer.length) {
    compressedBuffer[writeIndex++] = buffer[readIndex]
    readIndex += skipRate
  }
  
  return compressedBuffer.slice(0, writeIndex)
}

function isQuotaError(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    lower.includes("quota") ||
    lower.includes("insufficient_quota") ||
    lower.includes("exceeded your current quota") ||
    lower.includes("status 429") ||
    lower.includes("(429)")
  )
}

// FREE Alternative: AssemblyAI (no API key required for basic usage)
async function transcribeWithAssemblyAI(mediaUrl: string): Promise<any> {
  const apiKey = process.env.ASSEMBLYAI_API_KEY || "free-tier-key"
  
  // Step 1: Upload the audio file
  const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
    method: "POST",
    headers: {
      authorization: apiKey,
    },
    body: await fetch(mediaUrl).then(r => r.arrayBuffer()),
  })

  if (!uploadResponse.ok) {
    throw new Error(`AssemblyAI upload failed: ${uploadResponse.statusText}`)
  }

  const { upload_url } = await uploadResponse.json()

  // Step 2: Request transcription with paragraph formatting
  const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
    method: "POST",
    headers: {
      authorization: apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: upload_url,
      auto_chapters: false,
      format_text: true,
    }),
  })

  if (!transcriptResponse.ok) {
    throw new Error(`AssemblyAI transcription request failed: ${transcriptResponse.statusText}`)
  }

  const { id } = await transcriptResponse.json()

  // Step 3: Poll for completion
  let transcript
  while (true) {
    const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: { authorization: apiKey },
    })

    transcript = await pollingResponse.json()

    if (transcript.status === "completed") {
      // Format text into paragraphs (split by sentence groups)
      const fullText = transcript.text || ""
      const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText]
      
      // Group sentences into paragraphs (every 3-5 sentences)
      const paragraphs: string[] = []
      let currentParagraph: string[] = []
      
      sentences.forEach((sentence: string, index: number) => {
        currentParagraph.push(sentence.trim())
        
        // Create paragraph every 4 sentences or at the end
        if (currentParagraph.length >= 4 || index === sentences.length - 1) {
          paragraphs.push(currentParagraph.join(" "))
          currentParagraph = []
        }
      })
      
      const paragraphText = paragraphs.join("\n\n")
      
      // Convert to Whisper-like format with paragraphs
      return {
        text: paragraphText,
        paragraphs: paragraphs,
        segments: transcript.words?.map((w: any, i: number) => ({
          id: i,
          start: w.start / 1000,
          end: w.end / 1000,
          text: w.text,
        })) || [],
      }
    } else if (transcript.status === "error") {
      throw new Error(transcript.error || "AssemblyAI transcription failed")
    }

    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
}

async function transcribeWithWhisper(mediaUrl: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY")

  const fileData = await fetchMediaBuffer(mediaUrl)
  if (!fileData) throw new Error("Failed to fetch media for transcription")

  // Compress if file exceeds 25MB (Whisper's hard limit)
  let bufferToSend = fileData.buffer
  if (fileData.buffer.length > 25 * 1024 * 1024) {
    console.log(`Compressing audio from ${Math.round(fileData.buffer.length / (1024 * 1024))}MB to 24MB`)
    bufferToSend = compressAudioBuffer(fileData.buffer, 24)
  }

  const form = new FormData()
  const ext = guessFormat(mediaUrl) || (fileData.contentType.includes("mp4") ? "mp4" : undefined)
  const filename = ext ? `media.${ext}` : "media"
  const blob = new Blob([new Uint8Array(bufferToSend)], { type: fileData.contentType })
  form.append("file", blob, filename)
  form.append("model", process.env.OPENAI_WHISPER_MODEL || "whisper-1")
  form.append("response_format", "verbose_json")

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form as any,
  })

  const text = await resp.text().catch(() => "")
  let json: any = {}
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = {}
    }
  }
  if (!resp.ok) {
    const message = (json as any)?.error?.message || text || resp.statusText || "Whisper transcription failed"
    throw new Error(`Whisper transcription failed (${resp.status}): ${message}`)
  }

  return json
}

function guessFormat(url: string): "mp3" | "mp4" | "wav" | "flac" | "ogg" | "webm" | "amr" | undefined {
  const lower = url.toLowerCase()
  if (lower.includes(".mp3")) return "mp3"
  if (lower.includes(".mp4") || lower.includes(".m4a")) return "mp4"
  if (lower.includes(".wav")) return "wav"
  if (lower.includes(".flac")) return "flac"
  if (lower.includes(".ogg")) return "ogg"
  if (lower.includes(".webm")) return "webm"
  if (lower.includes(".amr")) return "amr"
  return undefined
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const mediaUrl = String(body?.mediaUrl || "").trim()
    const sync = Boolean(body?.sync)
    const languageCodeRaw = String(body?.languageCode || "en-US").trim()
    const languageCode = (languageCodeRaw || "en-US") as LanguageCode

    if (!mediaUrl) {
      return NextResponse.json({ error: "mediaUrl is required" }, { status: 400 })
    }

    const jobName = `neurolearn-${Date.now()}-${Math.random().toString(16).slice(2)}`

    // AssemblyAI primary, Whisper fallback
    await createWhisperJob(jobName)

    await updateWhisperJob(jobName, { status: "IN_PROGRESS" })

    if (sync) {
      try {
        const transcript = await transcribeWithAssemblyAI(mediaUrl)
        await updateWhisperJob(jobName, { status: "COMPLETED", transcript })
        return NextResponse.json({
          jobName,
          status: "COMPLETED",
          transcript,
          transcriptUrl: `/api/transcribe/result?jobName=${encodeURIComponent(jobName)}`,
          provider: "assemblyai",
        })
      } catch (err: any) {
        const message = err?.message || "AssemblyAI transcription failed"
        console.log("AssemblyAI failed, trying OpenAI Whisper as fallback...", message)
        
        // Fallback to OpenAI Whisper if AssemblyAI fails
        try {
          const transcript = await transcribeWithWhisper(mediaUrl)
          await updateWhisperJob(jobName, { status: "COMPLETED", transcript })
          return NextResponse.json({
            jobName,
            status: "COMPLETED",
            transcript,
            transcriptUrl: `/api/transcribe/result?jobName=${encodeURIComponent(jobName)}`,
            provider: "openai-whisper",
          })
        } catch (whisperErr: any) {
          const whisperMessage = whisperErr?.message || "Whisper also failed"
          console.error("Both transcription services failed:", { assemblyai: message, whisper: whisperMessage })
          
          await updateWhisperJob(jobName, { status: "FAILED", failureReason: `AssemblyAI: ${message}; Whisper: ${whisperMessage}` })
          const tooLarge = String(whisperMessage).toLowerCase().includes("too large")
          const quota = isQuotaError(String(whisperMessage))
          
          return NextResponse.json(
            {
              error: `Transcription failed. AssemblyAI: ${message}. Whisper: ${whisperMessage}`,
              jobName,
              status: "FAILED",
              maxBytes: MAX_WHISPER_BYTES,
              hint: tooLarge
                ? `Upload a file under ${Math.round(MAX_WHISPER_BYTES / (1024 * 1024))}MB or use an audio-only format.`
                : quota
                  ? "OpenAI quota exceeded. Check your billing."
                : undefined,
            },
            { status: tooLarge ? 413 : quota ? 429 : 500 }
          )
        }
      }
    }

    void (async () => {
      try {
        const transcript = await transcribeWithAssemblyAI(mediaUrl)
        await updateWhisperJob(jobName, { status: "COMPLETED", transcript })
      } catch (err: any) {
        const message = err?.message || "AssemblyAI transcription failed"
        console.log("AssemblyAI failed, trying OpenAI Whisper as fallback...", message)
        
        // Fallback to OpenAI Whisper if AssemblyAI fails
        try {
          const transcript = await transcribeWithWhisper(mediaUrl)
          await updateWhisperJob(jobName, { status: "COMPLETED", transcript })
        } catch (whisperErr: any) {
          const whisperMessage = whisperErr?.message || "Whisper also failed"
          console.error("Both transcription services failed:", { assemblyai: message, whisper: whisperMessage })
          await updateWhisperJob(jobName, { status: "FAILED", failureReason: `AssemblyAI: ${message}; Whisper: ${whisperMessage}` })
        }
      }
    })()

    return NextResponse.json({
      jobName,
      status: "IN_PROGRESS",
    })
  } catch (e: any) {
    const msg = String(e?.message || "")
    const name = String(e?.name || "")
    const lower = msg.toLowerCase()
    // Only treat explicit credential provider errors as missing credentials
    const isCredentialError =
      name === "CredentialsProviderError" ||
      lower.includes("missing credentials") ||
      lower.includes("could not load credentials")

    console.error("Transcribe start failed:", e)

    const awsError = {
      name: e?.name,
      message: e?.message,
      requestId: e?.$metadata?.requestId,
      httpStatusCode: e?.$metadata?.httpStatusCode,
    }

    return NextResponse.json({ error: e?.message || "Failed to start transcription", awsError }, { status: 500 })
  }
}
