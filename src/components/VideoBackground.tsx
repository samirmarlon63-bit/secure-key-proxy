import { useAppSettings } from "@/lib/appSettings";

const VideoBackground = () => {
  const { settings } = useAppSettings();

  if (settings.bgImage) {
    return (
      <div className="fixed inset-0 z-0 overflow-hidden">
        <img
          src={settings.bgImage}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-background/60" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <video
        key={settings.bgVideo}
        src={settings.bgVideo}
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
