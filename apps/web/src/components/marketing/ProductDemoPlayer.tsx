'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const DEMO_VIDEO_URL =
  'https://mmml2bafriznrxgn.public.blob.vercel-storage.com/SEEDHAPE.mp4';

export function ProductDemoPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen || !videoRef.current) {
      return;
    }

    const playPromise = videoRef.current.play();
    if (playPromise) {
      playPromise.catch(() => {
        // Ignore autoplay blocking; native controls remain available.
      });
    }
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-7 py-3 rounded-xl text-base transition-all shadow-lg shadow-emerald-900/40 hover:shadow-emerald-500/30 hover:-translate-y-px"
      >
        See full demo <ArrowRight className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-emerald-900/70 bg-black shadow-2xl shadow-emerald-950/50">
      <video
        ref={videoRef}
        className="w-full h-auto"
        controls
        playsInline
        preload="metadata"
      >
        <source src={DEMO_VIDEO_URL} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
