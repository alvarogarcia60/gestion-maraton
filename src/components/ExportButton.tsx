'use client';

import React, { useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Download, FileDown, Loader2 } from 'lucide-react';

interface ExportButtonProps {
  elementRef: React.RefObject<HTMLDivElement | null>;
  fileName: string;
  backgroundColor?: string;
}

export default function ExportButton({ 
  elementRef, 
  fileName, 
  backgroundColor = '#09090b' 
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const exportAsImage = async () => {
    if (!elementRef.current) return;
    setLoading(true);
    
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
      setLoading(false);
    }
  };

  const exportAsPDF = async () => {
    if (!elementRef.current) return;
    setLoading(true);
    
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

      const dataUrl = await toPng(elementRef.current, {
        quality: 1,
        backgroundColor: backgroundColor, // Usar color de fondo personalizado
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210; // Ancho A4 en mm
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight);
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
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 no-print font-header">
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
