interface ImagePlaceholderProps {
  width?: number;
  height?: number;
  text?: string;
  className?: string;
}

export function ImagePlaceholder({
  width = 200,
  height = 200,
  text = 'Sin imagen',
  className = '',
}: ImagePlaceholderProps) {
  const svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <rect x="20%" y="20%" width="60%" height="60%" fill="#e5e7eb" rx="8"/>
      <text x="50%" y="50%" fontFamily="Arial, sans-serif" fontSize="14" fill="#6b7280" textAnchor="middle" dy=".3em">
        ${text}
      </text>
    </svg>
  `;

  const dataUrl = `data:image/svg+xml;base64,${btoa(svgContent)}`;

  return (
    <img
      src={dataUrl || '/placeholder.svg'}
      alt={text}
      className={className}
      width={width}
      height={height}
    />
  );
}
