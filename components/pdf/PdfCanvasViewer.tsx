'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';

interface PdfCanvasViewerProps {
  src: string;
  title: string;
  className?: string;
}

export default function PdfCanvasViewer({
  src,
  title,
  className = '',
}: PdfCanvasViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);
  const pdfDocRef = useRef<any>(null);

  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize and load PDF document
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // @ts-ignore - dynamic import of pdfjs-dist ESM bundle
        const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        }

        const loadingTask = pdfjsLib.getDocument({
          url: src,
          withCredentials: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        pdfDocRef.current = doc;
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Failed to load PDF via pdf.js:', err);
        setErrorMessage(
          err?.message || 'Could not load PDF document. Please verify your connection or access permissions.'
        );
        setIsLoading(false);
      }
    }

    if (src) {
      loadPdf();
    }

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
      }
      if (pdfDocRef.current) {
        try {
          pdfDocRef.current.destroy();
        } catch {}
      }
    };
  }, [src]);

  // Render current page onto canvas
  const renderPage = useCallback(
    async (pageNum: number, currentScale: number) => {
      if (!pdfDocRef.current || !canvasRef.current) return;

      setIsRenderingPage(true);

      // Cancel previous render if in flight
      if (renderTaskRef.current) {
        try {
          await renderTaskRef.current.cancel();
        } catch {}
      }

      try {
        const page = await pdfDocRef.current.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Calculate viewport with pixel density for crisp text
        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: currentScale });

        // Adjust dimensions
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        setIsRenderingPage(false);

        // Memory cleanup: clean up page resources
        if (typeof page.cleanup === 'function') {
          page.cleanup();
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page', pageNum, err);
        }
        setIsRenderingPage(false);
      }
    },
    []
  );

  // Trigger render when page or scale changes
  useEffect(() => {
    if (pdfDocRef.current && numPages > 0) {
      renderPage(currentPage, scale);
    }
  }, [currentPage, scale, numPages, renderPage]);

  // Page navigation handlers
  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.0);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-slate-900 select-none overflow-hidden ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="pdf-canvas-viewer"
    >
      {/* Top Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700 text-slate-200 text-xs gap-2 shrink-0">
        {/* Page navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || isLoading}
            aria-label="Previous Page"
            className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-semibold px-1 text-slate-100 min-w-[70px] text-center">
            {isLoading ? 'Loading...' : `Page ${currentPage} of ${numPages || 1}`}
          </span>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages || isLoading}
            aria-label="Next Page"
            className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.5 || isLoading}
            aria-label="Zoom Out"
            className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="w-12 text-center font-semibold text-slate-300">
            {Math.round(scale * 100)}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 2.5 || isLoading}
            aria-label="Zoom In"
            className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            disabled={scale === 1.0 || isLoading}
            aria-label="Reset Zoom"
            className="p-1.5 rounded-lg hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ml-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Viewport Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 relative bg-slate-950">
        {isLoading && (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
            <span className="text-xs font-semibold">Loading secure PDF document...</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex flex-col items-center gap-3 p-6 text-center max-w-md bg-slate-800/80 rounded-2xl border border-red-500/20 text-red-400">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-xs sm:text-sm font-semibold">{errorMessage}</p>
          </div>
        )}

        <div className={`relative shadow-2xl transition-opacity duration-150 ${isLoading || errorMessage ? 'hidden' : 'block'}`}>
          <canvas
            ref={canvasRef}
            className="max-w-none rounded-sm bg-white shadow-lg pointer-events-none"
          />

          {/* Anti-copy watermark overlay */}
          <div
            className="absolute inset-0 pointer-events-none select-none flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="text-slate-900/5 dark:text-white/5 font-black text-2xl sm:text-4xl -rotate-45 pointer-events-none select-none">
              ASPIRANTBOOK SECURE READER
            </span>
          </div>

          {/* Subtle page-rendering indicator */}
          {isRenderingPage && (
            <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-xs text-slate-200 px-2 py-1 rounded-md text-[10px] flex items-center gap-1.5 shadow-md">
              <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
              <span>Rendering...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
