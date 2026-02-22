const IMAGE_SRC = null;

export default function ImagePlaceholder({ label, width = 1000, height = 500, imageSrc, className = '' }) {
  const src = imageSrc || IMAGE_SRC;

  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className={`rounded-xl object-cover ${className}`}
        style={{ width: '100%', maxWidth: width, height }}
      />
    );
  }

  return (
    <div
      className={`bg-[#F1F5F9] border-2 border-dashed border-[#94A3B8] rounded-xl flex items-center justify-center ${className}`}
      style={{ width: '100%', maxWidth: width, height }}
    >
      <span className="text-[#94A3B8] text-sm font-medium select-none">
        {label} &mdash; {width}&times;{height}
      </span>
    </div>
  );
}
