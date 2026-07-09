'use client';

import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Download, FileDown, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  elementRef: React.RefObject<HTMLDivElement | null>;
  fileName: string;
  backgroundColor?: string;
  onBeforeExport?: () => void | Promise<void>;
  onAfterExport?: () => void;
}

export default function ExportButton({ 
  elementRef, 
  fileName, 
  backgroundColor = '#09090b',
  onBeforeExport,
  onAfterExport
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const exportAsImage = async () => {
    if (!elementRef.current) return;
    setLoading(true);
    
    if (onBeforeExport) {
      try {
        await onBeforeExport();
      } catch (err) {
        console.error('Error in onBeforeExport:', err);
      }
    }
    
    // Guardar y remover placeholders temporalmente para que salgan vacíos en la imagen
    const inputs = elementRef.current.querySelectorAll('input, textarea');
    const savedPlaceholders: { el: Element; val: string }[] = [];
    
    inputs.forEach((input) => {
      const placeholder = input.getAttribute('placeholder');
      if (placeholder) {
        savedPlaceholders.push({ el: input, val: placeholder });
        input.removeAttribute('placeholder');
      }
    });

    try {
      elementRef.current.classList.add('export-mode');
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      const dataUrl = await toPng(elementRef.current, {
        quality: 1,
        pixelRatio: 2, // Ultra-sharp double resolution
        backgroundColor: backgroundColor, // Usar color de fondo personalizado
        style: {
          transform: 'scale(1)',
        }
      });
      
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error al exportar imagen:', error);
    } finally {
      // Restaurar placeholders e interactividad
      savedPlaceholders.forEach(({ el, val }) => {
        el.setAttribute('placeholder', val);
      });
      if (elementRef.current) {
        elementRef.current.classList.remove('export-mode');
      }
      if (onAfterExport) {
        try {
          onAfterExport();
        } catch (err) {
          console.error('Error in onAfterExport:', err);
        }
      }
      setLoading(false);
    }
  };

  const exportAsPDF = async () => {
    if (!elementRef.current) return;
    setLoading(true);
    
    if (onBeforeExport) {
      try {
        await onBeforeExport();
      } catch (err) {
        console.error('Error in onBeforeExport:', err);
      }
    }
    
    // Guardar y remover placeholders temporalmente para que salgan vacíos en el PDF
    const inputs = elementRef.current.querySelectorAll('input, textarea');
    const savedPlaceholders: { el: Element; val: string }[] = [];
    
    inputs.forEach((input) => {
      const placeholder = input.getAttribute('placeholder');
      if (placeholder) {
        savedPlaceholders.push({ el: input, val: placeholder });
        input.removeAttribute('placeholder');
      }
    });

    try {
      elementRef.current.classList.add('export-mode');
      await new Promise((resolve) => setTimeout(resolve, 300));

      const tempPng = await toPng(elementRef.current, {
        quality: 1,
        pixelRatio: 2, // Ultra-sharp double resolution
        backgroundColor: backgroundColor,
      });

      const tempImg = new Image();
      tempImg.src = tempPng;
      await new Promise((resolve) => {
        tempImg.onload = resolve;
      });

      const isLandscape = tempImg.width > tempImg.height;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;

      const imgWidth = pageWidth;
      const imgProps = pdf.getImageProperties(tempPng);
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      const hexToRgb = (hex: string) => {
        const cleanHex = hex.replace('#', '');
        const bigint = parseInt(cleanHex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return { r, g, b };
      };

      const rgb = hexToRgb(backgroundColor);

      // Dibujar fondo en la primera página
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      pdf.addImage(tempPng, 'PNG', 0, 0, imgWidth, imgHeight);
      let heightLeft = imgHeight - pageHeight;
      let pageIndex = 1;

      while (heightLeft > 0) {
        pdf.addPage();
        
        // Dibujar fondo en las siguientes páginas
        pdf.setFillColor(rgb.r, rgb.g, rgb.b);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        const position = -pageIndex * pageHeight;
        pdf.addImage(tempPng, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        pageIndex++;
      }

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
    } finally {
      // Restaurar placeholders e interactividad
      savedPlaceholders.forEach(({ el, val }) => {
        el.setAttribute('placeholder', val);
      });
      if (elementRef.current) {
        elementRef.current.classList.remove('export-mode');
      }
      if (onAfterExport) {
        try {
          onAfterExport();
        } catch (err) {
          console.error('Error in onAfterExport:', err);
        }
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 no-print font-header">
      <style>{`
        .export-mode *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        .export-mode * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .export-mode .overflow-x-auto {
          overflow: visible !important;
          overflow-x: visible !important;
        }
      `}</style>
      <button
        onClick={exportAsImage}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-4 py-2.5 bg-yellow-400 text-black font-black uppercase tracking-tight rounded-none hover:bg-yellow-500 transition-all shadow-md cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-black" />
        ) : (
          <Download className="w-4 h-4 text-black" />
        )}
        Exportar Imagen (PNG)
      </button>

      <button
        onClick={exportAsPDF}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-4 py-2.5 bg-zinc-950 text-white font-black uppercase tracking-tight rounded-none border border-zinc-800 hover:bg-zinc-900 transition-all shadow-md cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <FileDown className="w-4 h-4 text-white" />
        )}
        Exportar PDF
      </button>
    </div>
  );
}
