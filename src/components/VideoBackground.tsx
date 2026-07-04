const VideoBackground = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <img
        src="/media/login-bg.png"
        alt=""
        aria-hidden="true"
        loading="eager"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-background/60" />
    </div>
  );
};

export default VideoBackground;
