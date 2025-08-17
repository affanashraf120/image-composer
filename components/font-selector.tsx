"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, X, Search } from "lucide-react"
import { fontManager, GOOGLE_FONTS, SYSTEM_FONTS, type CustomFont } from "@/lib/font-manager"

interface FontSelectorProps {
  selectedFont: string
  onFontChange: (fontFamily: string) => void
  customFonts: CustomFont[]
  onCustomFontAdd: (font: CustomFont) => void
  onCustomFontRemove: (fontId: string) => void
}

export function FontSelector({
  selectedFont,
  onFontChange,
  customFonts,
  onCustomFontAdd,
  onCustomFontRemove,
}: FontSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [loadingFont, setLoadingFont] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<string>("google")
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Determine which tab should be active based on the selected font
  useEffect(() => {
    if (customFonts.some(font => font.family === selectedFont)) {
      setActiveTab("custom")
    } else if (GOOGLE_FONTS.some(font => font.family === selectedFont)) {
      setActiveTab("google")
    } else if (SYSTEM_FONTS.includes(selectedFont)) {
      setActiveTab("system")
    } else {
      // Default to system tab if font not found
      setActiveTab("system")
    }
  }, [selectedFont, customFonts])

  // Initialize font manager on client side
  useEffect(() => {
    // Ensure we're on the client side and the component is mounted
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // Use a small delay to ensure the component is fully mounted
      const timer = setTimeout(() => {
        try {
          fontManager.initialize()
        } catch (error) {
          console.log('Font manager initialization failed:', error)
        }
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [])

  const handleGoogleFontSelect = useCallback(
    async (fontFamily: string) => {
      try {
        if (fontManager.isFontLoaded(fontFamily)) {
          onFontChange(fontFamily)
          return
        }

        setLoadingFont(fontFamily)
        const googleFont = GOOGLE_FONTS.find((f) => f.family === fontFamily)
        
        // Try the main method first
        let success = await fontManager.loadGoogleFontWithRetry(fontFamily, googleFont?.variants, 2)
        
        // If that fails, try CDN method
        if (!success) {
          console.log(`Trying CDN method for ${fontFamily}`)
          success = await fontManager.loadFontFromCDN(fontFamily, "400", "normal")
        }

        // If CDN also fails, try simple method
        if (!success) {
          console.log(`Trying simple method for ${fontFamily}`)
          success = await fontManager.loadFontSimple(fontFamily)
        }

        if (success) {
          onFontChange(fontFamily)
        } else {
          console.error(`Failed to load Google Font after all methods: ${fontFamily}`)
          alert(`Failed to load font "${fontFamily}". Please try again or use a different font.`)
        }
      } catch (error) {
        console.error(`Error loading Google Font: ${fontFamily}`, error)
        alert(`Error loading font "${fontFamily}". Please try again.`)
      } finally {
        setLoadingFont(null)
      }
    },
    [onFontChange],
  )

  const handleCustomFontUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const customFont = await fontManager.loadCustomFont(file)
        if (customFont) {
          onCustomFontAdd(customFont)
          onFontChange(customFont.family)
          setActiveTab("custom") // Switch to custom tab after upload
        } else {
          alert("Failed to load custom font. Please ensure it's a valid TTF, OTF, WOFF, or WOFF2 file.")
        }
      } catch (error) {
        console.error("Error uploading custom font:", error)
        alert("Failed to load custom font. Please try again.")
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    },
    [onCustomFontAdd, onFontChange],
  )

  const handleCustomFontRemove = useCallback(
    (fontId: string) => {
      const font = customFonts.find(f => f.id === fontId)
      if (font && font.family === selectedFont) {
        // If removing the currently selected font, switch to a system font
        onFontChange("Arial")
        setActiveTab("system") // Switch to system tab
      }
      fontManager.removeCustomFont(fontId)
      onCustomFontRemove(fontId)
    },
    [onCustomFontRemove, customFonts, selectedFont, onFontChange],
  )

  // Filter fonts based on search and category
  const filteredGoogleFonts = GOOGLE_FONTS.filter((font) => {
    const matchesSearch = font.family.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || font.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const filteredSystemFonts = SYSTEM_FONTS.filter((font) => font.toLowerCase().includes(searchTerm.toLowerCase()))

  const filteredCustomFonts = customFonts.filter((font) => font.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-4">
      {/* Font Status Indicator */}
      <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>System: {SYSTEM_FONTS.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span>HTML: {GOOGLE_FONTS.filter(f => fontManager.isFontLoaded(f.family)).length}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
          <span>Custom: {customFonts.length}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search fonts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="sans-serif">Sans Serif</SelectItem>
            <SelectItem value="serif">Serif</SelectItem>
            <SelectItem value="monospace">Monospace</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom styled tabs to prevent overlap */}
      <div className="w-full">
        <div className="bg-gray-100 rounded-lg p-1 flex gap-1">
          <button
            onClick={() => setActiveTab("system")}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
              activeTab === "system"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            System
          </button>
          <button
            onClick={() => setActiveTab("google")}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
              activeTab === "google"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Google Fonts
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
              activeTab === "custom"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "system" && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filteredSystemFonts.map((font) => {
            const isSelected = selectedFont === font
            
            return (
              <button
                key={font}
                onClick={() => onFontChange(font)}
                className={`w-full p-2 text-left border rounded hover:bg-gray-50 transition-colors ${
                  isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
                }`}
                style={{ fontFamily: font }}
                title="System font (always available)"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{font}</div>
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Font available"></div>
                </div>
                <div className="text-sm text-gray-500">The quick brown fox jumps</div>
              </button>
            )
          })}
        </div>
      )}

      {activeTab === "google" && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {filteredGoogleFonts.map((font) => {
            const isLoaded = fontManager.isFontLoaded(font.family)
            const isSelected = selectedFont === font.family
            
            return (
              <button
                key={font.family}
                onClick={() => handleGoogleFontSelect(font.family)}
                disabled={loadingFont === font.family}
                className={`w-full p-2 text-left border rounded hover:bg-gray-50 transition-colors disabled:opacity-50 ${
                  isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
                }`}
                style={{ fontFamily: isLoaded ? font.family : "inherit" }}
                title={isLoaded ? "Font loaded via HTML" : "Font not loaded yet"}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{font.family}</div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-400 capitalize">{font.category}</div>
                    {isLoaded ? (
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Font loaded via HTML"></div>
                    ) : (
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Font not loaded yet"></div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {loadingFont === font.family ? "Loading..." : "The quick brown fox jumps"}
                </div>
                {!isLoaded && loadingFont !== font.family && (
                  <div className="text-xs text-yellow-600 mt-1">
                    Click to load font
                  </div>
                )}
              </button>
            )
          })}
          
          {/* Fallback message */}
          {filteredGoogleFonts.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">No Google Fonts available</p>
              <p className="text-xs text-gray-400 mt-1">Try system fonts instead</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "custom" && (
        <div className="space-y-2">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Custom Font
            </Button>
            <p className="text-xs text-gray-500 mt-2">Supports TTF, OTF, WOFF, and WOFF2 formats</p>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-2">
            {filteredCustomFonts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No custom fonts uploaded yet</p>
                <p className="text-xs text-gray-400 mt-1">Upload a font file to get started</p>
              </div>
            ) : (
              filteredCustomFonts.map((font) => {
                const isSelected = selectedFont === font.family
                
                return (
                  <div
                    key={font.id}
                    className={`p-2 border rounded transition-colors ${
                      isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onFontChange(font.family)}
                        className="flex-1 text-left"
                        style={{ fontFamily: font.family }}
                        title="Custom font loaded"
                      >
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{font.name}</div>
                          <div className="w-2 h-2 bg-green-500 rounded-full" title="Font loaded"></div>
                        </div>
                        <div className="text-sm text-gray-500">The quick brown fox jumps</div>
                      </button>
                      <Button
                        onClick={() => handleCustomFontRemove(font.id)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            onChange={handleCustomFontUpload}
            className="hidden"
          />
        </div>
      )}
    </div>
  )
}
