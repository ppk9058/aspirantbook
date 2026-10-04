"use client"

import React, { useRef, useState, useEffect } from "react"
import {
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle,
  ArrowRight,
  RotateCcw,
  Trash2,
  Download,
  Grid,
  Sparkles,
} from "lucide-react"

interface WhiteboardCanvasProps {
  isTeacherMode?: boolean
}

type ToolType = "pen" | "highlighter" | "eraser" | "rectangle" | "circle" | "arrow"

const COLORS = [
  "#FFFFFF", // White
  "#FBBF24", // Yellow
  "#34D399", // Emerald Green
  "#38BDF8", // Cyan
  "#F43F5E", // Rose
  "#A855F7", // Purple
]

export default function WhiteboardCanvas({ isTeacherMode = false }: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [currentTool, setCurrentTool] = useState<ToolType>("pen")
  const [currentColor, setCurrentColor] = useState<string>("#FFFFFF")
  const [strokeWidth, setStrokeWidth] = useState<number>(3)
  const [showGrid, setShowGrid] = useState<boolean>(true)
  const isDrawing = useRef(false)
  const history = useRef<ImageData[]>([])
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  // Initialize Canvas & High-DPI scaling
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      drawDefaultBoard(ctx, rect.width, rect.height)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    return () => window.removeEventListener("resize", resizeCanvas)
  }, [])

  const drawDefaultBoard = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Dark chalkboard slate background
    ctx.fillStyle = "#162032"
    ctx.fillRect(0, 0, width, height)

    // Optional coordinate grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
      ctx.lineWidth = 1
      const step = 40
      for (let x = 0; x < width; x += step) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
    }

    // Pre-drawn academic notes/diagram
    ctx.fillStyle = "#FBBF24"
    ctx.font = "bold 16px Inter, sans-serif"
    ctx.fillText("Topic: Standard Units of Measurement (SI)", 25, 35)

    ctx.fillStyle = "#FFFFFF"
    ctx.font = "14px Inter, sans-serif"
    ctx.fillText("1. Length (L) = Metre (m)", 25, 65)
    ctx.fillText("2. 1 Kilometre (km) = 1,000 metres (m)", 25, 90)
    ctx.fillText("3. 1 Metre (m) = 100 centimetres (cm)", 25, 115)
    ctx.fillText("4. 1 Centimetre (cm) = 10 millimetres (mm)", 25, 140)

    // Draw pendulum diagram illustration
    ctx.strokeStyle = "#38BDF8"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(width - 150, 40)
    ctx.lineTo(width - 150, 160)
    ctx.stroke()

    // Bob circle
    ctx.fillStyle = "#F43F5E"
    ctx.beginPath()
    ctx.arc(width - 150, 160, 14, 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = "#94A3B8"
    ctx.font = "12px Inter, sans-serif"
    ctx.fillText("Periodic Oscillatory Motion", width - 220, 195)
  }

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    if ("touches" in e) {
      const touch = e.touches[0]
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isTeacherMode) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Save history state
    if (canvas.width > 0 && canvas.height > 0) {
      try {
        history.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
        if (history.current.length > 20) history.current.shift()
      } catch (err) {
        // ignore
      }
    }

    isDrawing.current = true
    const { x, y } = getCanvasCoords(e)
    startPos.current = { x, y }

    if (currentTool === "pen" || currentTool === "highlighter" || currentTool === "eraser") {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isTeacherMode || !isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCanvasCoords(e)

    if (currentTool === "pen") {
      ctx.strokeStyle = currentColor
      ctx.lineWidth = strokeWidth
      ctx.globalAlpha = 1.0
      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (currentTool === "highlighter") {
      ctx.strokeStyle = currentColor
      ctx.lineWidth = strokeWidth * 4
      ctx.globalAlpha = 0.35
      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (currentTool === "eraser") {
      ctx.strokeStyle = "#162032"
      ctx.lineWidth = strokeWidth * 6
      ctx.globalAlpha = 1.0
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isTeacherMode || !isDrawing.current) return
    isDrawing.current = false
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCanvasCoords(e)
    ctx.globalAlpha = 1.0
    ctx.strokeStyle = currentColor
    ctx.lineWidth = strokeWidth

    // Shapes drawing on release
    if (currentTool === "rectangle") {
      const w = x - startPos.current.x
      const h = y - startPos.current.y
      ctx.strokeRect(startPos.current.x, startPos.current.y, w, h)
    } else if (currentTool === "circle") {
      const radius = Math.sqrt(
        Math.pow(x - startPos.current.x, 2) + Math.pow(y - startPos.current.y, 2)
      )
      ctx.beginPath()
      ctx.arc(startPos.current.x, startPos.current.y, radius, 0, 2 * Math.PI)
      ctx.stroke()
    } else if (currentTool === "arrow") {
      ctx.beginPath()
      ctx.moveTo(startPos.current.x, startPos.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }

  const handleUndo = () => {
    const canvas = canvasRef.current
    if (!canvas || history.current.length === 0) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const last = history.current.pop()
    if (last) ctx.putImageData(last, 0, 0)
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    drawDefaultBoard(ctx, rect.width, rect.height)
  }

  return (
    <div className="relative w-full h-full bg-[#162032] flex flex-col overflow-hidden select-none">
      {/* Interactive Toolbar (TEACHER ONLY) or Read-Only Banner (STUDENTS) */}
      {isTeacherMode ? (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-[#0F172A]/90 backdrop-blur-md border border-gray-700/80 rounded-2xl px-3 py-1.5 flex items-center gap-2 shadow-2xl max-w-[95%] overflow-x-auto no-scrollbar">
          {/* Tools */}
          <div className="flex items-center gap-1 border-r border-gray-700 pr-2">
            <button
              onClick={() => setCurrentTool("pen")}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                currentTool === "pen" ? "bg-[#5B47FB] text-white" : "text-gray-400 hover:text-white"
              }`}
              title="Pen"
            >
              <Pen className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentTool("highlighter")}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                currentTool === "highlighter" ? "bg-[#5B47FB] text-white" : "text-gray-400 hover:text-white"
              }`}
              title="Highlighter"
            >
              <Highlighter className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentTool("eraser")}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                currentTool === "eraser" ? "bg-[#5B47FB] text-white" : "text-gray-400 hover:text-white"
              }`}
              title="Eraser"
            >
              <Eraser className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentTool("rectangle")}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                currentTool === "rectangle" ? "bg-[#5B47FB] text-white" : "text-gray-400 hover:text-white"
              }`}
              title="Rectangle"
            >
              <Square className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentTool("circle")}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                currentTool === "circle" ? "bg-[#5B47FB] text-white" : "text-gray-400 hover:text-white"
              }`}
              title="Circle"
            >
              <Circle className="h-4 w-4" />
            </button>
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1.5 border-r border-gray-700 pr-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setCurrentColor(c)}
                style={{ backgroundColor: c }}
                className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                  currentColor === c ? "scale-125 border-white shadow-xs" : "border-transparent"
                }`}
              />
            ))}
          </div>

          {/* Actions: Undo, Clear */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
              title="Undo"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
              title="Clear Board"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-[#0F172A]/90 backdrop-blur-md border border-gray-700/80 rounded-2xl px-4 py-1.5 flex items-center gap-2 shadow-2xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-gray-300">
            Instructor's Digital Whiteboard (View-Only)
          </span>
        </div>
      )}

      {/* Main Canvas Element */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className={`w-full h-full touch-none ${
          isTeacherMode ? "cursor-crosshair" : "cursor-default pointer-events-none"
        }`}
      />

      {/* Subtle Live Synchronized Badge */}
      <div className="absolute bottom-3 left-4 z-10 flex items-center gap-2 text-[10px] font-bold text-gray-400 bg-gray-900/80 px-2.5 py-1 rounded-lg border border-gray-800">
        <Sparkles className="h-3 w-3 text-amber-400" />
        <span>Live Teacher Synchronized Whiteboard</span>
      </div>
    </div>
  )
}
