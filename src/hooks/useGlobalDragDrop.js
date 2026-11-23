import { useEffect, useRef, useState } from 'react';

export function useGlobalDragDrop(onDropGlbFiles) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const callbackRef = useRef(onDropGlbFiles);
  callbackRef.current = onDropGlbFiles;

  useEffect(() => {
    function handleDragEnter(e) {
      e.preventDefault();
      dragCounterRef.current += 1;
      setIsDragging(true);
    }

    function handleDragOver(e) {
      e.preventDefault();
    }

    function handleDragLeave(e) {
      e.preventDefault();
      dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    }

    function handleDrop(e) {
      e.preventDefault();
      dragCounterRef.current = 0;
      setIsDragging(false);

      const files = Array.from(e.dataTransfer?.files || []);
      const glbFiles = files.filter((f) => /\.(glb|gltf)$/i.test(f.name));
      if (glbFiles.length > 0 && callbackRef.current) {
        callbackRef.current(glbFiles);
      }
    }

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  return isDragging;
}
