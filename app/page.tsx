"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Upload, RotateCcw, Type, Palette, Undo, Redo, History, Download, Save, FolderOpen } from "lucide-react"
import { useEditorStore } from "@/lib/editor-store"
import { FontSelector } from "@/components/font-selector"
import { ExportManager } from "@/lib/export-manager"
import { AutosaveManager } from "@/lib/autosave-manager"
import { CanvasWrapper } from "@/components/canvas-wrapper"

export default function ImageTextComposer() {
  const [isClient, setIsClient] = useState(false)

  // Replace local state with Zustand store
  const {
    present: { imageData, textLayers, selectedLayerId, snapGuides, customFonts },
    setImageData,
    addTextLayer,
    updateTextLayer,
    deleteTextLayer,
    moveLayerUp,
    moveLayerDown,
    bringToFront,
    sendToBack,
    duplicateLayer,
    toggleLayerLock,
    toggleLayerVisibility,
    setSelectedLayerId,
    setSnapGuides,
    addCustomFont,
    removeCustomFont,
    undo,
    redo,
    canUndo,
    canRedo,
    getHistoryInfo,
    reset,
  } = useEditorStore()

  // Added export and autosave state
  const [isExporting, setIsExporting] = useState(false)
  const [showAutosaveRestore, setShowAutosaveRestore] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const projectImportRef = useRef<HTMLInputElement>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const stageRef = useRef<any>(null)
  const transformerRef = useRef<any>(null)

  const selectedLayer = textLayers.find((layer) => layer.id === selectedLayerId)
  const historyInfo = getHistoryInfo()

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Added autosave effect
  useEffect(() => {
    if (isClient) {
      AutosaveManager.saveState(imageData, textLayers, customFonts)
    }
  }, [imageData, textLayers, customFonts, isClient])

  // Added autosave restore check on mount
  useEffect(() => {
    if (isClient && AutosaveManager.hasSavedState()) {
      setShowAutosaveRestore(true)
    }
  }, [isClient])

  // Keyboard shortcuts for layer manipulation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle keyboard shortcuts when user is typing in input fields
      const target = event.target as HTMLElement
      if (target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('[contenteditable]')
      )) {
        return
      }

      // Handle undo/redo shortcuts (always available)
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault()
          undo()
          return
        }
        if (event.key === 'Z' && event.shiftKey) {
          event.preventDefault()
          redo()
          return
        }
      }

      // Only handle keyboard events when a layer is selected
      if (!selectedLayerId || !selectedLayer) return

      // Prevent default behavior for these keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Delete', 'Backspace'].includes(event.key)) {
        event.preventDefault()
      }

      const nudgeAmount = event.shiftKey ? 10 : 1

      switch (event.key) {
        case 'ArrowUp':
          updateTextLayer(selectedLayerId, { y: selectedLayer.y - nudgeAmount })
          break
        case 'ArrowDown':
          updateTextLayer(selectedLayerId, { y: selectedLayer.y + nudgeAmount })
          break
        case 'ArrowLeft':
          updateTextLayer(selectedLayerId, { x: selectedLayer.x - nudgeAmount })
          break
        case 'ArrowRight':
          updateTextLayer(selectedLayerId, { x: selectedLayer.x + nudgeAmount })
          break
        case 'Delete':
        case 'Backspace':
          deleteTextLayer(selectedLayerId)
          break
        case 'r':
        case 'R':
          // Reset rotation
          if (event.shiftKey) {
            event.preventDefault()
            updateTextLayer(selectedLayerId, { rotation: 0 })
          }
          break
        case 's':
        case 'S':
          // Reset scale
          if (event.shiftKey) {
            event.preventDefault()
            updateTextLayer(selectedLayerId, { scaleX: 1, scaleY: 1 })
          }
          break
        case 'PageDown':
        case 'ArrowDown':
          // Move layer down (when Ctrl/Cmd is pressed)
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            if (event.shiftKey) {
              sendToBack(selectedLayerId)
            } else {
              moveLayerDown(selectedLayerId)
            }
          }
          break
        case 'PageUp':
        case 'ArrowUp':
          // Move layer up (when Ctrl/Cmd is pressed)
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            if (event.shiftKey) {
              bringToFront(selectedLayerId)
            } else {
              moveLayerUp(selectedLayerId)
            }
          }
          break
      }
    }

    // Add event listener
    window.addEventListener('keydown', handleKeyDown)

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedLayerId, selectedLayer, updateTextLayer, deleteTextLayer, undo, redo])

  const handleExportPNG = useCallback(async () => {
    if (!imageData) {
      alert("Please upload an image first")
      return
    }

    setIsExporting(true)
    try {
      const filename = `composition-${new Date().toISOString().slice(0, 10)}.png`
      await ExportManager.exportToPNG(imageData, textLayers, filename)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Export failed")
    } finally {
      setIsExporting(false)
    }
  }, [imageData, textLayers])

  const handleExportProject = useCallback(() => {
    const filename = `project-${new Date().toISOString().slice(0, 10)}.json`
    ExportManager.exportProjectData(imageData, textLayers, filename)
  }, [imageData, textLayers])

  const handleImportProject = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const { imageData: importedImageData, textLayers: importedTextLayers } =
          await ExportManager.importProjectData(file)

        reset()
        if (importedImageData) {
          setImageData(importedImageData)
        }
        importedTextLayers.forEach((layer) => addTextLayer(layer))
      } catch (error) {
        alert(error instanceof Error ? error.message : "Import failed")
      }

      if (projectImportRef.current) {
        projectImportRef.current.value = ""
      }
    },
    [reset, setImageData, addTextLayer],
  )

  const handleRestoreAutosave = useCallback(() => {
    const saved = AutosaveManager.loadState()
    if (saved) {
      reset()
      if (saved.imageData) {
        setImageData(saved.imageData)
      }
      saved.textLayers.forEach((layer) => addTextLayer(layer))
      saved.customFonts.forEach((font) => addCustomFont(font))
    }
    setShowAutosaveRestore(false)
  }, [reset, setImageData, addTextLayer, addCustomFont])

  const handleDiscardAutosave = useCallback(() => {
    AutosaveManager.clearSave()
    setShowAutosaveRestore(false)
  }, [])

  const handleImageUpload = useCallback(
    (file: File) => {
      // Enhanced file validation
      if (!file) {
        console.error("No file provided")
        return
      }

      if (!file.type.includes("png")) {
        alert("Please select a PNG file")
        return
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size too large. Please select a PNG file smaller than 10MB")
        return
      }

      const img = new Image()
      
      img.onload = () => {
        const maxDisplaySize = 800
        const aspectRatio = img.width / img.height
        let displayWidth = img.width
        let displayHeight = img.height

        if (img.width > maxDisplaySize || img.height > maxDisplaySize) {
          if (aspectRatio > 1) {
            displayWidth = maxDisplaySize
            displayHeight = maxDisplaySize / aspectRatio
          } else {
            displayHeight = maxDisplaySize
            displayWidth = maxDisplaySize * aspectRatio
          }
        }

        setImageData({
          src: img.src,
          width: img.width,
          height: img.height,
          displayWidth: Math.round(displayWidth),
          displayHeight: Math.round(displayHeight),
        })
      }

      img.onerror = () => {
        alert("Failed to load image. Please try again with a different PNG file.")
      }

      img.src = URL.createObjectURL(file)
    },
    [setImageData],
  )

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        console.log('File selected:', file.name, file.size, file.type)
        handleImageUpload(file)
      }
      // Always reset the input value to allow selecting the same file again
      if (event.target) {
        event.target.value = ''
      }
    },
    [handleImageUpload],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const pngFile = files.find(file => file.type.includes('png'))
    
    if (pngFile) {
      handleImageUpload(pngFile)
    } else {
      alert("Please drop a PNG file")
    }
  }, [handleImageUpload])

  const triggerFileInput = useCallback(() => {
    // Force the file input to work by clearing it first
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }, [])

  const handleAddTextLayer = useCallback(() => {
    if (!imageData) return

    const newLayer = {
      id: `text-${Date.now()}`,
      text: "New Text",
      x: 50,
      y: 50,
      fontSize: 24,
      fontFamily: "Arial",
      fontWeight: "normal",
      fill: "#000000",
      fontStyle: "normal" as const,
      textDecoration: "",
      align: "left" as const,
      opacity: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      lineHeight: 1.2,
      letterSpacing: 0,
      shadowColor: "#000000",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      shadowOpacity: 0,
      locked: false,
      visible: true,
      zIndex: 0, // Will be set by the store
    }

    addTextLayer(newLayer)
    setSelectedLayerId(newLayer.id)
  }, [imageData, addTextLayer, setSelectedLayerId])

  const handleReset = useCallback(() => {
    reset()
  }, [reset])

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Image Text Composer...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Added autosave restore notification */}
      {showAutosaveRestore && (
        <div className="bg-blue-50 border-b border-blue-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Found autosaved work from {AutosaveManager.getSaveTimestamp()?.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleRestoreAutosave}>
                Restore
              </Button>
              <Button size="sm" variant="outline" onClick={handleDiscardAutosave}>
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Image Text Composer</h1>
          <div className="flex items-center gap-2">
            <Button onClick={triggerFileInput} className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload PNG
            </Button>
            {imageData && (
              <Button onClick={handleAddTextLayer} variant="outline" className="flex items-center gap-2 bg-transparent">
                <Type className="w-4 h-4" />
                Add Text
              </Button>
            )}

            {/* Undo/redo controls */}
            <div className="flex items-center gap-1 border-l pl-2 ml-2">
              <Button
                onClick={undo}
                disabled={!canUndo()}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 bg-transparent"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                onClick={redo}
                disabled={!canRedo()}
                variant="outline"
                size="sm"
                className="flex items-center gap-1 bg-transparent"
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo className="w-4 h-4" />
              </Button>

              {/* History indicator */}
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                <History className="w-3 h-3" />
                <span>
                  {historyInfo.currentStep}/{historyInfo.totalSteps}
                </span>
              </div>
            </div>

            {/* Added export controls */}
            {imageData && (
              <div className="flex items-center gap-1 border-l pl-2 ml-2">
                <Button
                  onClick={handleExportPNG}
                  disabled={isExporting}
                  className="flex items-center gap-2"
                  title="Export as PNG"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? "Exporting..." : "Export PNG"}
                </Button>
                <Button
                  onClick={handleExportProject}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1 bg-transparent"
                  title="Save project file"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => projectImportRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  title="Load project file"
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </div>
            )}

            <Button variant="outline" onClick={handleReset} className="flex items-center gap-2 bg-transparent">
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>

            <div className="flex-1 flex h-full overflow-hidden">
        {/* Left Sidebar - Properties Panel */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <h3 className="font-semibold text-gray-700">Properties Panel</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <Card className="p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Properties
              </h3>
              
              {/* Scroll indicator when content overflows */}
              <div className="sticky top-0 bg-white z-10 pb-2 mb-4 border-b border-gray-100">
                <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full inline-block">
                  Scroll to see all properties
                </div>
              </div>

            {selectedLayer ? (
              <div className="space-y-4">
                {/* Text Content */}
                <div>
                  <Label htmlFor="text-content">Text Content</Label>
                  <Textarea
                    id="text-content"
                    value={selectedLayer.text}
                    onChange={(e) => updateTextLayer(selectedLayer.id, { text: e.target.value })}
                    placeholder="Enter your text..."
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* Position and rotation controls */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>X Position</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedLayer.x || 0)}
                      onChange={(e) => updateTextLayer(selectedLayer.id, { x: Number.parseInt(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Y Position</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedLayer.y || 0)}
                      onChange={(e) => updateTextLayer(selectedLayer.id, { y: Number.parseInt(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Opacity Control */}
                <div>
                  <Label>Opacity: {Math.round((selectedLayer.opacity || 1) * 100)}%</Label>
                  <Slider
                    value={[(selectedLayer.opacity || 1) * 100]}
                    onValueChange={([value]) => updateTextLayer(selectedLayer.id, { opacity: value / 100 })}
                    min={0}
                    max={100}
                    step={1}
                    className="mt-2"
                  />
                </div>

                {/* Transformation Controls */}
                <div className="space-y-4">
                  <div>
                    <Label>Rotation: {Math.round(selectedLayer.rotation || 0)}°</Label>
                    <Slider
                      value={[selectedLayer.rotation || 0]}
                      onValueChange={([value]) => updateTextLayer(selectedLayer.id, { rotation: value })}
                      min={-180}
                      max={180}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Scale X: {Math.round((selectedLayer.scaleX || 1) * 100)}%</Label>
                      <Slider
                        value={[(selectedLayer.scaleX || 1) * 100]}
                        onValueChange={([value]) => updateTextLayer(selectedLayer.id, { scaleX: value / 100 })}
                        min={10}
                        max={300}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Scale Y: {Math.round((selectedLayer.scaleY || 1) * 100)}%</Label>
                      <Slider
                        value={[(selectedLayer.scaleY || 1) * 100]}
                        onValueChange={([value]) => updateTextLayer(selectedLayer.id, { scaleY: value / 100 })}
                        min={10}
                        max={300}
                        step={1}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Reset Transformations Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      updateTextLayer(selectedLayer.id, {
                        rotation: 0,
                        scaleX: 1,
                        scaleY: 1,
                      })
                    }}
                    variant="outline"
                    size="sm"
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Reset Transformations
                  </Button>
                </div>

                {/* Layer Ordering Controls */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Layer Order</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => bringToFront(selectedLayer.id)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Bring to Front
                    </Button>
                    <Button
                      onClick={() => sendToBack(selectedLayer.id)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Send to Back
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => moveLayerUp(selectedLayer.id)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Move Up
                    </Button>
                    <Button
                      onClick={() => moveLayerDown(selectedLayer.id)}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                    >
                      Move Down
                    </Button>
                  </div>
                </div>

                {/* Enhanced Font Family with FontSelector */}
                <div>
                  <Label>Font Family</Label>
                  <div className="mt-1">
                    <FontSelector
                      selectedFont={selectedLayer.fontFamily}
                      onFontChange={(fontFamily) => updateTextLayer(selectedLayer.id, { fontFamily })}
                      customFonts={customFonts}
                      onCustomFontAdd={addCustomFont}
                      onCustomFontRemove={removeCustomFont}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Font Size</Label>
                    <Input
                      type="number"
                      value={selectedLayer.fontSize || 16}
                      onChange={(e) =>
                        updateTextLayer(selectedLayer.id, { fontSize: Number.parseInt(e.target.value) || 16 })
                      }
                      min={8}
                      max={200}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Text Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="color"
                        value={selectedLayer.fill || "#000000"}
                        onChange={(e) => updateTextLayer(selectedLayer.id, { fill: e.target.value })}
                        className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                        title="Choose text color"
                      />
                      <Input
                        type="text"
                        value={selectedLayer.fill || "#000000"}
                        onChange={(e) => updateTextLayer(selectedLayer.id, { fill: e.target.value })}
                        placeholder="#000000"
                        className="flex-1 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Font Weight and Style */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Font Weight</Label>
                    <select
                      value={selectedLayer.fontWeight || "normal"}
                      onChange={(e) => updateTextLayer(selectedLayer.id, { fontWeight: e.target.value as any })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                      <option value="lighter">Light</option>
                      <option value="100">100</option>
                      <option value="200">200</option>
                      <option value="300">300</option>
                      <option value="400">400</option>
                      <option value="500">500</option>
                      <option value="600">600</option>
                      <option value="700">700</option>
                      <option value="800">800</option>
                      <option value="900">900</option>
                    </select>
                  </div>
                  <div>
                    <Label>Text Align</Label>
                    <select
                      value={selectedLayer.align || "left"}
                      onChange={(e) => updateTextLayer(selectedLayer.id, { align: e.target.value as any })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </div>

                {/* Enhanced keyboard shortcuts help */}
                <div className="mt-4 p-3 bg-gray-50 rounded text-xs">
                  <h4 className="font-medium mb-2">Keyboard Shortcuts:</h4>
                  <div className="space-y-1 text-gray-600">
                    <div>Ctrl+Z: Undo</div>
                    <div>Ctrl+Shift+Z: Redo</div>
                    <div>Arrow keys: Nudge (1px)</div>
                    <div>Shift + Arrow: Large nudge (10px)</div>
                    <div>Delete: Remove layer</div>
                    <div>Double-click: Edit text</div>
                    <div className="mt-2 font-medium">Transformation:</div>
                    <div>Drag: Move layer</div>
                    <div>Drag handles: Resize layer</div>
                    <div>Drag rotation handle: Rotate layer</div>
                    <div>Shift + drag: Constrain proportions</div>
                    <div className="mt-1 font-medium">Quick Reset:</div>
                    <div>Shift + R: Reset rotation</div>
                    <div>Shift + S: Reset scale</div>
                    <div className="mt-2 font-medium">Layer Order:</div>
                    <div>Ctrl + ↑/↓: Move up/down</div>
                    <div>Ctrl + Shift + ↑/↓: Send to back/front</div>
                  </div>
                </div>

                {/* Added export info */}
                {imageData && (
                  <div className="mt-4 p-3 bg-green-50 rounded text-xs">
                    <h4 className="font-medium mb-2 text-green-800">Export Info:</h4>
                    <div className="space-y-1 text-green-700">
                      <div>
                        Original: {imageData.width} × {imageData.height}px
                      </div>
                      <div>
                        Display: {imageData.displayWidth} × {imageData.displayHeight}px
                      </div>
                      <div className="text-green-600">Export preserves original resolution</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  {imageData ? "Select a text layer to edit properties" : "Upload a PNG image to start editing"}
                </p>

                {/* Added autosave status */}
                  <div className="p-3 bg-blue-50 rounded text-xs">
                    <div className="flex items-center gap-2 text-blue-800">
                    <Save className="w-3 h-3" />
                    <span>Auto-saving enabled</span>
                  </div>
                  <p className="text-blue-600 mt-1">Your work is automatically saved every 2 seconds</p>
                </div>
              </div>
            )}
          </Card>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex p-8 bg-gray-100 min-h-0 items-center justify-center relative">

            {imageData ? (
              <CanvasWrapper
                imageData={imageData}
                textLayers={textLayers}
                selectedLayerId={selectedLayerId}
                onLayerSelect={setSelectedLayerId}
                onLayerUpdate={updateTextLayer}
              />
            ) : (
              <div className="text-center w-full max-w-2xl mx-auto">
                {/* Content Section - Moved Above Upload Area */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Upload a PNG Image</h3>
                  <p className="text-gray-600 text-lg leading-relaxed max-w-md mx-auto">
                    Select a PNG file to start adding text overlays, or drag and drop a PNG file directly
                  </p>
                </div>

                {/* Upload Area */}
                <div 
                  className={`w-80 h-80 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 mx-auto ${
                    isDragOver 
                      ? 'border-gray-600 bg-gray-100' 
                      : 'border-gray-300 hover:border-gray-500 hover:bg-gray-50'
                  }`}
                  onClick={triggerFileInput}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {/* Upload Icon with Background */}
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
                    isDragOver ? 'bg-gray-200' : 'bg-gray-100'
                  }`}>
                    <Upload className={`w-10 h-10 ${isDragOver ? 'text-gray-600' : 'text-gray-500'}`} />
                  </div>
                  
                  {/* Upload Text */}
                  <p className={`text-lg font-medium mb-2 ${
                    isDragOver ? 'text-gray-700' : 'text-gray-600'
                  }`}>
                    {isDragOver ? 'Drop PNG here' : 'Click or drag PNG here'}
                  </p>
                  
                  {/* File Type Info */}
                  <p className={`text-sm ${isDragOver ? 'text-gray-600' : 'text-gray-500'}`}>
                    PNG files only
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Layers Panel */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <h3 className="font-semibold text-gray-700">Layers Panel</h3>
            <p className="text-xs text-gray-500 mt-1">Scroll to see all layers</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Layers</h3>
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Top to Bottom
              </div>
            </div>

            {textLayers.length > 0 ? (
              <div className="space-y-2 pb-2">
                {textLayers
                  .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                  .map((layer, index) => (
                  <div
                    key={layer.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedLayerId === layer.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    } ${layer.locked ? "opacity-60" : ""}`}
                    onClick={() => setSelectedLayerId(layer.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                          {textLayers.length - index}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{layer.text || "Empty Text"}</p>
                          <p className="text-xs text-gray-500">
                            {layer.fontFamily} • {layer.fontSize}px
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            bringToFront(layer.id)
                          }}
                          className="h-6 w-6 p-0"
                          title="Bring to Front"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveLayerUp(layer.id)
                          }}
                          className="h-6 w-6 p-0"
                          title="Move Up"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            moveLayerDown(layer.id)
                          }}
                          className="h-6 w-6 p-0"
                          title="Move Down"
                        >
                          ↓
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation()
                            sendToBack(layer.id)
                          }}
                          className="h-6 w-6 p-0"
                          title="Send to Back"
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                No text layers yet. Add some text to get started!
              </p>
            )}
          </Card>
          </div>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/png" onChange={handleFileInputChange} className="hidden" />
      <input ref={projectImportRef} type="file" accept=".json" onChange={handleImportProject} className="hidden" />
    </div>
  )
}
