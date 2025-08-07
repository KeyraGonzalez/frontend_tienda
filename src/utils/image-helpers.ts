// Utilidades para manejo de imágenes

export interface ImageData {
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
}

/**
 * Obtiene la URL de imagen más apropiada para un producto
 */
export function getProductImageUrl(product: any): string {
  // Verificar si existe el array de imágenes
  if (
    product.images &&
    Array.isArray(product.images) &&
    product.images.length > 0
  ) {
    // Buscar imagen primaria
    const primaryImage = product.images.find(
      (img: ImageData) => img.is_primary === true
    );
    if (primaryImage?.image_url) {
      return primaryImage.image_url;
    }

    // Si no hay imagen primaria, usar la primera disponible
    const firstImage = product.images[0];
    if (firstImage?.image_url) {
      return firstImage.image_url;
    }
  }

  // Fallback a image_url directa del producto
  if (product.image_url) {
    return product.image_url;
  }

  // Último recurso: imagen placeholder
  return '/placeholder.jpg';
}

/**
 * Verifica si una URL de imagen es accesible
 */
export async function isImageAccessible(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error('Error verificando accesibilidad de imagen:', error);
    return false;
  }
}

/**
 * Optimiza URLs de Cloudinary añadiendo transformaciones
 */
export function optimizeCloudinaryUrl(
  url: string,
  width = 400,
  height = 400
): string {
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  // Insertar transformaciones en la URL de Cloudinary
  const parts = url.split('/upload/');
  if (parts.length === 2) {
    return `${parts[0]}/upload/w_${width},h_${height},c_fill,f_auto,q_auto/${parts[1]}`;
  }

  return url;
}

/**
 * Genera un atributo srcset para imágenes responsivas
 */
export function generateSrcSet(baseUrl: string): string {
  if (!baseUrl.includes('cloudinary.com')) {
    return baseUrl;
  }

  const sizes = [400, 600, 800, 1200];
  const srcsetEntries = sizes.map((size) => {
    const optimizedUrl = optimizeCloudinaryUrl(baseUrl, size, size);
    return `${optimizedUrl} ${size}w`;
  });

  return srcsetEntries.join(', ');
}
