import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  src: string;
  title?: string;
}

const VideoModal = ({ open, onClose, src, title = "Reproductor" }: Props) => {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      document.body.style.overflow = "hidden";
    } else if (mounted) {
      setVisible(false);
      const t = setTimeout(() => {
        setMounted(false);
        document.body.style.overflow = "";
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.currentTime = 0;
        }
      }, 260);
      return () => clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center px-4 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(0,20,60,0.85) 0%, rgba(0,0,0,0.95) 70%)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md transition-all duration-300 ease-out ${
          visible ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-4 opacity-0"
        }`}
        style={{
          filter: "drop-shadow(0 30px 60px rgba(0,120,255,0.35))",
        }}
      >
        <div
          className="relative rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(140deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
            border: "1px solid rgba(120,190,255,0.35)",
            boxShadow:
              "0 0 0 1px rgba(29,155,240,0.25) inset, 0 0 40px rgba(29,155,240,0.35), 0 20px 60px rgba(0,0,0,0.6)",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
            <span className="text-xs font-semibold tracking-widest uppercase text-white/80">
              {title}
            </span>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:scale-95 transition-all border border-white/10"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="relative aspect-[9/16] bg-black">
            <video
              ref={videoRef}
              src={src}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
            {/* Blue inner glow ring */}
            <div
              className="pointer-events-none absolute inset-0 rounded-b-3xl"
              style={{
                boxShadow: "inset 0 0 40px rgba(29,155,240,0.25)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
