import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface ProductFilters {
  category?: string;
  gender?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  brand?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  category: string;
  brand?: string;
  sizes?: string[];
  colors?: string[];
  gender: string; // Ahora es requerido
  stock: number;
  images?: string[];
  featured?: boolean;
  tags?: string[];
  material?: string;
  sku: string; // Ahora es requerido
  weight?: number;
}

export interface UpdateProductData {
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  brand?: string;
  sizes?: string[];
  colors?: string[];
  gender?: string;
  stock?: number;
  images?: string[];
  featured?: boolean;
  tags?: string[];
  material?: string;
  sku?: string;
  weight?: number;
}

const productsApi = {
  getProducts: async (filters: ProductFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });
    const response = await axios.get(
      `${API_URL}/products?${params.toString()}`
    );
    return response.data.data;
  },

  getProduct: async (id: string) => {
    const response = await axios.get(`${API_URL}/products/${id}`);
    return response.data.data;
  },

  getFeaturedProducts: async (limit = 10) => {
    const response = await axios.get(
      `${API_URL}/products/featured?limit=${limit}`
    );
    return response.data.data;
  },

  getProductsByCategory: async (category: string) => {
    const response = await axios.get(
      `${API_URL}/products/category/${category}`
    );
    return response.data.data;
  },

  searchProducts: async (query: string, filters: ProductFilters = {}) => {
    const searchFilters = { ...filters, search: query };
    return productsApi.getProducts(searchFilters);
  },

  createProduct: async (token: string, productData: CreateProductData) => {
    const response = await axios.post(`${API_URL}/products`, productData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  },

  createProductWithImages: async (
    token: string,
    productData: CreateProductData,
    images: File[]
  ) => {
    const formData = new FormData();

    // Campos requeridos
    formData.append('name', productData.name);
    formData.append('description', productData.description);
    formData.append('price', productData.price.toString());
    formData.append('category', productData.category);
    formData.append('stock', productData.stock.toString());
    formData.append('gender', productData.gender); // Requerido
    formData.append('sku', productData.sku); // Requerido

    // Campos opcionales
    if (productData.brand) {
      formData.append('brand', productData.brand);
    }

    if (productData.material) {
      formData.append('material', productData.material);
    }

    if (productData.weight !== undefined) {
      formData.append('weight', productData.weight.toString());
    }

    if (productData.featured !== undefined) {
      formData.append('featured', productData.featured.toString());
    }

    // Arrays
    if (productData.sizes && productData.sizes.length > 0) {
      productData.sizes.forEach((size) => {
        formData.append('availableSizes[]', size);
      });
    }

    if (productData.colors && productData.colors.length > 0) {
      productData.colors.forEach((color) => {
        formData.append('colors[]', color);
      });
    }

    if (productData.tags && productData.tags.length > 0) {
      productData.tags.forEach((tag) => {
        formData.append('tags[]', tag);
      });
    }

    // Agregar imágenes
    images.forEach((image) => {
      formData.append('images', image);
    });

    const response = await axios.post(
      `${API_URL}/products/with-images`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  updateProduct: async (
    token: string,
    productId: string,
    productData: UpdateProductData
  ) => {
    const response = await axios.patch(
      `${API_URL}/products/${productId}`,
      productData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },

  deleteProduct: async (token: string, productId: string) => {
    const response = await axios.delete(`${API_URL}/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  uploadProductImage: async (token: string, productId: string, image: File) => {
    const formData = new FormData();
    formData.append('image', image);
    const response = await axios.post(
      `${API_URL}/products/${productId}/upload-image`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  uploadProductImages: async (
    token: string,
    productId: string,
    images: File[]
  ) => {
    const formData = new FormData();
    images.forEach((image) => {
      formData.append('images', image);
    });
    const response = await axios.post(
      `${API_URL}/products/${productId}/upload-images`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  removeProductImage: async (
    token: string,
    productId: string,
    imagePath: string
  ) => {
    const response = await axios.delete(
      `${API_URL}/products/${productId}/images`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: {
          imagePath,
        },
      }
    );
    return response.data;
  },
};

export { productsApi };
