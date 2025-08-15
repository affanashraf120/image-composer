interface ImageData {
  src: string
  width: number
  height: number
  displayWidth: number
  displayHeight: number
}

interface TextLayer {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  fontWeight: string
  fill: string
  opacity: number
  align: string
  lineHeight: number
  letterSpacing: number
  shadowColor: string
  shadowBlur: number
  shadowOffsetX: number
  shadowOffsetY: number
  width?: number
  rotation?: number
  scaleX?: number
  scaleY?: number
  locked?: boolean
  visible?: boolean
}

export class ExportManager {
  // Export the composition as PNG at original resolution using native Canvas API
  static async exportToPNG(imageData: ImageData, textLayers: TextLayer[], filename = "composition.png"): Promise<void> {
    try {
      // Calculate scale factor from display to original dimensions
      const scaleX = imageData.width / imageData.displayWidth
      const scaleY = imageData.height / imageData.displayHeight

      // Create offscreen canvas at original dimensions
      const canvas = document.createElement("canvas")
      canvas.width = imageData.width
      canvas.height = imageData.height
      const ctx = canvas.getContext("2d")!

      // Load and draw background image
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error("Failed to load image"))
        img.src = imageData.src
      })

      // Draw background image
      ctx.drawImage(img, 0, 0, imageData.width, imageData.height)

      // Draw text layers scaled to original dimensions
      for (const textLayer of textLayers) {
        if (textLayer.visible === false) continue

        ctx.save()

        // Apply transformations
        const centerX = textLayer.x * scaleX + (textLayer.width ? (textLayer.width * scaleX) / 2 : 0)
        const centerY = textLayer.y * scaleY + (textLayer.fontSize * Math.min(scaleX, scaleY)) / 2

        ctx.translate(centerX, centerY)
        if (textLayer.rotation) {
          ctx.rotate((textLayer.rotation * Math.PI) / 180)
        }
        if (textLayer.scaleX || textLayer.scaleY) {
          ctx.scale(textLayer.scaleX || 1, textLayer.scaleY || 1)
        }
        ctx.translate(-centerX, -centerY)

        // Set text properties
        const scaledFontSize = textLayer.fontSize * Math.min(scaleX, scaleY)
        ctx.font = `${textLayer.fontWeight} ${scaledFontSize}px ${textLayer.fontFamily}`
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

        // Draw multi-line text
        const lines = textLayer.text.split("\n")
        const lineHeight = scaledFontSize * textLayer.lineHeight
        const startY = textLayer.y * scaleY

        lines.forEach((line, index) => {
          const y = startY + index * lineHeight
          let x = textLayer.x * scaleX

          // Adjust x position based on alignment
          if (textLayer.align === "center" && textLayer.width) {
            x += (textLayer.width * scaleX) / 2
          } else if (textLayer.align === "right" && textLayer.width) {
            x += textLayer.width * scaleX
          }

          ctx.fillText(line, x, y)
        })

        ctx.restore()
      }

      // Convert to blob and download
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            throw new Error("Failed to create image blob")
          }

          const link = document.createElement("a")
          link.download = filename
          link.href = URL.createObjectURL(blob)
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(link.href)
        },
        "image/png",
        1.0,
      )
    } catch (error) {
      console.error("Export failed:", error)
      throw new Error("Failed to export image. Please try again.")
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
