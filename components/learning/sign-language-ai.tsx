"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Camera, CameraOff } from "lucide-react"
import * as tf from "@tensorflow/tfjs"
import { Button } from "@/components/ui/button"
import { analyzeFrame } from "@/lib/aws-services"

export function SignLanguageAI() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [streamActive, setStreamActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [detected, setDetected] = useState<string>("WAITING")

  useEffect(() => {
    async function loadModel() {
      try {
        await tf.ready()
        // Here we would load the custom sign language model
        // const model = await tf.loadGraphModel('/model/sign-language-model.json')
        // For demo, we just simulate loading time
        await new Promise((resolve) => setTimeout(resolve, 2000))
        setModelLoaded(true)
        setLoading(false)
      } catch (err) {
        console.error("Failed to load TFJS", err)
        setLoading(false)
      }
    }
    loadModel()
  }, [])

  const startCamera = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setStreamActive(true)
          setDetected("ANALYZING")
        }
      } catch (err) {
        console.error("Error accessing camera:", err)
      }
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      const tracks = stream.getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setStreamActive(false)
      setDetected("WAITING")
    }
  }

  useEffect(() => {
    if (!streamActive) return

    let timer: number | null = null
    const run = async () => {
      const video = videoRef.current
      if (!video) return

      const canvas = canvasRef.current || document.createElement("canvas")
      canvasRef.current = canvas

      const w = video.videoWidth || 640
      const h = video.videoHeight || 360
      canvas.width = w
      canvas.height = h

      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.drawImage(video, 0, 0, w, h)
      const base64 = canvas.toDataURL("image/jpeg", 0.6)

      try {
        const res = await analyzeFrame(base64)
        const top = res?.labels?.[0]?.Name
        setDetected(top ? String(top).toUpperCase().replace(/\s+/g, "_") : "NO_MATCH")
      } catch {
        setDetected("ANALYZING")
      }
    }

    // Analyze every ~2s to keep it lightweight
    timer = window.setInterval(() => {
      void run()
    }, 2000)

    // Run immediately
    void run()

    return () => {
      if (timer) window.clearInterval(timer)
    }
  }, [streamActive])

  return (
    <div className="relative rounded-xl overflow-hidden bg-black/90 aspect-video border border-white/10 shadow-2xl">
      <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur px-3 py-1 rounded-full text-xs font-mono text-green-400 border border-green-500/30 flex items-center gap-2">
         <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
         TFJS: {modelLoaded ? "READY" : "LOADING..."}
      </div>

      {loading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
          <Loader2 className="h-10 w-10 animate-spin mb-4" />
          <p>Initializing Neural Engine...</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${streamActive ? "opacity-100" : "opacity-0"}`}
          />
          <canvas ref={canvasRef} className="hidden" />
          {!streamActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-4">
              <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                 <Camera className="h-10 w-10 opacity-50" />
              </div>
              <p className="max-w-[200px] text-center text-sm">Enable camera for real-time sign language gesture recognition</p>
              <Button onClick={startCamera} variant="outline" className="bg-white/10 border-white/20 hover:bg-white/20 text-white">
                Start Analysis
              </Button>
            </div>
          )}
          {streamActive && (
             <div className="absolute bottom-4 right-4 z-10">
                <Button onClick={stopCamera} size="sm" variant="destructive" className="h-8 text-xs">
                   <CameraOff className="mr-2 h-3 w-3" /> Stop
                </Button>
             </div>
          )}
          
          {/* Simulated Detection Overlay */}
          {streamActive && (
             <div className="absolute bottom-4 left-4 right-4 h-12 bg-black/60 backdrop-blur rounded flex items-center px-4 border border-white/10">
                <span className="text-white/60 text-xs mr-2">DETECTED:</span>
               <span className="text-primary font-bold tracking-widest animate-pulse">{detected}</span>
             </div>
          )}
        </>
      )}
    </div>
  )
}
