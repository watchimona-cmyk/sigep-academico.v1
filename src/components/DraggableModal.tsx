import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

interface DraggableModalProps {
  id: string;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  widthClass?: string;
}

export default function DraggableModal({ 
  id, 
  title, 
  onClose, 
  children, 
  widthClass = 'max-w-2xl' 
}: DraggableModalProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent dragging when clicking on exclusion classes (like buttons or close button)
    if ((e.target as HTMLElement).closest('.drag-handle-exclude')) {
      return;
    }
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none" id={id}>
      <div 
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
        }}
        className={`bg-white rounded-2xl shadow-2xl border border-slate-300 pointer-events-auto flex flex-col w-full ${widthClass} max-h-[90vh] transition-shadow duration-200 ${
          isDragging ? 'shadow-3xl ring-2 ring-indigo-500/10 cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {/* Drag Handle Header */}
        <div 
          onMouseDown={handleMouseDown}
          className="bg-slate-900 text-white px-5 py-3.5 rounded-t-2xl flex items-center justify-between select-none shrink-0"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
            <span className="font-bold text-xs uppercase tracking-wider">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="drag-handle-exclude p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Fechar Janela"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-6 flex-1 bg-slate-50 rounded-b-2xl custom-scrollbar text-slate-800">
          {children}
        </div>
      </div>
    </div>
  );
}
