'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { productsApi, type CreateProductData } from '@/lib/api/products';
import {
  Package,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowLeft,
  Filter,
  Star,
  TrendingUp,
  AlertTriangle,
  X,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
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
  images: string[];
  imageUrls: string[];
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  gender?: string;
  sku?: string;
  brand?: string;
  featured?: boolean;
  availableSizes?: string[];
  colors?: string[];
  tags?: string[];
  material?: string;
  weight?: number;
}

export default function ProductsManagement() {
  const { user, isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<CreateProductData>({
    name: '',
    description: '',
    price: 0,
    category: '',
    stock: 0,
    featured: false,
    gender: 'unisex',
    sku: '',
    brand: '',
    material: '',
    weight: 0,
    sizes: [],
    colors: [],
    tags: [],
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchProducts();
  }, [isAuthenticated, user, router]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      if (token) {
        const response = await productsApi.getProducts();
        console.log('API Response:', response);

        const productsData =
          response.products || response.data || response || [];

        const validProducts = productsData
          .filter(
            (product: any) =>
              product && typeof product === 'object' && product._id
          )
          .map((product: any) => ({
            _id: product._id || '',
            name: product.name || 'Sin nombre',
            description: product.description || 'Sin descripción',
            price: Number(product.price) || 0,
            discountPrice: product.discountPrice
              ? Number(product.discountPrice)
              : undefined,
            category: product.category || 'uncategorized',
            stock: Number(product.stock) || 0,
            images: product.images || [],
            imageUrls: product.imageUrls || [],
            isActive: Boolean(product.isActive !== false),
            rating: Number(product.rating) || 0,
            reviewCount: Number(product.reviewCount) || 0,
            createdAt: product.createdAt || new Date().toISOString(),
            gender: product.gender || 'unisex',
            sku: product.sku || '',
            brand: product.brand || '',
          }));

        console.log('Processed products with image URLs:', validProducts);
        setProducts(validProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([
        {
          _id: '1',
          name: 'Camiseta Básica',
          description: 'Camiseta de algodón 100% premium',
          price: 29.99,
          discountPrice: 24.99,
          category: 'shirts',
          stock: 150,
          images: [],
          imageUrls: [],
          isActive: true,
          rating: 4.5,
          reviewCount: 23,
          createdAt: '2024-01-15T10:30:00Z',
          gender: 'unisex',
          sku: 'SHIRT-001',
          brand: 'BasicWear',
        },
        {
          _id: '2',
          name: 'Jeans Clásicos',
          description: 'Jeans de corte clásico, cómodos y duraderos',
          price: 79.99,
          category: 'pants',
          stock: 5,
          images: [],
          imageUrls: [],
          isActive: true,
          rating: 4.2,
          reviewCount: 45,
          createdAt: '2024-01-10T09:15:00Z',
          gender: 'unisex',
          sku: 'JEANS-001',
          brand: 'ClassicDenim',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: 'all', label: 'Todas las categorías' },
    { value: 'shirts', label: 'Camisetas' },
    { value: 'pants', label: 'Pantalones' },
    { value: 'dresses', label: 'Vestidos' },
    { value: 'shoes', label: 'Zapatos' },
    { value: 'accessories', label: 'Accesorios' },
  ];

  const genderOptions = [
    { value: 'men', label: 'Hombre' },
    { value: 'women', label: 'Mujer' },
    { value: 'unisex', label: 'Unisex' },
  ];

  const filteredProducts = products.filter((product) => {
    if (!product || typeof product !== 'object') {
      return false;
    }

    const productName = product.name || '';
    const productDescription = product.description || '';
    const productCategory = product.category || '';
    const productStock = Number(product.stock) || 0;
    const productIsActive = Boolean(product.isActive);

    const matchesSearch =
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productDescription.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || productCategory === categoryFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && productIsActive) ||
      (statusFilter === 'inactive' && !productIsActive);

    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'low' && productStock > 0 && productStock <= 10) ||
      (stockFilter === 'out' && productStock === 0);

    return matchesSearch && matchesCategory && matchesStatus && matchesStock;
  });

  const generateSKU = (name: string, category: string) => {
    const cleanName = name
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .substring(0, 6);
    const cleanCategory = category.toUpperCase().substring(0, 3);
    const timestamp = Date.now().toString().slice(-4);
    return `${cleanCategory}-${cleanName}-${timestamp}`;
  };

  const handleCreateProduct = async () => {
    try {
      if (!token) return;

      const productData = {
        ...formData,
        sku: formData.sku || generateSKU(formData.name, formData.category),
      };

      let response;
      if (selectedImages.length > 0) {
        response = await productsApi.createProductWithImages(
          token,
          productData,
          selectedImages
        );
      } else {
        response = await productsApi.createProduct(token, productData);
      }

      const newProduct = response.product || response;
      const processedProduct = {
        ...newProduct,
        imageUrls: response.imageUrls || [],
      };

      setProducts([...products, processedProduct]);
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating product:', error);
      let errorMessage = 'Error desconocido';
      if (typeof error === 'object' && error !== null) {
        if (
          'response' in error &&
          typeof (error as any).response?.data?.message === 'string'
        ) {
          errorMessage = (error as any).response.data.message;
        } else if (
          'message' in error &&
          typeof (error as any).message === 'string'
        ) {
          errorMessage = (error as any).message;
        }
      }
      alert('Error al crear el producto: ' + errorMessage);
    }
  };

  const handleUpdateProduct = async () => {
    try {
      if (!token || !selectedProduct) return;

      // Mapear los datos del formulario al formato del DTO del backend
      const updateData: any = {};

      // Campos obligatorios solo si tienen valores
      if (formData.name && formData.name.trim()) {
        updateData.name = formData.name.trim();
      }

      if (formData.description && formData.description.trim()) {
        updateData.description = formData.description.trim();
      }

      if (formData.price && formData.price > 0) {
        updateData.price = Number(formData.price);
      }

      if (formData.category && formData.category.trim()) {
        updateData.category = formData.category.trim();
      }

      if (formData.stock !== undefined && formData.stock >= 0) {
        updateData.stock = Number(formData.stock);
      }

      // Campos opcionales
      if (formData.brand && formData.brand.trim()) {
        updateData.brand = formData.brand.trim();
      }

      if (formData.gender && formData.gender.trim()) {
        updateData.gender = formData.gender.trim();
      }

      if (formData.sku && formData.sku.trim()) {
        updateData.sku = formData.sku.trim();
      }

      if (formData.material && formData.material.trim()) {
        updateData.material = formData.material.trim();
      }

      if (formData.weight && formData.weight > 0) {
        updateData.weight = Number(formData.weight);
      }

      if (formData.sizes && formData.sizes.length > 0) {
        updateData.availableSizes = formData.sizes.filter(
          (size) => size && size.trim()
        );
      }

      if (formData.colors && formData.colors.length > 0) {
        updateData.colors = formData.colors.filter(
          (color) => color && color.trim()
        );
      }

      if (formData.tags && formData.tags.length > 0) {
        updateData.tags = formData.tags.filter((tag) => tag && tag.trim());
      }

      // Boolean siempre se envía
      updateData.featured = Boolean(formData.featured);

      console.log('Enviando datos de actualización:', updateData);

      const response = await productsApi.updateProduct(
        token,
        selectedProduct._id,
        updateData
      );

      const updatedProduct = {
        ...selectedProduct,
        ...response.product,
        imageUrls: response.product?.imageUrls || selectedProduct.imageUrls,
      };

      setProducts(
        products.map((p: Product) =>
          p._id === selectedProduct._id ? updatedProduct : p
        )
      );
      setShowEditModal(false);
      resetForm();
      alert('Producto actualizado exitosamente');
    } catch (error) {
      console.error('Error updating product:', error);

      // Type guard for error as AxiosError or similar
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as any).response === 'object'
      ) {
        const err = error as any;
        console.error('Error response:', err.response.data);
        console.error('Status:', err.response.status);
        const errorMessage =
          err.response.data?.message ||
          err.response.data?.error ||
          `Error ${err.response.status}: ${err.response.statusText}`;
        alert('Error al actualizar el producto: ' + errorMessage);
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'request' in error
      ) {
        const err = error as any;
        console.error('Error request:', err.request);
        alert('Error de conexión al actualizar el producto');
      } else if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error
      ) {
        const err = error as any;
        console.error('Error message:', err.message);
        alert('Error al actualizar el producto: ' + err.message);
      } else {
        alert('Error al actualizar el producto: Error desconocido');
      }
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }
    try {
      if (token) {
        await productsApi.deleteProduct(token, productId);
      }
      setProducts(products.filter((p) => p._id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar el producto');
    }
  };

  const handleToggleStatus = async (productId: string) => {
    try {
      setProducts(
        products.map((p: Product) =>
          p._id === productId ? { ...p, isActive: !p.isActive } : p
        )
      );
    } catch (error) {
      console.error('Error toggling product status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: '',
      stock: 0,
      featured: false,
      gender: 'unisex',
      sku: '',
      brand: '',
      material: '',
      weight: 0,
      sizes: [],
      colors: [],
      tags: [],
    });
    setSelectedImages([]);
    setSelectedProduct(null);
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      category: product.category || '',
      stock: product.stock || 0,
      featured: product.featured || false,
      gender: product.gender || 'unisex',
      sku: product.sku || '',
      brand: product.brand || '',
      material: product.material || '',
      weight: product.weight || 0,
      sizes: product.availableSizes || [],
      colors: product.colors || [],
      tags: product.tags || [],
    });
    setShowEditModal(true);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0)
      return { text: 'Agotado', color: 'bg-red-100 text-red-800' };
    if (stock <= 10)
      return { text: 'Stock Bajo', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'En Stock', color: 'bg-green-100 text-green-800' };
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      <main className="container-custom py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/admin">
              <button className="p-2 hover:bg-white rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Gestión de Productos
              </h1>
              <p className="text-slate-600">
                Administra tu catálogo de productos
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Producto
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200/50 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Productos
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {products.length}
                </p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200/50 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Productos Activos
                </p>
                <p className="text-2xl font-bold text-emerald-600">
                  {products.filter((p) => p && p.isActive).length}
                </p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200/50 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Stock Bajo</p>
                <p className="text-2xl font-bold text-orange-600">
                  {
                    products.filter((p) => p && p.stock > 0 && p.stock <= 10)
                      .length
                  }
                </p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200/50 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Agotados</p>
                <p className="text-2xl font-bold text-red-600">
                  {products.filter((p) => p && p.stock === 0).length}
                </p>
              </div>
              <div className="p-2 bg-red-50 rounded-lg">
                <Package className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6 bg-white/80 backdrop-blur-sm border-slate-200/50">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              {categories.map((category: { value: string; label: string }) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            >
              <option value="all">Todo el stock</option>
              <option value="low">Stock bajo</option>
              <option value="out">Agotados</option>
            </select>
            <button className="inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors">
              <Filter className="w-4 h-4 mr-2 text-blue-600" />
              <span className="text-blue-600">Filtros</span>
            </button>
          </div>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            Array.from({ length: 8 }).map((_, index: number) => (
              <Card key={index} className="p-4 animate-pulse">
                <div className="bg-gray-300 h-48 rounded-lg mb-4"></div>
                <div className="h-4 bg-gray-300 rounded mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3 mb-2"></div>
                <div className="h-4 bg-gray-300 rounded w-1/3"></div>
              </Card>
            ))
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No se encontraron productos</p>
            </div>
          ) : (
            filteredProducts.map((product: Product) => (
              <ProductAdminCard
                key={product._id}
                product={product}
                openEditModal={openEditModal}
                handleDeleteProduct={handleDeleteProduct}
                handleToggleStatus={handleToggleStatus}
                getStockStatus={getStockStatus}
              />
            ))
          )}
        </div>
      </main>

      {/* Create Product Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200/50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Crear Producto
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Columna izquierda */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Descripción *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Precio *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Categoría *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="shirts">Camisetas</option>
                    <option value="pants">Pantalones</option>
                    <option value="dresses">Vestidos</option>
                    <option value="shoes">Zapatos</option>
                    <option value="accessories">Accesorios</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Género *
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  >
                    {genderOptions.map(
                      (option: { value: string; label: string }) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
              {/* Columna derecha */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Stock *
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    SKU *
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    placeholder="Se generará automáticamente si se deja vacío"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Material
                  </label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) =>
                      setFormData({ ...formData, material: e.target.value })
                    }
                    placeholder="ej: 100% Algodón"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Peso (gramos)
                  </label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weight: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
            {/* Campos de ancho completo */}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">
                  Imágenes
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) =>
                    setSelectedImages(Array.from(e.target.files || []))
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                />
                {selectedImages.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-2">
                      {selectedImages.length} imagen(es) seleccionada(s):
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {selectedImages.map((file: File, index: number) => (
                        <div key={index} className="relative">
                          <img
                            src={
                              URL.createObjectURL(file) || '/placeholder.svg'
                            }
                            alt={`Preview ${index + 1}`}
                            className="w-full h-20 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = selectedImages.filter(
                                (_, i) => i !== index
                              );
                              setSelectedImages(newImages);
                            }}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) =>
                    setFormData({ ...formData, featured: e.target.checked })
                  }
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm text-slate-700">
                  Producto destacado
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProduct}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200/50">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Editar Producto
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Columna izquierda */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Descripción
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Precio
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Categoría
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="">Seleccionar categoría</option>
                    <option value="shirts">Camisetas</option>
                    <option value="pants">Pantalones</option>
                    <option value="dresses">Vestidos</option>
                    <option value="shoes">Zapatos</option>
                    <option value="accessories">Accesorios</option>
                  </select>
                </div>
              </div>
              {/* Columna derecha */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Stock
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Género
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    {genderOptions.map(
                      (option: { value: string; label: string }) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({ ...formData, brand: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Material
                  </label>
                  <input
                    type="text"
                    value={formData.material}
                    onChange={(e) =>
                      setFormData({ ...formData, material: e.target.value })
                    }
                    placeholder="ej: 100% Algodón"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-700">
                    Peso (gramos)
                  </label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weight: Number.parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) =>
                    setFormData({ ...formData, featured: e.target.checked })
                  }
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <label className="text-sm text-slate-700">
                  Producto destacado
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateProduct}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductAdminCard({
  product,
  openEditModal,
  handleDeleteProduct,
  handleToggleStatus,
  getStockStatus,
}: {
  product: Product;
  openEditModal: (product: Product) => void;
  handleDeleteProduct: (id: string) => void;
  handleToggleStatus: (id: string) => void;
  getStockStatus: (stock: number) => { text: string; color: string };
}) {
  const firstImageData =
    product.images && product.images.length > 0 ? product.images[0] : null;

  const { imageUrl, handleImageLoad, handleImageError } = useCloudinaryImage(
    firstImageData,
    product.name || 'Producto'
  );

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        <div className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 overflow-hidden rounded-t-lg flex items-center justify-center">
          <Image
            src={imageUrl || '/placeholder.svg'}
            alt={product.name || 'Producto'}
            width={200}
            height={200}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        </div>
        <div className="absolute top-2 right-2 flex space-x-1">
          {!product.isActive && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
              Inactivo
            </span>
          )}
          {product.discountPrice && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
              Oferta
            </span>
          )}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 truncate">
          {product.name || 'Sin nombre'}
        </h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description || 'Sin descripción'}
        </p>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {product.discountPrice ? (
              <>
                <span className="text-lg font-bold text-green-600">
                  ${product.discountPrice}
                </span>
                <span className="text-sm text-gray-500 line-through">
                  ${product.price}
                </span>
              </>
            ) : (
              <span className="text-lg font-bold text-gray-900">
                ${product.price || 0}
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
        <div className="flex items-center justify-between mb-4">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded-full ${
              getStockStatus(product.stock || 0).color
            }`}
          >
            {getStockStatus(product.stock || 0).text}
          </span>
          <span className="text-sm text-gray-600">
            Stock: {product.stock || 0}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button className="text-blue-600 hover:text-blue-900 p-1 rounded">
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => openEditModal(product)}
              className="text-green-600 hover:text-green-900 p-1 rounded"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteProduct(product._id)}
              className="text-red-600 hover:text-red-900 p-1 rounded"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => handleToggleStatus(product._id)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              product.isActive
                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                : 'bg-green-100 text-green-800 hover:bg-green-200'
            }`}
          >
            {product.isActive ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      </div>
    </Card>
  );
}
