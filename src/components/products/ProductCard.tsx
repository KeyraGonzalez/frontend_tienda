'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingBag, Badge } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useCloudinaryImage } from '@/hooks/useCloudinaryImage';

interface CloudinaryImageData {
  url: string;
  publicId?: string;
}

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  stock: number;
  images: (string | CloudinaryImageData)[]; // Updated to support both formats
  imageUrls?: string[]; // Legacy support
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  gender?: string;
  sku?: string;
  brand?: string;
}

interface ProductCardProps {
  product: Product;
  viewMode: 'grid' | 'list';
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  // Get the first image data
  const firstImageData =
    product.images && product.images.length > 0 ? product.images[0] : null;

  const { imageUrl, handleImageLoad, handleImageError } = useCloudinaryImage(
    firstImageData,
    product.name || 'Producto'
  );

  const getStockStatus = (stock: number) => {
    if (stock === 0)
      return { text: 'Agotado', color: 'bg-red-100 text-red-800' };
    if (stock <= 10)
      return { text: 'Stock Bajo', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'En Stock', color: 'bg-green-100 text-green-800' };
  };

  const stockStatus = getStockStatus(product.stock);

  return (
    <Card
      className={`relative overflow-hidden group ${
        viewMode === 'list' ? 'flex flex-col md:flex-row items-center p-4' : ''
      }`}
    >
      <Link href={`/products/${product._id}`} className="absolute inset-0 z-10">
        <span className="sr-only">View product</span>
      </Link>
      <div
        className={`relative ${
          viewMode === 'grid'
            ? 'h-48 w-full'
            : 'h-32 w-32 md:h-40 md:w-40 flex-shrink-0'
        } bg-gray-200 rounded-lg overflow-hidden ${
          viewMode === 'grid' ? 'mb-4' : 'md:mr-4'
        }`}
      >
        <Image
          src={imageUrl || '/placeholder.svg'}
          alt={product.name || 'Product Image'}
          width={viewMode === 'grid' ? 400 : 160}
          height={viewMode === 'grid' ? 300 : 160}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
        <div className="absolute top-2 right-2 flex space-x-1 z-20">
          {!product.isActive && (
            <Badge className="bg-red-500 text-white text-xs">Inactivo</Badge>
          )}
          {product.discountPrice && (
            <Badge className="bg-green-500 text-white text-xs">Oferta</Badge>
          )}
        </div>
      </div>
      <div className={`flex-1 ${viewMode === 'list' ? 'py-2 md:py-0' : 'p-4'}`}>
        <h3 className="font-semibold text-gray-900 mb-1 truncate">
          {product.name || 'Sin nombre'}
        </h3>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {product.description || 'Sin descripción'}
        </p>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {product.discountPrice ? (
              <>
                <span className="text-lg font-bold text-green-600">
                  ${product.discountPrice.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  ${product.price.toFixed(2)}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-900">
                ${product.price.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-sm text-gray-600">
              {product.rating || 0} ({product.reviewCount || 0})
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Badge
            className={`px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.color}`}
          >
            {stockStatus.text}
          </Badge>
          <span className="text-sm text-gray-600">
            Stock: {product.stock || 0}
          </span>
        </div>
        {viewMode === 'list' && (
          <div className="mt-4 flex justify-end">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Añadir al carrito
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
