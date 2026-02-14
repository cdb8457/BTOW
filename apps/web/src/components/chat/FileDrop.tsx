import { useState, useCallback, useEffect, useRef } from 'react';

interface FileDropProps {
  onFiles: (files: File[]) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function FileDrop({ onFiles, children, disabled = false }: FileDropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      dragCounter.current++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      dragCounter.current--;
      if (dragCounter.current === 0) setIsDragging(false);
    },
    [disabled]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      setIsDragging(false);
      dragCounter.current = 0;
      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length > 0) onFiles(files);
    },
    [disabled, onFiles]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled) return;
      const files = Array.from(e.clipboardData?.items ?? [])
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null);
      if (files.length > 0) onFiles(files);
    },
    [disabled, onFiles]
  );

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handlePaste]);

  return (
    <div className="relative w-full h-full">
      {children}
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm" />
          {/* Drop target card */}
          <div className="relative glass-slab light-leak rounded-lg p-16 flex flex-col items-center gap-6 border-2 border-dashed border-lime-accent/40">
            <div className="absolute inset-0 bg-lime-accent/5 rounded-lg" />
            <span className="material-symbols-outlined text-6xl text-lime-accent glow-lime">
              upload_file
            </span>
            <div className="text-center">
              <p className="text-xl font-bold text-white tracking-tight">Drop to upload</p>
              <p className="text-sm text-slate-400 mt-1">Max 25MB per file</p>
            </div>
            {/* Corner decorations */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-lime-accent/60 rounded-tl" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-lime-accent/60 rounded-tr" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-lime-accent/60 rounded-bl" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-lime-accent/60 rounded-br" />
          </div>
        </div>
      )}
    </div>
  );
}
