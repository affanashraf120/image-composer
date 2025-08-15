interface AutosaveData {
  imageData: any
  textLayers: any[]
  customFonts: any[]
  timestamp: number
}

export class AutosaveManager {
  private static readonly STORAGE_KEY = "image-text-composer-autosave"
  private static readonly SAVE_INTERVAL = 2000 // 2 seconds

  private static saveTimeout: NodeJS.Timeout | null = null

  // Save current state to localStorage with debouncing
  static saveState(imageData: any, textLayers: any[], customFonts: any[] = []): void {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    // Debounce saves to avoid excessive localStorage writes
    this.saveTimeout = setTimeout(() => {
      try {
        const autosaveData: AutosaveData = {
          imageData,
          textLayers,
          customFonts,
          timestamp: Date.now(),
        }

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(autosaveData))
        console.log("Autosaved at", new Date().toLocaleTimeString())
      } catch (error) {
        console.error("Autosave failed:", error)
      }
    }, this.SAVE_INTERVAL)
  }

  // Load saved state from localStorage
  static loadState(): AutosaveData | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY)
      if (!saved) return null

      const autosaveData: AutosaveData = JSON.parse(saved)

      // Check if save is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000
      if (Date.now() - autosaveData.timestamp > maxAge) {
        this.clearSave()
        return null
      }

      return autosaveData
    } catch (error) {
      console.error("Failed to load autosave:", error)
      return null
    }
  }

  // Clear saved state
  static clearSave(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      console.error("Failed to clear autosave:", error)
    }
  }

  // Check if there's a saved state
  static hasSavedState(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null
  }

  // Get save timestamp
  static getSaveTimestamp(): Date | null {
    const saved = this.loadState()
    return saved ? new Date(saved.timestamp) : null
  }
}
