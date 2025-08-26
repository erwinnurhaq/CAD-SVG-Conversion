import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Upload, RefreshCcw, ZoomIn, ZoomOut, Link as LinkIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Canvg } from "canvg";
import * as d3 from "d3";

export default function SvgViewer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const canvgRef = useRef<Canvg | null>(null);
  const svgDomRef = useRef<SVGSVGElement | null>(null);
  const [svgText, setSvgText] = useState<string>(DEFAULT_SVG);
  const [url, setUrl] = useState<string>("");

  // Dynamic layers
  const [layers, setLayers] = useState<string[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<string>("");

  // Viewport transform state
  const [scale, setScale] = useState<number>(1);
  const [tx, setTx] = useState<number>(0);
  const [ty, setTy] = useState<number>(0);

  const isPanning = useRef<boolean>(false);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const resizeCanvasToContainer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = parent.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor((rect.height - 0) * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctxRef.current = ctx;
    }
  }, []);

  const ensureOffscreen = useCallback(() => {
    if (!offscreenRef.current) {
      offscreenRef.current = document.createElement("canvas");
    }
    const off = offscreenRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    off.width = canvas.width;
    off.height = canvas.height;
  }, []);

  const initializeCanvg = useCallback(async (text?: string) => {
    const ctx = ctxRef.current;
    const off = offscreenRef.current;
    if (!ctx || !off) return;

    const svgSource = text ?? svgText;
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgSource, "image/svg+xml");
    svgDomRef.current = doc.documentElement as unknown as SVGSVGElement;

    // Collect layer IDs (groups with id)
    const ids: string[] = [];
    d3.select(svgDomRef.current).selectAll("g[id]").each(function () {
      ids.push(this.getAttribute("id") || "");
    });
    setLayers(ids);
    if (ids.length > 0 && !ids.includes(selectedLayer)) {
      setSelectedLayer(ids[0]);
    }

    const offCtx = off.getContext("2d");
    if (!offCtx) return;

    if (canvgRef.current) {
      await canvgRef.current.stop();
      canvgRef.current = null;
    }

    const instance = await Canvg.from(offCtx, svgSource, {
      ignoreMouse: true,
      ignoreAnimation: true,
      enableRedraw: false,
    });
    canvgRef.current = instance;
    await instance.render();
    redraw();
  }, [svgText, selectedLayer]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const off = offscreenRef.current;
    if (!canvas || !ctx || !off) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, tx, ty);
    ctx.drawImage(off, 0, 0);
  }, [scale, tx, ty]);

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const mouseX = (e.clientX - rect.left) * dpr;
      const mouseY = (e.clientY - rect.top) * dpr;
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const newScale = Math.min(40, Math.max(0.05, scale * zoomFactor));
      const wx = (mouseX - tx) / scale;
      const wy = (mouseY - ty) / scale;
      const newTx = mouseX - wx * newScale;
      const newTy = mouseY - wy * newScale;
      setScale(newScale);
      setTx(newTx);
      setTy(newTy);
    },
    [scale, tx, ty]
  );

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY, tx, ty };
  }, [tx, ty]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning.current || !panStart.current) return;
    const dpr = window.devicePixelRatio || 1;
    const dx = (e.clientX - panStart.current.x) * dpr;
    const dy = (e.clientY - panStart.current.y) * dpr;
    setTx(panStart.current.tx + dx);
    setTy(panStart.current.ty + dy);
  }, []);

  const onMouseUp = useCallback(() => {
    isPanning.current = false;
    panStart.current = null;
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  const loadFromUrl = useCallback(async () => {
    if (!url) return;
    try {
      const res = await fetch(url);
      const text = await res.text();
      setSvgText(text);
      resetView();
      initializeCanvg(text);
    } catch (err) {
      console.error(err);
      alert("Failed to load SVG from URL.");
    }
  }, [url, resetView, initializeCanvg]);

  const onFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setSvgText(text);
      resetView();
      initializeCanvg(text);
    };
    reader.readAsText(file);
  }, [resetView, initializeCanvg]);

  useEffect(() => { redraw(); }, [scale, tx, ty, redraw]);

  useEffect(() => {
    const onResize = () => {
      resizeCanvasToContainer();
      ensureOffscreen();
      initializeCanvg();
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resizeCanvasToContainer, ensureOffscreen, initializeCanvg]);

  // useEffect(() => {
  //   const onKey = (e: KeyboardEvent) => {
  //     if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
  //       e.preventDefault();
  //       setScale((s) => Math.min(40, s * 1.1));
  //     }
  //     if ((e.ctrlKey || e.metaKey) && e.key === "-") {
  //       e.preventDefault();
  //       setScale((s) => Math.max(0.05, s * 0.9));
  //     }
  //     if (e.key.toLowerCase() === "0" && (e.ctrlKey || e.metaKey)) {
  //       e.preventDefault();
  //       resetView();
  //     }
  //   };
  //   window.addEventListener("keydown", onKey);
  //   return () => window.removeEventListener("keydown", onKey);
  // }, [resetView]);

  const toggleLayer = useCallback(() => {
    if (!svgDomRef.current || !selectedLayer) return;
    const sel = d3.select(svgDomRef.current).select(`#${selectedLayer}`);
    const current = sel.attr("display");
    sel.attr("display", current === "none" ? null : "none");
    initializeCanvg(new XMLSerializer().serializeToString(svgDomRef.current));
  }, [initializeCanvg, selectedLayer]);

  const changeColors = useCallback(() => {
    if (!svgDomRef.current) return;
    d3.select(svgDomRef.current).selectAll("circle").attr("fill", "tomato");
    initializeCanvg(new XMLSerializer().serializeToString(svgDomRef.current));
  }, [initializeCanvg]);

  return (
    <div className="h-screen w-full p-4 bg-slate-50">
      <div className="mx-auto max-w-[1200px] h-full grid grid-rows-[auto,1fr] gap-4">
        <Card className="shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">SVG Viewer (Canvg) — Zoom & Pan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Paste SVG URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-[360px]"
                />
                <Button onClick={loadFromUrl} variant="secondary"><LinkIcon className="mr-2 h-4 w-4"/>Load URL</Button>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border cursor-pointer">
                  <Upload className="h-4 w-4" />
                  <span>Open SVG</span>
                  <input type="file" accept="image/svg+xml,.svg" className="hidden" onChange={onFile} />
                </label>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button onClick={() => setScale((s) => Math.min(40, s * 1.1))} variant="outline"><ZoomIn className="mr-2 h-4 w-4"/>In</Button>
                <Button onClick={() => setScale((s) => Math.max(0.05, s * 0.9))} variant="outline"><ZoomOut className="mr-2 h-4 w-4"/>Out</Button>
                <Button onClick={resetView}><RefreshCcw className="mr-2 h-4 w-4"/>Reset</Button>
                <div className="flex items-center gap-2 w-48">
                  <Slider value={[Math.log10(scale/0.05) / Math.log10(40/0.05) * 100]} onValueChange={(v) => {
                    const ratio = v[0]/100;
                    const newScale = 0.05 * (40/0.05) ** ratio;
                    setScale(newScale);
                  }}/>
                </div>
                <span className="text-sm text-slate-600 w-20 text-right">{scale.toFixed(2)}×</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-600">Inline SVG (editable)</label>
                <textarea
                  className="w-full h-40 rounded-2xl border p-3 font-mono text-xs"
                  value={svgText}
                  onChange={(e) => setSvgText(e.target.value)}
                />
                <div className="flex gap-2 flex-wrap items-center">
                  <Button onClick={() => initializeCanvg(svgText)} variant="outline">Render</Button>
                  {layers.length > 0 && (
                    <>
                      <Select value={selectedLayer} onValueChange={setSelectedLayer}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Select Layer" />
                        </SelectTrigger>
                        <SelectContent>
                          {layers.map((id) => (
                            <SelectItem key={id} value={id}>{id}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={toggleLayer} variant="outline">Toggle Layer</Button>
                    </>
                  )}
                  <Button onClick={changeColors} variant="outline">Change Circle Colors</Button>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm text-slate-600">Canvas Output</label>
                <div className="relative bg-white rounded-2xl border overflow-hidden h-[420px]">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full cursor-grab active:cursor-grabbing select-none"
                    onWheel={onWheel}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const DEFAULT_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <g id="layer1" transform="translate(100,100)">
    <circle cx="0" cy="0" r="8" fill="#fff"/>
    <rect x="0" y="0" width="400" height="260" fill="#fff" opacity="0.9" rx="12"/>
    <text x="16" y="40" font-size="28" font-family="Inter, system-ui" fill="#0f172a">Hello Canvg 👋</text>
    <text x="16" y="76" font-size="14" font-family="Inter, system-ui" fill="#334155">Zoom with wheel, pan with drag, reset with the button.</text>
    <path d="M20,120 C140,60 220,200 360,120" stroke="#0ea5e9" stroke-width="6" fill="none"/>
    <g id="subLayerA">
      <rect x="20" y="160" width="120" height="60" rx="10" fill="#0ea5e9"/>
      <text x="40" y="198" font-size="18" font-family="Inter, system-ui" fill="white">SVG ➜ Canvas</text>
    </g>
  </g>
</svg>`;
