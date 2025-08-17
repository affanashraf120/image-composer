"use client"

import { useRef, useEffect, useState } from "react"
import { Stage, Layer, Text, Image as KonvaImage, Transformer, Group } from "react-konva"
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
  const [isDragging, setIsDragging] = useState(false)

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

  // Update layer dimensions when text changes
  useEffect(() => {
    textLayers.forEach(layer => {
      updateLayerDimensions(layer)
    })
  }, [textLayers])

  // Enhanced drag handling
  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = (layer: TextLayer, e: any) => {
    setIsDragging(false)
    onLayerUpdate(layer.id, {
      x: e.target.x(),
      y: e.target.y(),
    })
  }

  // Enhanced transform handling
  const handleTransformEnd = (layer: TextLayer, e: any) => {
    const node = e.target
    const scaleX = node.scaleX()
    const scaleY = node.scaleY()

    // Reset scale to 1 and adjust fontSize instead for better text handling
    node.scaleX(1)
    node.scaleY(1)

    // Calculate new dimensions
    const newWidth = layer.width ? layer.width * scaleX : (layer.text.length * (layer.fontSize || 16) * 0.6) * scaleX

    onLayerUpdate(layer.id, {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      fontSize: layer.fontSize * scaleX, // Scale font size instead of using scale
      width: newWidth, // Update width for transformer bounds
      scaleX: 1,
      scaleY: 1,
    })
  }

  // Update layer dimensions when text changes
  const updateLayerDimensions = (layer: TextLayer) => {
    const textWidth = layer.text.length * (layer.fontSize || 16) * 0.6
    const textHeight = (layer.fontSize || 16) * (layer.lineHeight || 1.2)
    
    if (layer.width !== textWidth) {
      onLayerUpdate(layer.id, { width: textWidth })
    }
  }

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
        onMouseDown={(e) => {
          // Prevent stage click when dragging
          if (isDragging) {
            e.evt.preventDefault()
          }
        }}
      >
        <Layer>
          {/* Background Image */}
          {imageRef.current && (
            <KonvaImage image={imageRef.current} width={imageData.displayWidth} height={imageData.displayHeight} />
          )}

          {/* Text Layers - sorted by zIndex */}
          {textLayers
            .filter((layer) => layer.visible)
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            .map((layer) => {
              // Calculate text dimensions for proper transformer bounds
              const textWidth = layer.width || (layer.text.length * (layer.fontSize || 16) * 0.6)
              const textHeight = (layer.fontSize || 16) * (layer.lineHeight || 1.2)
              
              return (
                <Group
                  key={layer.id}
                  id={layer.id}
                  x={layer.x}
                  y={layer.y}
                  draggable={!layer.locked}
                  onClick={() => onLayerSelect(layer.id)}
                  onDragStart={handleDragStart}
                  onDragEnd={(e) => handleDragEnd(layer, e)}
                  onTransformEnd={(e) => handleTransformEnd(layer, e)}
                >
                  <Text
                    text={layer.text}
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
                    // Position text properly for transformer bounds
                    x={0}
                    y={0}
                    offsetX={0}
                    offsetY={0}
                    // Ensure proper text alignment
                    textAlign={layer.align}
                    verticalAlign="middle"
                    // Set explicit dimensions for transformer
                    width={textWidth}
                    height={textHeight}
                  />
                  
                  {/* Z-index indicator (only show when selected) */}
                  {selectedLayerId === layer.id && (
                    <Text
                      text={`Z: ${layer.zIndex || 0}`}
                      fontSize={10}
                      fontFamily="Arial"
                      fill="#0066ff"
                      x={textWidth + 5}
                      y={0}
                      opacity={0.8}
                    />
                  )}
                </Group>
              )
            })}

          {/* Enhanced Transformer for selected layer */}
          {selectedLayerId && (
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Prevent text from becoming too small
                if (newBox.width < 20 || newBox.height < 20) {
                  return oldBox
                }
                return newBox
              }}
              // Enable all transformation handles
              enabledAnchors={['middle-left', 'middle-right', 'top-middle', 'bottom-middle', 'top-left', 'top-right', 'bottom-left', 'bottom-right']}
              // Enable rotation
              rotateEnabled={true}
              // Custom handle styles
              anchorSize={8}
              anchorCornerRadius={4}
              anchorStroke="#0066ff"
              anchorStrokeWidth={2}
              anchorFill="#ffffff"
              // Rotation handle
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              rotationSnapTolerance={15}
              // Border styles
              borderStroke="#0066ff"
              borderStrokeWidth={2}
              borderDash={[5, 5]}
              // Rotation handle styles
              rotateAnchorOffset={30}
              rotateAnchorSize={8}
              rotateAnchorStroke="#0066ff"
              rotateAnchorStrokeWidth={2}
              rotateAnchorFill="#ffffff"
              // Constrain proportions with Shift key
              keepRatio={false}
              // Better performance
              shouldOverdrawWholeArea={false}
              // Better text handling
              ignoreStroke={true}
              padding={5}
              // Ensure proper bounds calculation
              centeredScaling={false}
              centeredRotation={true}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}
