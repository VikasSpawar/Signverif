
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Crosshair, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  id: string;
  initialPos: { x: number; y: number };
  initialSize?: { width: number; height: number };
  imageUrl?: string | null;
  onClick?: () => void;
  onSizeChange?: (width: number, height: number) => void;
}

const DraggableSignature = ({
  id,
  initialPos,
  initialSize,
  imageUrl,
  onClick,
  onSizeChange,
}: Props) => {
  // 1. Extract `isDragging` directly from dnd-kit!
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id });
  const contentRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState(initialSize || { width: 192, height: 64 });

  // 2. Preserve CSS native resize logic
  useEffect(() => {
    if (!contentRef.current || !onSizeChange) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
        onSizeChange(width, height);
      }
    });
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [onSizeChange]);

  const wrapperStyle: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    left: `${initialPos.x}px`,
    top: `${initialPos.y}px`,
    position: "absolute",
    zIndex: isDragging ? 50 : 30, // Elevate when dragging
  };

  return (
    <div ref={setNodeRef} style={wrapperStyle} className="group">
      {/* 3. The Unified Drag & Resize Block */}
      <div
        ref={contentRef}
        {...listeners}
        {...attributes}
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          minWidth: "120px",
          minHeight: "50px",
        }}
        className={`border-brutal flex flex-col items-center justify-center font-mono uppercase font-bold text-xs transition-shadow resize overflow-hidden ${
          isDragging
            ? "bg-signal/10 border-signal text-signal shadow-brutal-hover cursor-grabbing"
            : "bg-white/80 backdrop-blur-sm border-ink text-ink cursor-grab hover:shadow-brutal hover:bg-white"
        }`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Signature"
            className="w-full h-full object-contain pointer-events-none p-1"
          />
        ) : (
          <>
            <Crosshair
              size={16}
              className={`mb-1 transition-transform ${isDragging ? "animate-spin" : ""}`}
            />
            {isDragging ? "[ X, Y ]" : "SIGNATURE ZONE"}
          </>
        )}
      </div>

      {/* 4. Edit Button (Detached slightly to avoid drag conflicts) */}
      <button
        onPointerDown={(e) => e.stopPropagation()} // Stop dnd-kit from dragging when clicking edit
        onClick={onClick}
        className="absolute -top-3 -right-3 bg-ink text-bone p-1.5 border-brutal border-ink opacity-0 group-hover:opacity-100 hover:bg-signal hover:text-white transition-all z-40 shadow-brutal"
        title="Apply Ink"
      >
        <Pencil size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
};

export default DraggableSignature;
