import { useState, useCallback } from 'react';

interface CloudinaryImageData {
  url: string;
  publicId?: string;
}

interface UseCloudinaryImageReturn {
  imageUrl: string | null;
  isLoading: boolean;
  hasError: boolean;
  handleImageLoad: () => void;
  handleImageError: () => void;
}

export function useCloudinaryImage(
  imageData: string | CloudinaryImageData | null,
  fallbackText?: string
): UseCloudinaryImageReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const getImageUrl = useCallback(() => {
    if (!imageData) return null;

    // Si es un string, puede ser una URL de Cloudinary o un path legacy
    if (typeof imageData === 'string') {
      // Si ya es una URL completa de Cloudinary, usarla directamente
      if (
        imageData.includes('cloudinary.com') ||
        imageData.startsWith('http')
      ) {
        return imageData;
      }
      // Si es un path legacy, construir la URL del backend
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const baseUrl = API_URL.replace('/api', '');

      // Manejar diferentes formatos de path
      if (imageData.startsWith('uploads/')) {
        return `${baseUrl}/${imageData}`;
      }
      if (imageData.startsWith('products/')) {
        return `${baseUrl}/uploads/${imageData}`;
      }
      return `${baseUrl}/uploads/products/${imageData}`;
    }

    // Si es un objeto con URL de Cloudinary
    if (typeof imageData === 'object' && imageData.url) {
      return imageData.url;
    }

    return null;
  }, [imageData]);

  const generatePlaceholderSVG = useCallback((text: string) => {
    const svgContent = `
      <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f3f4f6"/>
        <rect x="20%" y="20%" width="60%" height="60%" fill="#e5e7eb" rx="8"/>
        <circle cx="40%" cy="35%" r="8" fill="#d1d5db"/>
        <path d="M25% 65% L35% 55% L45% 60% L55% 50% L75% 65% Z" fill="#d1d5db"/>
        <text x="50%" y="80%" fontFamily="Arial, sans-serif" fontSize="14" fill="#6b7280" textAnchor="middle">
          ${text}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svgContent)}`;
  }, []);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const imageUrl = hasError
    ? generatePlaceholderSVG(fallbackText || 'Imagen no disponible')
    : getImageUrl();

  return {
    imageUrl,
    isLoading,
    hasError,
    handleImageLoad,
    handleImageError,
  };
}

// Hook para manejar múltiples imágenes
export function useCloudinaryImages(
  imagesData: (string | CloudinaryImageData)[] | null,
  fallbackText?: string
) {
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>(
    {}
  );
  const [errorStates, setErrorStates] = useState<Record<number, boolean>>({});

  const handleImageLoad = useCallback((index: number) => {
    setLoadingStates((prev) => ({ ...prev, [index]: false }));
    setErrorStates((prev) => ({ ...prev, [index]: false }));
  }, []);

  const handleImageError = useCallback((index: number) => {
    setLoadingStates((prev) => ({ ...prev, [index]: false }));
    setErrorStates((prev) => ({ ...prev, [index]: true }));
  }, []);

  const getImageUrl = useCallback(
    (imageData: string | CloudinaryImageData, index: number) => {
      if (errorStates[index]) {
        const svgContent = `
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <rect x="20%" y="20%" width="60%" height="60%" fill="#e5e7eb" rx="8"/>
          <circle cx="40%" cy="35%" r="8" fill="#d1d5db"/>
          <path d="M25% 65% L35% 55% L45% 60% L55% 50% L75% 65% Z" fill="#d1d5db"/>
          <text x="50%" y="80%" fontFamily="Arial, sans-serif" fontSize="14" fill="#6b7280" textAnchor="middle">
            ${fallbackText || `Imagen ${index + 1}`}
          </text>
        </svg>
      `;
        return `data:image/svg+xml;base64,${btoa(svgContent)}`;
      }

      if (typeof imageData === 'string') {
        if (
          imageData.includes('cloudinary.com') ||
          imageData.startsWith('http')
        ) {
          return imageData;
        }
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const baseUrl = API_URL.replace('/api', '');
        return `${baseUrl}/uploads/${imageData}`;
      }

      if (typeof imageData === 'object' && imageData.url) {
        return imageData.url;
      }

      return null;
    },
    [errorStates, fallbackText]
  );

  return {
    getImageUrl,
    handleImageLoad,
    handleImageError,
    isLoading: (index: number) => loadingStates[index] ?? true,
    hasError: (index: number) => errorStates[index] ?? false,
  };
}
