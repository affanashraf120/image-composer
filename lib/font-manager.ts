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
  private initialized = false

  constructor() {
    // Initialize with system fonts as loaded
    SYSTEM_FONTS.forEach(font => this.loadedFonts.add(font))
    
    // Only detect HTML fonts on the client side
    if (typeof window !== 'undefined') {
      this.detectHTMLFonts()
    }
  }

  // Initialize font manager on client side
  initialize() {
    if (this.initialized || typeof window === 'undefined') {
      return
    }
    
    this.detectHTMLFonts()
    this.initialized = true
  }

  // Detect fonts already loaded via HTML links
  private detectHTMLFonts() {
    // Check if document.fonts is available
    if (typeof document === 'undefined' || !document.fonts) {
      return
    }

    // Check for common Google Fonts that might be loaded via HTML
    const htmlFonts = [
      'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro', 'Oswald',
      'Raleway', 'PT Sans', 'Ubuntu', 'Nunito', 'Merriweather', 'Playfair Display',
      'Lora', 'Crimson Text', 'Libre Baskerville', 'Fira Code', 'Source Code Pro', 'JetBrains Mono'
    ]
    
    htmlFonts.forEach(font => {
      try {
        if (document.fonts.check(`12px "${font}"`)) {
          this.loadedFonts.add(font)
          console.log(`Font ${font} detected as already loaded via HTML`)
        }
      } catch (error) {
        console.log(`Could not check font ${font}:`, error)
      }
    })
  }

  // Load Google Font dynamically
  async loadGoogleFont(fontFamily: string, variants: string[] = ["400"]): Promise<boolean> {
    if (this.loadedFonts.has(fontFamily)) {
      return true
    }

    // Check if we're on the client side
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.log('Font loading not available on server side')
      return false
    }

    try {
      // Use Google Fonts CSS import method (more reliable and free)
      const fontUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@${variants.join(";")}&display=swap`
      
      // Check if the font is already loaded via CSS
      if (document.fonts && document.fonts.check(`12px "${fontFamily}"`)) {
        this.loadedFonts.add(fontFamily)
        return true
      }

      // Create a link element to load the CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = fontUrl
      
      // Wait for the CSS to load
      await new Promise((resolve, reject) => {
        link.onload = resolve
        link.onerror = reject
        document.head.appendChild(link)
      })

      // Wait a bit for the font to be available
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Check if the font is available
      if (document.fonts && document.fonts.check(`12px "${fontFamily}"`)) {
        this.loadedFonts.add(fontFamily)
        return true
      } else {
        // Try alternative method: direct font loading
        return await this.loadGoogleFontDirect(fontFamily, variants)
      }
    } catch (error) {
      console.error(`Failed to load Google Font: ${fontFamily}`, error)
      // Try alternative method
      return await this.loadGoogleFontDirect(fontFamily, variants)
    }
  }

  // Alternative method: Load Google Fonts directly
  private async loadGoogleFontDirect(fontFamily: string, variants: string[] = ["400"]): Promise<boolean> {
    // Check if we're on the client side
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.log('Font loading not available on server side')
      return false
    }

    try {
      // Use the Google Fonts API v2 with direct font URLs
      const fontPromises = variants.map(async (variant) => {
        const weight = variant.replace(/[^0-9]/g, "") || "400"
        const style = variant.includes("italic") ? "italic" : "normal"

        // Direct font file URLs for common Google Fonts
        const fontUrls = this.getDirectFontUrls(fontFamily, weight, style)
        
        for (const fontUrl of fontUrls) {
          try {
            const fontFace = new FontFace(fontFamily, `url(${fontUrl})`, {
              weight,
              style,
            })

            await fontFace.load()
            document.fonts.add(fontFace)
            return true
          } catch (e) {
            console.log(`Failed to load font from ${fontUrl}, trying next...`)
            continue
          }
        }
        return false
      })

      const results = await Promise.all(fontPromises)
      const success = results.some(result => result)
      
      if (success) {
        this.loadedFonts.add(fontFamily)
      }
      
      return success
    } catch (error) {
      console.error(`Direct font loading failed for: ${fontFamily}`, error)
      return false
    }
  }

  // Get direct font URLs for common Google Fonts
  private getDirectFontUrls(fontFamily: string, weight: string, style: string): string[] {
    const fontName = fontFamily.replace(/ /g, "")
    const baseUrls = [
      `https://fonts.gstatic.com/s/${fontName.toLowerCase()}/v${this.getFontVersion(fontFamily)}/`,
      `https://fonts.gstatic.com/s/${fontName.toLowerCase()}/v${this.getFontVersion(fontFamily)}/`,
    ]
    
    const extensions = ['woff2', 'woff', 'ttf']
    const urls: string[] = []
    
    for (const baseUrl of baseUrls) {
      for (const ext of extensions) {
        urls.push(`${baseUrl}${fontName.toLowerCase()}-${weight}${style === 'italic' ? 'i' : ''}.${ext}`)
      }
    }
    
    return urls
  }

  // Get font version (simplified)
  private getFontVersion(fontFamily: string): string {
    // Common versions for popular fonts
    const versions: { [key: string]: string } = {
      'Roboto': '30',
      'Open Sans': '34',
      'Lato': '23',
      'Montserrat': '25',
      'Source Sans Pro': '21',
      'Oswald': '35',
      'Raleway': '26',
      'PT Sans': '17',
      'Ubuntu': '20',
      'Nunito': '25',
      'Merriweather': '30',
      'Playfair Display': '30',
      'Lora': '16',
      'Crimson Text': '19',
      'Libre Baskerville': '14',
      'Fira Code': '9',
      'Source Code Pro': '14',
      'JetBrains Mono': '13'
    }
    
    return versions[fontFamily] || '1'
  }

  // Load Google Font with retry
  async loadGoogleFontWithRetry(fontFamily: string, variants: string[] = ["400"], maxRetries: number = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const success = await this.loadGoogleFont(fontFamily, variants)
        if (success) {
          return true
        }
        
        if (attempt < maxRetries) {
          console.log(`Retrying to load font ${fontFamily}, attempt ${attempt + 1}/${maxRetries}`)
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        }
      } catch (error) {
        console.error(`Attempt ${attempt} failed for font ${fontFamily}:`, error)
        if (attempt === maxRetries) {
          return false
        }
      }
    }
    return false
  }

  // Load font from reliable CDN sources
  async loadFontFromCDN(fontFamily: string, weight: string = "400", style: string = "normal"): Promise<boolean> {
    if (this.loadedFonts.has(fontFamily)) {
      return true
    }

    // Check if we're on the client side
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.log('Font loading not available on server side')
      return false
    }

    try {
      // Use reliable CDN sources
      const cdnUrls = [
        // Google Fonts CDN (most reliable)
        `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@${weight}&display=swap`,
        // Alternative: jsDelivr CDN
        `https://cdn.jsdelivr.net/npm/@fontsource/${fontFamily.toLowerCase().replace(/ /g, "-")}@latest/index.css`,
        // Alternative: unpkg CDN
        `https://unpkg.com/@fontsource/${fontFamily.toLowerCase().replace(/ /g, "-")}@latest/index.css`
      ]

      for (const cdnUrl of cdnUrls) {
        try {
          if (cdnUrl.includes('fonts.googleapis.com')) {
            // Google Fonts method
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = cdnUrl
            
            await new Promise((resolve, reject) => {
              link.onload = resolve
              link.onerror = reject
              document.head.appendChild(link)
            })
            
            // Wait for font to load
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            if (document.fonts && document.fonts.check(`12px "${fontFamily}"`)) {
              this.loadedFonts.add(fontFamily)
              return true
            }
          } else {
            // Fontsource CDN method
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = cdnUrl
            
            await new Promise((resolve, reject) => {
              link.onload = resolve
              link.onerror = reject
              document.head.appendChild(link)
            })
            
            // Wait for font to load
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            if (document.fonts && document.fonts.check(`12px "${fontFamily}"`)) {
              this.loadedFonts.add(fontFamily)
              return true
            }
          }
        } catch (e) {
          console.log(`CDN ${cdnUrl} failed, trying next...`)
          continue
        }
      }
      
      return false
    } catch (error) {
      console.error(`CDN font loading failed for: ${fontFamily}`, error)
      return false
    }
  }

  // Simple method: Use a reliable web font service
  async loadFontSimple(fontFamily: string): Promise<boolean> {
    if (this.loadedFonts.has(fontFamily)) {
      return true
    }

    // Check if we're on the client side
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.log('Font loading not available on server side')
      return false
    }

    try {
      // Use a simple, reliable method
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}&display=swap`
      
      document.head.appendChild(link)
      
      // Wait a bit and check
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (document.fonts && document.fonts.check(`12px "${fontFamily}"`)) {
        this.loadedFonts.add(fontFamily)
        return true
      }
      
      return false
    } catch (error) {
      console.error(`Simple font loading failed for: ${fontFamily}`, error)
      return false
    }
  }

  // Load custom font from file
  async loadCustomFont(file: File): Promise<CustomFont | null> {
    // Check if we're on the client side
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.log('Font loading not available on server side')
      return null
    }

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
      this.loadedFonts.add(fontName) // Add to loaded fonts set
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
    // Always return true for system fonts
    if (SYSTEM_FONTS.includes(fontFamily)) {
      return true
    }
    
    // Check loaded fonts set
    if (this.loadedFonts.has(fontFamily)) {
      return true
    }
    
    // Try to check document.fonts if available
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        return document.fonts.check(`12px "${fontFamily}"`)
      } catch (error) {
        console.log(`Could not check font ${fontFamily}:`, error)
        return false
      }
    }
    
    return false
  }

  // Remove custom font
  removeCustomFont(fontId: string): boolean {
    const font = this.customFonts.get(fontId)
    if (font) {
      // Check if we're on the client side
      if (typeof document !== 'undefined' && document.fonts) {
        // Remove from document.fonts
        const fontFaces = Array.from(document.fonts).filter((f) => f.family === font.family)
        fontFaces.forEach((f) => document.fonts.delete(f))
      }

      // Remove from loaded fonts set
      this.loadedFonts.delete(font.family)

      // Revoke object URL
      if (typeof URL !== 'undefined') {
        URL.revokeObjectURL(font.url)
      }

      // Remove from map
      this.customFonts.delete(fontId)
      return true
    }
    return false
  }

  // Get custom font by family name
  getCustomFontByFamily(family: string): CustomFont | undefined {
    return Array.from(this.customFonts.values()).find(font => font.family === family)
  }

  // Force reload a font (useful for debugging)
  async reloadFont(fontFamily: string): Promise<boolean> {
    if (SYSTEM_FONTS.includes(fontFamily)) {
      return true // System fonts are always available
    }

    // Remove from loaded fonts to force reload
    this.loadedFonts.delete(fontFamily)

    // Try to reload
    const googleFont = GOOGLE_FONTS.find(f => f.family === fontFamily)
    if (googleFont) {
      return await this.loadGoogleFont(fontFamily, googleFont.variants)
    }

    // Check if it's a custom font
    const customFont = this.getCustomFontByFamily(fontFamily)
    if (customFont) {
      // Re-add to loaded fonts since custom fonts are already loaded
      this.loadedFonts.add(fontFamily)
      return true
    }

    return false
  }
}

export const fontManager = new FontManager()
