"use client"

import type React from "react"
import { useEffect, useRef, useState, useCallback } from "react"
import type { ImageData, TextLayer } from "@/lib/editor-store"

interface CanvasWrapperProps {
  imageData: ImageData
  textLayers: TextLayer[]
  selectedLayerId: string | null
  onLayerSelect: (id: string | null) => void
  onLayerUpdate: (id: string, updates: Partial<TextLayer>) => void
}

interface TransformHandle {
  x: number
  y: number
  type: "resize" | "rotate"
  cursor: string
}

export function CanvasWrapper({
  imageData,
  textLayers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
}: CanvasWrapperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isTransforming, setIsTransforming] = useState(false)
  const [transformHandle, setTransformHandle] = useState<string | null>(null)

  // Load background image
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => setImage(img)
    img.src = imageData.src
  }, [imageData.src])

  // Get selected layer
  const selectedLayer = textLayers.find((layer) => layer.id === selectedLayerId)

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw background image
    if (image) {
      ctx.drawImage(image, 0, 0, imageData.displayWidth, imageData.displayHeight)
    }

    // Draw text layers
    textLayers
      .filter((layer) => layer.visible)
      .forEach((layer) => {
        ctx.save()

        // Apply transformations
        ctx.translate(layer.x + (layer.width || 0) / 2, layer.y + (layer.fontSize || 16) / 2)
        ctx.rotate(((layer.rotation || 0) * Math.PI) / 180)
        ctx.scale(layer.scaleX || 1, layer.scaleY || 1)

        // Set text properties
        ctx.font = `${layer.fontWeight || "normal"} ${layer.fontSize || 16}px ${layer.fontFamily || "Arial"}`
        ctx.fillStyle = layer.fill || "#000000"
        ctx.globalAlpha = layer.opacity || 1
        ctx.textAlign = (layer.align || "left") as CanvasTextAlign
        ctx.textBaseline = "middle"

        // Apply text shadow
        if (layer.shadowBlur || layer.shadowOffsetX || layer.shadowOffsetY) {
          ctx.shadowColor = layer.shadowColor || "#000000"
          ctx.shadowBlur = layer.shadowBlur || 0
          ctx.shadowOffsetX = layer.shadowOffsetX || 0
          ctx.shadowOffsetY = layer.shadowOffsetY || 0
        }

        // Draw text (handle multiline)
        const lines = layer.text.split("\n")
        const lineHeight = (layer.fontSize || 16) * (layer.lineHeight || 1.2)

        lines.forEach((line, index) => {
          const y = (index - (lines.length - 1) / 2) * lineHeight
          ctx.fillText(line, -(layer.width || 0) / 2, y)
        })

        ctx.restore()

        // Calculate text dimensions for selection
        if (!layer.width) {
          const metrics = ctx.measureText(layer.text)
          layer.width = metrics.width
          layer.height = layer.fontSize || 16
        }
      })

    // Draw selection handles for selected layer
    if (selectedLayer && !selectedLayer.locked) {
      drawSelectionHandles(ctx, selectedLayer)
    }
  }, [image, imageData, textLayers, selectedLayer])

  // Draw selection handles
  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, layer: TextLayer) => {
    const width = layer.width || 100
    const height = layer.height || layer.fontSize || 16

    ctx.save()
    ctx.translate(layer.x + width / 2, layer.y + height / 2)
    ctx.rotate(((layer.rotation || 0) * Math.PI) / 180)
    ctx.scale(layer.scaleX || 1, layer.scaleY || 1)

    // Selection box
    ctx.strokeStyle = "#0066ff"
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.strokeRect(-width / 2, -height / 2, width, height)

    // Corner handles
    const handleSize = 8
    ctx.fillStyle = "#0066ff"
    ctx.setLineDash([])

    const corners = [
      { x: -width / 2, y: -height / 2 }, // top-left
      { x: width / 2, y: -height / 2 }, // top-right
      { x: width / 2, y: height / 2 }, // bottom-right
      { x: -width / 2, y: height / 2 }, // bottom-left
    ]

    corners.forEach((corner) => {
      ctx.fillRect(corner.x - handleSize / 2, corner.y - handleSize / 2, handleSize, handleSize)
    })

    // Rotation handle
    ctx.beginPath()
    ctx.arc(0, -height / 2 - 20, 6, 0, 2 * Math.PI)
    ctx.fill()

    ctx.restore()
  }

  // Redraw when dependencies change
  useEffect(() => {
    draw()
  }, [draw])

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Check if clicking on a text layer
    let clickedLayer: TextLayer | null = null

    for (let i = textLayers.length - 1; i >= 0; i--) {
      const layer = textLayers[i]
      if (!layer.visible || layer.locked) continue

      const layerBounds = {
        left: layer.x,
        top: layer.y,
        right: layer.x + (layer.width || 100),
        bottom: layer.y + (layer.height || layer.fontSize || 16),
      }

      if (x >= layerBounds.left && x <= layerBounds.right && y >= layerBounds.top && y <= layerBounds.bottom) {
        clickedLayer = layer
        break
      }
    }

    if (clickedLayer) {
      onLayerSelect(clickedLayer.id)
      setIsDragging(true)
      setDragStart({ x: x - clickedLayer.x, y: y - clickedLayer.y })
    } else {
      onLayerSelect(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedLayer) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    onLayerUpdate(selectedLayer.id, {
      x: x - dragStart.x,
      y: y - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsTransforming(false)
    setTransformHandle(null)
  }

  // Handle double-click for text editing
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!selectedLayer) return

    const newText = prompt("Edit text:", selectedLayer.text)
    if (newText !== null) {
      onLayerUpdate(selectedLayer.id, { text: newText })
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white shadow-lg">
      <canvas
        ref={canvasRef}
        width={imageData.displayWidth}
        height={imageData.displayHeight}
        className="cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ display: "block" }}
      />
    </div>
  )
}
