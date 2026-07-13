import { LOGIN_BG_VIDEO } from "@/lib/assets";

const VideoBackground = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <video
        src={LOGIN_BG_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />
      <div className="absolute inset-0 bg-background/60" />
    </div>
  );
};

export default VideoBackground;
