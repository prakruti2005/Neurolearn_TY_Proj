import { NextRequest, NextResponse } from "next/server";
import { pollyClient } from "@/lib/aws-clients";
import { SynthesizeSpeechCommand } from "@aws-sdk/client-polly";

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId = "Joanna" } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: "mp3",
      VoiceId: voiceId,
      Engine: "neural", // Use neural engine for better quality
    });

    const response = await pollyClient.send(command);

    if (!response.AudioStream) {
      throw new Error("No audio stream returned from Polly");
    }

    // Convert the stream to a Buffer or ArrayBuffer to send back
    const audioBytes = await response.AudioStream.transformToByteArray();
    const audioBuffer = new ArrayBuffer(audioBytes.byteLength);
    new Uint8Array(audioBuffer).set(audioBytes);

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error: any) {
    console.error("Polly Error:", error);
    // Fallback or error handling
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
