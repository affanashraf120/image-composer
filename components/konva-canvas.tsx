"use client"

import { useRef, useEffect } from "react"
import { Stage, Layer, Text, Image as KonvaImage, Transformer } from "react-konva"
import type { TextLayer, ImageData } from "@/lib/editor-store"

interface KonvaCanvasProps {
  imageData: ImageData
  textLayers: TextLayer[]
  selectedLayerId: string | null
  onLayerSelect: (id: string | null) => void
  onLayerUpdate: (id: string, updates: Partial<TextLayer>) => void
}

export function KonvaCanvas({
  imageData,
  textLayers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
}: KonvaCanvasProps) {
  const stageRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Load image
  useEffect(() => {
    if (imageData?.src) {
      const img = new Image()
      img.onload = () => {
        imageRef.current = img
        // Force re-render
        if (stageRef.current) {
          stageRef.current.batchDraw()
        }
      }
      img.src = imageData.src
    }
  }, [imageData?.src])

  // Handle transformer
  useEffect(() => {
    if (selectedLayerId && transformerRef.current && stageRef.current) {
      const selectedNode = stageRef.current.findOne(`#${selectedLayerId}`)
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode])
        transformerRef.current.getLayer().batchDraw()
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([])
      transformerRef.current.getLayer().batchDraw()
    }
  }, [selectedLayerId])

  return (
    <div className="relative bg-white shadow-lg rounded-lg overflow-hidden">
      <Stage
        ref={stageRef}
        width={imageData.displayWidth}
        height={imageData.displayHeight}
        onClick={(e) => {
          if (e.target === e.target.getStage()) {
            onLayerSelect(null)
          }
        }}
      >
        <Layer>
          {/* Background Image */}
          {imageRef.current && (
            <KonvaImage image={imageRef.current} width={imageData.displayWidth} height={imageData.displayHeight} />
          )}

          {/* Text Layers */}
          {textLayers
            .filter((layer) => layer.visible)
            .map((layer) => (
              <Text
                key={layer.id}
                id={layer.id}
                text={layer.text}
                x={layer.x}
                y={layer.y}
                fontSize={layer.fontSize}
                fontFamily={layer.fontFamily}
                fill={layer.fill}
                fontStyle={layer.fontStyle}
                textDecoration={layer.textDecoration}
                align={layer.align}
                opacity={layer.opacity}
                rotation={layer.rotation}
                scaleX={layer.scaleX}
                scaleY={layer.scaleY}
                lineHeight={layer.lineHeight}
                letterSpacing={layer.letterSpacing}
                shadowColor={layer.shadowColor}
                shadowBlur={layer.shadowBlur}
                shadowOffsetX={layer.shadowOffsetX}
                shadowOffsetY={layer.shadowOffsetY}
                shadowOpacity={layer.shadowOpacity}
                draggable={!layer.locked}
                onClick={() => onLayerSelect(layer.id)}
                onDragEnd={(e) => {
                  onLayerUpdate(layer.id, {
                    x: e.target.x(),
                    y: e.target.y(),
                  })
                }}
                onTransformEnd={(e) => {
                  const node = e.target
                  const scaleX = node.scaleX()
                  const scaleY = node.scaleY()

                  onLayerUpdate(layer.id, {
                    x: node.x(),
                    y: node.y(),
                    rotation: node.rotation(),
                    scaleX,
                    scaleY,
                  })
                }}
              />
            ))}

          {/* Transformer for selected layer */}
          {selectedLayerId && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) {
                  return oldBox
                }
                return newBox
              }}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}
