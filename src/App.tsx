import { useEffect, useMemo, useRef, useState } from 'react'
import { Menu, Trash } from 'lucide-react'
import * as d3 from 'd3'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { BE_URL, DEFAULT_CONVERSION_PARAMS } from './constants'
import type { ConversionFileRecord, ConversionLayers, FileRecord } from './types'

function App() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)
  const [conversionData, setConversionData] = useState<ConversionFileRecord | null>(null)
  const [conversionMetadata, setConversionMetadata] = useState<Record<string, any> | null>(null)
  const [selectedCompareFileId, setSelectedCompareFileId] = useState<string | null>(null)
  const [conversionCompareData, setConversionCompareData] = useState<ConversionFileRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')

  const svgRef = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null)
  const svgSourceRef = useRef<d3.Selection<d3.BaseType, unknown, null, undefined> | null>(null)
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)

  const layers = useMemo<ConversionLayers[]>(() => conversionMetadata?.cadviewer_LayerTable ?? [], [conversionMetadata])
  console.log(layers)

  const fetchFiles = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${BE_URL}/api/files`)
      if (!response.ok) {
        throw new Error('Failed to fetch files')
      }
      const { data } = await response.json()
      setFiles(data)
      setLoading(false)
    } catch (error) {
      console.log(error)
    }
  }

  const clearSVG = () => {
    if (svgRef.current !== null) {
      svgRef.current.remove()
      svgRef.current = null
    }
  }

  // --- Buttons ---
  function zoomIn() {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    svgRef.current.transition().call(zoomBehaviorRef.current.scaleBy, 2)
  }
  function zoomOut() {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    svgRef.current.transition().call(zoomBehaviorRef.current.scaleBy, 0.5)
  }
  function resetView() {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    svgRef.current.transition().call(zoomBehaviorRef.current.transform, d3.zoomIdentity)
  }
  // function zoomTo(transform) {
  //   if (!svgRef.current || !zoomBehaviorRef.current) return;
  //   svgRef.current.transition().call(zoomBehaviorRef.current.transform, transform)
  // }

  const handleCloseView = () => {
    clearSVG()
    setSelectedFileId(null)
    setConversionData(null)
    setSelectedCompareFileId(null)
    setConversionCompareData(null)
    setLoading(false)
    setLoadingMessage('')
  }

  const handleCloseCompareView = () => {
    clearSVG()
    setSelectedCompareFileId(null)
    setConversionCompareData(null)
    setLoading(false)
    setLoadingMessage('')
  }

  const handleCompareFile = async (compareFileId: string) => {
    try {
      setLoading(true)
      setLoadingMessage('Comparing file...')
      let response = await fetch(`${BE_URL}/api/conversions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: selectedFileId,
          parameters: [...DEFAULT_CONVERSION_PARAMS, { paramName: 'compare', paramValue: compareFileId }],
        }),
      })
      if (!response.ok) {
        throw new Error('Failed to compare file')
      }
      const { data: conversion } = await response.json()
      response = await fetch(`${BE_URL}/api/conversions/${conversion.conversionId}?wait=true`)
      if (!response.ok) {
        throw new Error('Failed to fetch comparison file')
      }
      const { data } = await response.json()
      setSelectedCompareFileId(compareFileId)
      setConversionCompareData(data)
      setLoading(false)
      setLoadingMessage('')
    } catch (error) {
      console.log(error)
      setLoading(false)
      setLoadingMessage('')
    }
  }

  const handleViewFile = async (fileId: string) => {
    try {
      setLoading(true)
      setLoadingMessage('Processing file...')
      let response = await fetch(`${BE_URL}/api/conversions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, parameters: DEFAULT_CONVERSION_PARAMS }),
      })
      if (!response.ok) {
        throw new Error('Failed to convert file')
      }
      const { data: conversion } = await response.json()
      response = await fetch(`${BE_URL}/api/conversions/${conversion.conversionId}?wait=true`)
      if (!response.ok) {
        throw new Error('Failed to fetch conversion file')
      }
      const { data } = await response.json()
      setSelectedFileId(fileId)
      setConversionData(data)
      setLoading(false)
      setLoadingMessage('')
    } catch (error) {
      console.log(error)
      setLoading(false)
      setLoadingMessage('')
    }
  }

  const handleDeleteFile = async (fileId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`${BE_URL}/api/files/${fileId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete file')
      }
      fetchFiles()
      setSelectedFileId(null)
      setConversionData(null)
      setLoading(false)
    } catch (error) {
      console.log(error)
    }
  }

  const handleUploadFile = async (file: File) => {
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`${BE_URL}/api/files`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        throw new Error('Failed to upload file')
      }
      fetchFiles()
      setLoading(false)
    } catch (error) {
      console.log(error)
    }
  }

  const handleToggleOnLayer = (layer: ConversionLayers) => {
    if (!svgSourceRef.current) return
    const svgSource = svgSourceRef.current
    console.log('Toggle on layer:', layer.Name)
    // This will reset visibility for all elements in the layer based on initial visibility status
    // Select all elements in svg with id equal to layer.Name and set each visibility equal to layer.off status
    console.log(svgSource.selectAll(`[cvjs\\:layername='${layer.Name}']`))
    svgSource.selectAll(`[cvjs\\:layername='${layer.Name}']`).attr('visibility', layer.Off ? 'hidden' : 'display')
  }

  const handleToggleOffLayer = (layer: ConversionLayers) => {
    console.log('here')
    if (!svgSourceRef.current) return
    const svgSource = svgSourceRef.current
    console.log('Toggle off layer:', layer.Name)
    // This will hide all elements in the layer
    // Select all with id equal to layer.Name and set visibility to hidden
    console.log(svgSource.selectAll(`[cvjs\\:layername='${layer.Name}']`))
    svgSource.selectAll(`[cvjs\\:layername='${layer.Name}']`).attr('visibility', 'hidden')
  }

  const handleLayerToggle = (layer: ConversionLayers, val: boolean) => {
    return val ? handleToggleOnLayer(layer) : handleToggleOffLayer(layer)
  }

  useEffect(() => {
    fetchFiles()
  }, [])

  useEffect(() => {
    const root = document.getElementById('floorplan-root')
    const uniqueId = `__${Math.random().toString(36).substring(2, 15)}_${Date.now().toString(36)}`
    const IMAGE_URL = conversionCompareData?.conversionUrl || conversionData?.conversionUrl || ''
    if (!IMAGE_URL) {
      return
    }

    async function start() {
      if (!root) return

      setLoading(true)
      setLoadingMessage('Fetching and rendering...')
      const res = await fetch(`${BE_URL}${IMAGE_URL}`)
      const svgText = await res.text()

      if (svgRef.current !== null) {
        svgRef.current.remove()
        svgRef.current = null
      }

      // Create SVG
      svgRef.current = d3
        .select(root)
        .append('svg')
        .attr('class', 'fp-svg floorplan-svg' + uniqueId)
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('xmlns', 'http://www.w3.org/2000/svg')

      const svg = svgRef.current

      // Group for zoom/pan
      const g = svg
        .append('g')
        .attr('class', 'fp-svg-group' + uniqueId + ' fp-svg-group')
        .attr('transform', 'translate(0,0) scale(1)')
        .html(svgText)

      // SVG Source
      svgSourceRef.current = g.select('svg').attr('class', 'fp-svg-source' + uniqueId + ' fp-svg-source')
      console.log(g.node())

      // Set svg viewBox to match the svg source
      const svgViewBox = svgSourceRef.current.attr('viewBox')
      const vb = svgViewBox.split(' ').map(Number)
      svg.attr('viewBox', svgViewBox)

      // Extract natural zoom for --tmsMinLineWidth compare to real root size
      const r = root.getBoundingClientRect()
      const naturalK = Math.min(r.width / vb[2], r.height / vb[3])

      // Setup initial style
      // Extract --tmsMinLineWidth from the style element
      const styleText = g.select('svg defs style').text();
      const match = styleText.match(/--tmsMinLineWidth\s*:\s*([^;]+);/);
      console.log(match)
      const baseMinLineWidth = match ? parseFloat(match[1].trim()) : 0.6;
      document.documentElement.style.setProperty('--tmsMinLineWidth', baseMinLineWidth.toString())
      svg.select('#cv_main_drawing').attr('stroke-width', 0) // Normalize svg text stroke

      // Zoom behavior with requestAnimationFrame
      zoomBehaviorRef.current = d3.zoom<SVGSVGElement, unknown>().scaleExtent([1, 24])
      let pending = false
      let swapLineWidthTimeout: NodeJS.Timeout | null = null
      let prevTransform: { k: number } | null = null
      zoomBehaviorRef.current.on('zoom', (event) => {
        if (pending) return
        requestAnimationFrame(() => {
          const t = event.transform
          g.attr('transform', `translate(${t.x},${t.y}) scale(${t.k})`)

          if (prevTransform && prevTransform.k !== t.k) {
            clearTimeout(swapLineWidthTimeout!)
            swapLineWidthTimeout = setTimeout(() => {
              const naturalScale = t.k * naturalK
              const calculatedWidth = baseMinLineWidth / naturalScale
              document.documentElement.style.setProperty('--tmsMinLineWidth', Math.min(baseMinLineWidth, calculatedWidth).toString())
            }, 250)
          }

          prevTransform = t
          pending = false
        })
      })

      svg.call(zoomBehaviorRef.current)
      svg.on('dblclick.zoom', null)
      zoomBehaviorRef.current.transform(svg, d3.zoomIdentity) // no transition at init

      // --- Click handling ---
      function getClickInfo(nativeEvent: MouseEvent) {
        const raw = d3.pointer(nativeEvent, svg.node())
        const t = d3.zoomTransform(svg.node()!)
        const mapped = t.invert(raw) // cleaner inverse mapping
        return { raw, mapped, transform: t }
      }

      let infoTimeout: NodeJS.Timeout | null = null
      svg.on('click', (event) => {
        const info = getClickInfo(event)

        const infoBox = document.getElementById('fp-info')
        if (infoBox) {
          infoBox.style.display = 'block'
          infoBox.textContent = `x: ${info.mapped[0].toFixed(1)}, y: ${info.mapped[1].toFixed(1)} (zoom ${info.transform.k.toFixed(2)})`
          clearTimeout(infoTimeout!)
          infoTimeout = setTimeout(() => {
            infoBox.style.display = 'none'
          }, 1600)
        }
      })

      // --- Metadata ---
      function extractMetadata(svgNode: SVGSVGElement) {
        const metadataObj: Record<string, any> = {}
        svgNode.querySelectorAll('metadata text').forEach((el) => {
          const key = el.getAttribute('id')
          let value = el.textContent?.trim() || ''

          // try to parse JSON-like values
          try {
            value = JSON.parse(value)
          } catch {
            // fallback: keep as string
          }

          metadataObj[key as string] = value
        })
        return metadataObj
      }
      const metadata = extractMetadata(svg.node()!)
      console.log('Metadata:', metadata)
      setConversionMetadata(metadata)
      setLoading(false)
      setLoadingMessage('')
    }

    start()
  }, [conversionData, conversionCompareData])

  return (
    <main className="relative w-full h-screen flex flex-col">
      <div id="floorplan-root" className="fp-stage">
        <div className="fp-zoom-controls" aria-hidden="true">
          <button id="fp-zoom-out" title="Zoom Out" onClick={zoomOut}>
            −
          </button>
          <button id="fp-reset" title="Reset View" onClick={resetView}>
            ⤢
          </button>
          <button id="fp-zoom-in" title="Zoom In" onClick={zoomIn}>
            +
          </button>
        </div>
        <div id="fp-info" className="fp-info" aria-live="polite" style={{ display: 'none' }}></div>
      </div>

      {loading && (
        <div className="fixed top-0 left-0 w-full h-full bg-black/50 text-white z-50 flex items-center justify-center">
          <p>{loadingMessage || 'Loading...'}</p>
        </div>
      )}

      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="icon" className="absolute top-4 left-4 rounded-full">
            <Menu />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          side="right"
          sideOffset={12}
          onInteractOutside={(ev) => ev.preventDefault()}
          onEscapeKeyDown={(ev) => ev.preventDefault()}
          asChild
        >
          <Card className="w-80 bg-white p-0">
            <Accordion type="single" collapsible defaultValue="item-1">
              <AccordionItem value="item-1">
                <AccordionTrigger className="px-4">Files</AccordionTrigger>
                <AccordionContent className="px-4">
                  <Button asChild size="sm">
                    <label>
                      Upload +
                      <input
                        type="file"
                        className="hidden"
                        multiple={false}
                        accept=".dwg, .svg, .pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          console.log('Selected file:', file)
                          if (file) {
                            handleUploadFile(file)
                          }
                        }}
                        onClick={event => {
                          // remove the value
                          // so we can input the same file again
                          //@ts-expect-error just assign a null
                          event.target.value = null;
                        }}
                      />
                    </label>
                  </Button>
                  <div className="max-h-56 overflow-y-auto mt-2">
                    {files.map((file, idx) => {
                      console.log(file.fileId, selectedFileId, file.fileId === selectedFileId)
                      const isSelected = file.fileId === selectedFileId
                      return (
                        <div
                          key={idx}
                          className="w-full min-h-12 p-2 border-b border-b-zinc-200 hover:bg-zinc-50 data-[active=true]:bg-zinc-200"
                          data-active={isSelected}
                        >
                          <p>{file.filename}</p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            {/* <p className="text-xs text-zinc-500 font-medium">✅ Processed</p> */}
                            <div />
                            <div className="flex items-center gap-0.5">
                              {conversionData ? (
                                <>
                                  {isSelected ? (
                                    <Button size="sm" variant="outline" title="View" className="text-xs" onClick={() => handleCloseView()}>
                                      Close View
                                    </Button>
                                  ) : null}
                                </>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" title="View" className="text-xs" onClick={() => handleViewFile(file.fileId)}>
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    title="Delete"
                                    className="text-xs"
                                    onClick={() => handleDeleteFile(file.fileId)}
                                    disabled={isSelected && !!conversionData}
                                  >
                                    <Trash />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="px-4">Compare</AccordionTrigger>
                <AccordionContent className="px-4">
                  {!conversionData ? (
                    <div className="flex items-center justify-center min-h-24">
                      <p className="text-xs text-zinc-500 font-medium">Please load view the source file</p>
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto mt-2">
                      {files
                        .filter((i) => i.fileId !== selectedFileId)
                        .map((file, idx) => {
                          const isSelected = file.fileId === selectedCompareFileId
                          return (
                            <div
                              key={idx}
                              className="w-full min-h-12 p-2 border-b border-b-zinc-200 hover:bg-zinc-50 data-[active=true]:bg-zinc-200"
                              data-active={isSelected}
                            >
                              <p>{file.filename}</p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                {/* <p className="text-xs text-zinc-500 font-medium">✅ Processed</p> */}
                                <div />
                                <div className="flex items-center gap-0.5">
                                  {conversionCompareData ? (
                                    <>
                                      {isSelected ? (
                                        <Button size="sm" variant="outline" title="View" className="text-xs" onClick={() => handleCloseCompareView()}>
                                          Close Compare View
                                        </Button>
                                      ) : null}
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        title="View"
                                        className="text-xs"
                                        onClick={() => handleCompareFile(file.fileId)}
                                      >
                                        Compare
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="px-4">Layers</AccordionTrigger>
                <AccordionContent className="px-4">
                  {/* <div className="flex gap-1">
                    <Button size="sm">
                      Hide All <EyeClosed />
                    </Button>
                    <Button size="sm">
                      Show All <Eye />
                    </Button>
                  </div> */}
                  <div className="max-h-56 overflow-y-auto mt-3">
                    {layers.map((layer, idx) => (
                      <Label htmlFor={`checkbox-${layer.Name}`} key={idx} className="p-2 flex items-center gap-2 rounded-sm hover:bg-zinc-50">
                        <Checkbox id={`checkbox-${layer.Name}`} defaultChecked onCheckedChange={(val) => handleLayerToggle(layer, !!val)} />
                        <span>{layer.Name}</span>
                      </Label>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        </PopoverContent>
      </Popover>
    </main>
  )
}

export default App
