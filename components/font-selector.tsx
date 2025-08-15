"use client"

import type React from "react"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleGoogleFontSelect = useCallback(
    async (fontFamily: string) => {
      if (fontManager.isFontLoaded(fontFamily)) {
        onFontChange(fontFamily)
        return
      }

      setLoadingFont(fontFamily)
      const googleFont = GOOGLE_FONTS.find((f) => f.family === fontFamily)
      const success = await fontManager.loadGoogleFont(fontFamily, googleFont?.variants)

      if (success) {
        onFontChange(fontFamily)
      }
      setLoadingFont(null)
    },
    [onFontChange],
  )

  const handleCustomFontUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const customFont = await fontManager.loadCustomFont(file)
      if (customFont) {
        onCustomFontAdd(customFont)
        onFontChange(customFont.family)
      } else {
        alert("Failed to load custom font. Please ensure it's a valid TTF, OTF, WOFF, or WOFF2 file.")
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
      fontManager.removeCustomFont(fontId)
      onCustomFontRemove(fontId)
    },
    [onCustomFontRemove],
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

      <Tabs defaultValue="google" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="google">Google Fonts</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-2 max-h-60 overflow-y-auto">
          {filteredSystemFonts.map((font) => (
            <button
              key={font}
              onClick={() => onFontChange(font)}
              className={`w-full p-2 text-left border rounded hover:bg-gray-50 transition-colors ${
                selectedFont === font ? "border-blue-500 bg-blue-50" : "border-gray-200"
              }`}
              style={{ fontFamily: font }}
            >
              <div className="font-medium">{font}</div>
              <div className="text-sm text-gray-500">The quick brown fox jumps</div>
            </button>
          ))}
        </TabsContent>

        <TabsContent value="google" className="space-y-2 max-h-60 overflow-y-auto">
          {filteredGoogleFonts.map((font) => (
            <button
              key={font.family}
              onClick={() => handleGoogleFontSelect(font.family)}
              disabled={loadingFont === font.family}
              className={`w-full p-2 text-left border rounded hover:bg-gray-50 transition-colors disabled:opacity-50 ${
                selectedFont === font.family ? "border-blue-500 bg-blue-50" : "border-gray-200"
              }`}
              style={{ fontFamily: fontManager.isFontLoaded(font.family) ? font.family : "inherit" }}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{font.family}</div>
                <div className="text-xs text-gray-400 capitalize">{font.category}</div>
              </div>
              <div className="text-sm text-gray-500">
                {loadingFont === font.family ? "Loading..." : "The quick brown fox jumps"}
              </div>
            </button>
          ))}
        </TabsContent>

        <TabsContent value="custom" className="space-y-2">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload Custom Font
            </Button>
            <p className="text-xs text-gray-500 mt-2">Supports TTF, OTF, WOFF, and WOFF2 formats</p>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-2">
            {filteredCustomFonts.map((font) => (
              <div
                key={font.id}
                className={`p-2 border rounded transition-colors ${
                  selectedFont === font.family ? "border-blue-500 bg-blue-50" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onFontChange(font.family)}
                    className="flex-1 text-left"
                    style={{ fontFamily: font.family }}
                  >
                    <div className="font-medium">{font.name}</div>
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
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2"
            onChange={handleCustomFontUpload}
            className="hidden"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
