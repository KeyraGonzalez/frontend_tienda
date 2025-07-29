'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { Star, ShoppingBag, Badge } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  stock: number;
  images: string[]; // Original image paths from backend
  imageUrls?: string[]; // Processed full URLs
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

// Function to construct image URL from backend path
export const getImageUrl = (imagePath: string) => {
  if (!imagePath) return null;
  // If it's already a complete URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  // Get the base URL of the backend (assuming it's an environment variable)
  // In a real app, this would come from process.env.NEXT_PUBLIC_API_URL
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  const baseUrl = API_URL.replace('/api', ''); // Remove /api to get the base URL

  // If the path already includes 'uploads', use it directly
  if (imagePath.startsWith('uploads/')) {
    return `${baseUrl}/${imagePath}`;
  }
  // If the path includes 'products/', assume it goes after uploads
  if (imagePath.startsWith('products/')) {
    return `${baseUrl}/uploads/${imagePath}`;
  }
  // If it's just the filename, assume it's in products
  return `${baseUrl}/uploads/products/${imagePath}`;
};

// Function to generate placeholder SVG
export const generatePlaceholderSVG = (
  width: number,
  height: number,
  text: string
) => {
  const svgContent = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <rect x="20%" y="20%" width="60%" height="60%" fill="#e5e7eb" rx="8"/>
      <circle cx="40%" cy="35%" r="8" fill="#d1d5db"/>
      <path d="M25% 65% L35% 55% L45% 60% L55% 50% L75% 65% Z" fill="#d1d5db"/>
      <text x="50%" y="80%" fontFamily="Arial, sans-serif" fontSize="12" fill="#6b7280" textAnchor="middle">
        ${text}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svgContent)}`;
};

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const firstImageUrl =
    product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls[0]
      : product.images && product.images.length > 0
      ? getImageUrl(product.images[0])
      : null;

  const displayImageUrl =
    imageError || !firstImageUrl
      ? generatePlaceholderSVG(400, 300, product.name || 'No Image')
      : firstImageUrl;

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
          src={displayImageUrl || '/placeholder.svg'}
          alt={product.name || 'Product Image'}
          width={viewMode === 'grid' ? 400 : 160}
          height={viewMode === 'grid' ? 300 : 160}
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
          onLoad={() => setImageError(false)}
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
