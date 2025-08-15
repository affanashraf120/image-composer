// Font management utilities
export interface CustomFont {
  id: string
  name: string
  family: string
  url: string
  type: "ttf" | "otf" | "woff" | "woff2"
  loaded: boolean
}

export interface GoogleFont {
  family: string
  variants: string[]
  category: string
  loaded: boolean
}

// Popular Google Fonts with their variants
export const GOOGLE_FONTS: GoogleFont[] = [
  { family: "Open Sans", variants: ["300", "400", "600", "700"], category: "sans-serif", loaded: false },
  { family: "Roboto", variants: ["300", "400", "500", "700"], category: "sans-serif", loaded: false },
  { family: "Lato", variants: ["300", "400", "700"], category: "sans-serif", loaded: false },
  { family: "Montserrat", variants: ["300", "400", "600", "700"], category: "sans-serif", loaded: false },
  { family: "Source Sans Pro", variants: ["300", "400", "600", "700"], category: "sans-serif", loaded: false },
  { family: "Oswald", variants: ["300", "400", "600", "700"], category: "sans-serif", loaded: false },
  { family: "Raleway", variants: ["300", "400", "600", "700"], category: "sans-serif", loaded: false },
  { family: "PT Sans", variants: ["400", "700"], category: "sans-serif", loaded: false },
  { family: "Ubuntu", variants: ["300", "400", "500", "700"], category: "sans-serif", loaded: false },
  { family: "Nunito", variants: ["300", "400", "600", "700"], category: "sans-serif", loaded: false },
  { family: "Merriweather", variants: ["300", "400", "700"], category: "serif", loaded: false },
  { family: "Playfair Display", variants: ["400", "700"], category: "serif", loaded: false },
  { family: "Lora", variants: ["400", "700"], category: "serif", loaded: false },
  { family: "Crimson Text", variants: ["400", "600", "700"], category: "serif", loaded: false },
  { family: "Libre Baskerville", variants: ["400", "700"], category: "serif", loaded: false },
  { family: "Fira Code", variants: ["300", "400", "500", "700"], category: "monospace", loaded: false },
  { family: "Source Code Pro", variants: ["300", "400", "600", "700"], category: "monospace", loaded: false },
  { family: "JetBrains Mono", variants: ["300", "400", "500", "700"], category: "monospace", loaded: false },
]

// System fonts that don't need loading
export const SYSTEM_FONTS = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Courier New",
  "Impact",
  "Comic Sans MS",
]

class FontManager {
  private loadedFonts = new Set<string>()
  private customFonts = new Map<string, CustomFont>()

  // Load Google Font dynamically
  async loadGoogleFont(fontFamily: string, variants: string[] = ["400"]): Promise<boolean> {
    if (this.loadedFonts.has(fontFamily)) {
      return true
    }

    try {
      // Create font face declarations for each variant
      const fontPromises = variants.map(async (variant) => {
        const weight = variant.replace(/[^0-9]/g, "") || "400"
        const style = variant.includes("italic") ? "italic" : "normal"

        const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@${weight}&display=swap`

        // Load the CSS
        const response = await fetch(fontUrl)
        const css = await response.text()

        // Extract the actual font file URL from the CSS
        const fontFileMatch = css.match(/url$$(https:\/\/fonts\.gstatic\.com[^)]+)$$/)
        if (fontFileMatch) {
          const fontFace = new FontFace(fontFamily, `url(${fontFileMatch[1]})`, {
            weight,
            style,
          })

          await fontFace.load()
          document.fonts.add(fontFace)
        }
      })

      await Promise.all(fontPromises)
      this.loadedFonts.add(fontFamily)
      return true
    } catch (error) {
      console.error(`Failed to load Google Font: ${fontFamily}`, error)
      return false
    }
  }

  // Load custom font from file
  async loadCustomFont(file: File): Promise<CustomFont | null> {
    try {
      const fontId = `custom-${Date.now()}`
      const fontUrl = URL.createObjectURL(file)
      const fontName = file.name.replace(/\.[^/.]+$/, "")
      const fontType = file.name.split(".").pop()?.toLowerCase() as CustomFont["type"]

      if (!["ttf", "otf", "woff", "woff2"].includes(fontType)) {
        throw new Error("Unsupported font format")
      }

      // Create FontFace and load it
      const fontFace = new FontFace(fontName, `url(${fontUrl})`)
      await fontFace.load()
      document.fonts.add(fontFace)

      const customFont: CustomFont = {
        id: fontId,
        name: fontName,
        family: fontName,
        url: fontUrl,
        type: fontType,
        loaded: true,
      }

      this.customFonts.set(fontId, customFont)
      return customFont
    } catch (error) {
      console.error("Failed to load custom font:", error)
      return null
    }
  }

  // Get all available fonts
  getAllFonts(): { system: string[]; google: GoogleFont[]; custom: CustomFont[] } {
    return {
      system: SYSTEM_FONTS,
      google: GOOGLE_FONTS,
      custom: Array.from(this.customFonts.values()),
    }
  }

  // Check if font is loaded
  isFontLoaded(fontFamily: string): boolean {
    return this.loadedFonts.has(fontFamily) || SYSTEM_FONTS.includes(fontFamily)
  }

  // Remove custom font
  removeCustomFont(fontId: string): boolean {
    const font = this.customFonts.get(fontId)
    if (font) {
      // Remove from document.fonts
      const fontFaces = Array.from(document.fonts).filter((f) => f.family === font.family)
      fontFaces.forEach((f) => document.fonts.delete(f))

      // Revoke object URL
      URL.revokeObjectURL(font.url)

      // Remove from map
      this.customFonts.delete(fontId)
      return true
    }
    return false
  }
}

export const fontManager = new FontManager()
