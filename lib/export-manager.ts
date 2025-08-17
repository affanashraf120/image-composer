import type { ImageData, TextLayer } from "./editor-store"

export class ExportManager {
  // Export the composition as PNG at original resolution using native Canvas API
  static async exportToPNG(imageData: ImageData, textLayers: TextLayer[], filename = "composition.png"): Promise<void> {
    try {
      console.log("Starting export with:", { imageData, textLayersCount: textLayers.length })
      
      // Calculate scale factor from display to original dimensions
      const scaleX = imageData.width / imageData.displayWidth
      const scaleY = imageData.height / imageData.displayHeight
      
      console.log("Scale factors:", { scaleX, scaleY, originalWidth: imageData.width, originalHeight: imageData.height, displayWidth: imageData.displayWidth, displayHeight: imageData.displayHeight })

      // Create offscreen canvas at original dimensions
      const canvas = document.createElement("canvas")
      canvas.width = imageData.width
      canvas.height = imageData.height
      const ctx = canvas.getContext("2d")
      
      if (!ctx) {
        throw new Error("Failed to get 2D canvas context")
      }

      // Load and draw background image
      const img = new Image()
      img.crossOrigin = "anonymous"

      console.log("Loading image from:", imageData.src)
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          console.log("Image loaded successfully:", { width: img.width, height: img.height })
          resolve()
        }
        img.onerror = (error) => {
          console.error("Image loading error:", error)
          reject(new Error("Failed to load image"))
        }
        img.src = imageData.src
      })

      // Draw background image
      ctx.drawImage(img, 0, 0, imageData.width, imageData.height)
      console.log("Background image drawn")

      // Sort text layers by zIndex to maintain proper stacking order
      const sortedTextLayers = [...textLayers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
      
      console.log("Sorted text layers:", sortedTextLayers.map(l => ({ id: l.id, text: l.text, x: l.x, y: l.y, zIndex: l.zIndex, visible: l.visible })))
      
      // Draw text layers scaled to original dimensions
      for (const textLayer of sortedTextLayers) {
        if (textLayer.visible === false) {
          console.log("Skipping hidden layer:", textLayer.id)
          continue
        }
        
        console.log("Drawing layer:", { id: textLayer.id, text: textLayer.text, x: textLayer.x, y: textLayer.y, fontSize: textLayer.fontSize, fontFamily: textLayer.fontFamily })

        ctx.save()

        // Set text properties first
        const scaledFontSize = textLayer.fontSize * Math.min(scaleX, scaleY)
        const fontWeight = textLayer.fontWeight || "normal"
        const fontFamily = textLayer.fontFamily || "Arial"
        ctx.font = `${fontWeight} ${scaledFontSize}px ${fontFamily}`
        
        console.log("Font set:", { fontWeight, scaledFontSize, fontFamily, originalFontSize: textLayer.fontSize })
        ctx.fillStyle = textLayer.fill
        ctx.globalAlpha = textLayer.opacity
        ctx.textAlign = textLayer.align as CanvasTextAlign
        ctx.textBaseline = "top"

        // Apply text shadow
        if (textLayer.shadowBlur > 0) {
          ctx.shadowColor = textLayer.shadowColor
          ctx.shadowBlur = textLayer.shadowBlur * Math.min(scaleX, scaleY)
          ctx.shadowOffsetX = textLayer.shadowOffsetX * scaleX
          ctx.shadowOffsetY = textLayer.shadowOffsetY * scaleY
        }

        // Calculate position for transformations
        const x = textLayer.x * scaleX
        const y = textLayer.y * scaleY

        // Apply transformations if needed
        if (textLayer.rotation || textLayer.scaleX || textLayer.scaleY) {
          // Calculate center point for rotation/scale
          const centerX = x + (textLayer.width ? (textLayer.width * scaleX) / 2 : 0)
          const centerY = y + scaledFontSize / 2

          ctx.translate(centerX, centerY)
          if (textLayer.rotation) {
            ctx.rotate((textLayer.rotation * Math.PI) / 180)
          }
          if (textLayer.scaleX || textLayer.scaleY) {
            ctx.scale(textLayer.scaleX || 1, textLayer.scaleY || 1)
          }
          ctx.translate(-centerX, -centerY)
        }

        // Draw multi-line text
        const lines = textLayer.text.split("\n")
        const lineHeight = scaledFontSize * textLayer.lineHeight

        lines.forEach((line, index) => {
          const lineY = y + index * lineHeight
          let lineX = x

          // Adjust x position based on alignment
          if (textLayer.align === "center" && textLayer.width) {
            lineX = x + (textLayer.width * scaleX) / 2
          } else if (textLayer.align === "right" && textLayer.width) {
            lineX = x + textLayer.width * scaleX
          }

          ctx.fillText(line, lineX, lineY)
          console.log("Drew text line:", { line, x: lineX, y: lineY, align: textLayer.align })
        })

        ctx.restore()
        console.log("Finished drawing layer:", textLayer.id)
      }

      console.log("All layers drawn, creating blob...")
      
      // Convert to blob and download
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error("Failed to create image blob")
            throw new Error("Failed to create image blob")
          }

          console.log("Blob created successfully, size:", blob.size)
          
          const link = document.createElement("a")
          link.download = filename
          link.href = URL.createObjectURL(blob)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(link.href)
          
          console.log("Export completed successfully:", filename)
        },
        "image/png",
        1.0,
      )
    } catch (error) {
      console.error("Export failed:", error)
      if (error instanceof Error) {
        throw new Error(`Export failed: ${error.message}`)
      } else {
        throw new Error("Failed to export image. Please try again.")
      }
    }
  }

  // Export project data as JSON
  static exportProjectData(imageData: ImageData | null, textLayers: TextLayer[], filename = "project.json"): void {
    const projectData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      imageData,
      textLayers,
    }

    const dataStr = JSON.stringify(projectData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })

    const link = document.createElement("a")
    link.download = filename
    link.href = URL.createObjectURL(dataBlob)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(link.href)
  }

  // Import project data from JSON
  static async importProjectData(file: File): Promise<{
    imageData: ImageData | null
    textLayers: TextLayer[]
  }> {
    try {
      const text = await file.text()
      const projectData = JSON.parse(text)

      if (!projectData.version || !projectData.textLayers) {
        throw new Error("Invalid project file format")
      }

      return {
        imageData: projectData.imageData || null,
        textLayers: projectData.textLayers || [],
      }
    } catch (error) {
      console.error("Import failed:", error)
      throw new Error("Failed to import project file. Please check the file format.")
    }
  }
}
