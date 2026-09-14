import { useRef, useState, type DragEvent, type ReactNode } from 'react';
import { RADIUS } from './styleProps';

interface DropzoneProps {
  onDrop: (files: File[]) => void;
  onReject?: () => void;
  /** { mimeType: extensions[] } — Mantine Dropzone과 동일한 형태 */
  accept?: Record<string, string[]>;
  maxFiles?: number;
  multiple?: boolean;
  radius?: keyof typeof RADIUS;
  style?: React.CSSProperties;
  children?: ReactNode;
}

function isAccepted(file: File, accept?: Record<string, string[]>): boolean {
  if (!accept) return true;
  const mimeOk = Object.keys(accept).includes(file.type);
  if (mimeOk) return true;
  const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
  return Object.values(accept).some((exts) => exts.includes(ext));
}

export function Dropzone({
  onDrop, onReject, accept, maxFiles = 1, multiple = false, radius = 'md', style, children,
}: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, maxFiles);
    const accepted = files.filter((f) => isAccepted(f, accept));
    if (accepted.length === 0) {
      onReject?.();
      return;
    }
    onDrop(accepted);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      onDragOver={(e: DragEvent) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      style={{
        cursor: 'pointer',
        borderRadius: RADIUS[radius] ?? RADIUS.md,
        transition: 'background 120ms ease',
        ...(dragging ? { background: 'var(--rb-primary-tint)' } : {}),
        ...style,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept ? Object.values(accept).flat().join(',') : undefined}
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />
      {children}
    </div>
  );
}
