'use client';

import Image from 'next/image';
import { useCloudinaryImage } from '@/hooks/useCloudinaryImage';

interface CloudinaryImageData {
  url: string;
  publicId?: string;
}

interface CloudinaryImageProps {
  src: string | CloudinaryImageData | null;
  alt: string;
  width: number;
  height: number;
  className?: string;
  fallbackText?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export function CloudinaryImage({
  src,
  alt,
  width,
  height,
  className = '',
  fallbackText,
  priority = false,
  sizes,
  fill = false,
  quality = 75,
  onLoad,
  onError,
}: CloudinaryImageProps) {
  const { imageUrl, handleImageLoad, handleImageError } = useCloudinaryImage(
    src,
    fallbackText || alt
  );

  const handleLoad = () => {
    handleImageLoad();
    onLoad?.();
  };

  const handleErr = () => {
    handleImageError();
    onError?.();
  };

  if (fill) {
    return (
      <Image
        src={imageUrl || '/placeholder.svg'}
        alt={alt}
        fill
        className={className}
        priority={priority}
        sizes={sizes}
        quality={quality}
        onLoad={handleLoad}
        onError={handleErr}
      />
    );
  }

  return (
    <Image
      src={imageUrl || '/placeholder.svg'}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizes}
      quality={quality}
      onLoad={handleLoad}
      onError={handleErr}
    />
  );
}

// Componente para galería de imágenes
interface CloudinaryImageGalleryProps {
  images: (string | CloudinaryImageData)[];
  alt: string;
  className?: string;
  fallbackText?: string;
  onImageClick?: (index: number) => void;
}

export function CloudinaryImageGallery({
  images,
  alt,
  className = '',
  fallbackText,
  onImageClick,
}: CloudinaryImageGalleryProps) {
  if (!images || images.length === 0) {
    return (
      <div
        className={`bg-gray-200 flex items-center justify-center ${className}`}
      >
        <span className="text-gray-500">{fallbackText || 'Sin imágenes'}</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {images.map((imageData, index) => (
        <div
          key={index}
          className={`relative aspect-square cursor-pointer hover:opacity-80 transition-opacity ${className}`}
          onClick={() => onImageClick?.(index)}
        >
          <CloudinaryImage
            src={imageData}
            alt={`${alt} ${index + 1}`}
            width={200}
            height={200}
            className="object-cover w-full h-full rounded-lg"
            fallbackText={`${fallbackText || alt} ${index + 1}`}
          />
        </div>
      ))}
    </div>
  );
}
