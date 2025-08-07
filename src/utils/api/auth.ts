import { AUTH_ENDPOINTS } from './endpoints';
import type { User, Session, AuthResponse } from '../../types/types';

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Recuperar token del localStorage al inicializar
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          this.user = JSON.parse(userData);
        } catch (error) {
          console.error('Error parsing user data:', error);
          this.clearAuth();
        }
      }
    }
  }

  // Configurar headers de autenticación
  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Guardar datos de autenticación
  private saveAuth(data: AuthResponse): void {
    if (typeof window === 'undefined') return;

    console.log('🔐 saveAuth called with data:', data);
    console.log('🔐 Session data:', data.session);
    console.log('🔐 Access token:', data.session?.access_token);

    this.token = data.session.access_token;
    this.user = data.user;

    console.log('🔐 Saved token:', this.token);
    console.log('🔐 Saved user:', this.user);

    localStorage.setItem('auth_token', this.token);
    localStorage.setItem('user_data', JSON.stringify(this.user));

    if (data.profile) {
      localStorage.setItem('user_profile', JSON.stringify(data.profile));
    }
  }

  // Limpiar datos de autenticación
  private clearAuth(): void {
    if (typeof window === 'undefined') return;

    this.token = null;
    this.user = null;

    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_profile');
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  // Obtener usuario actual
  getCurrentUser(): User | null {
    return this.user;
  }

  // Obtener token actual
  getToken(): string | null {
    console.log('🔑 getToken called - token exists:', !!this.token);
    if (this.token) {
      console.log('🔑 Token first 20 chars:', this.token.substring(0, 20));
    }
    return this.token;
  }

  // Verificar si el token es válido haciendo una llamada de prueba
  async verifyToken(): Promise<boolean> {
    try {
      const token = this.getToken();
      if (!token) {
        console.log('🔑 No token available for verification');
        return false;
      }

      console.log('🔑 Verifying token with backend...');

      // Usar el endpoint de "me" para verificar el token
      const response = await fetch(AUTH_ENDPOINTS.me, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const isValid = response.ok;
      console.log(
        '🔑 Token verification result:',
        isValid ? 'VALID' : 'INVALID'
      );

      if (!isValid) {
        const errorData = await response.json().catch(() => ({}));
        console.log('🔑 Token verification error:', errorData);
      }

      return isValid;
    } catch (error) {
      console.error('🔑 Token verification failed:', error);
      return false;
    }
  }

  // Verificar si el usuario es admin
  isAdmin(): boolean {
    const role = this.getUserRole();
    console.log('🔍 Debug isAdmin - Role detected:', role);
    console.log('🔍 Debug isAdmin - Is admin?', role === 'admin');
    return role === 'admin';
  }

  // Registro de usuario
  async register(userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }): Promise<AuthResponse & { requiresVerification?: boolean }> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.register, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el registro');
      }

      // 🔐 NO guardar la sesión automáticamente después del registro
      // El usuario debe verificar su email primero
      console.log('✅ Usuario registrado, pero requiere verificación de email');

      // Marcar que requiere verificación para el frontend
      return {
        ...data,
        requiresVerification: true,
      };
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  // Inicio de sesión
  async login(credentials: {
    email: string;
    password: string;
  }): Promise<AuthResponse> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.login, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error en el inicio de sesión');
      }

      this.saveAuth(data);
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Cerrar sesión
  async logout(): Promise<void> {
    try {
      if (this.token) {
        await fetch(AUTH_ENDPOINTS.logout, {
          method: 'POST',
          headers: this.getAuthHeaders(),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearAuth();
    }
  }

  // Obtener perfil del usuario
  async getProfile(): Promise<User> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.me, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error obteniendo perfil');
      }

      this.user = data.user;
      if (typeof window !== 'undefined') {
        localStorage.setItem('user_data', JSON.stringify(this.user));
      }

      return data.user;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  // Cambiar contraseña
  async changePassword(passwordData: {
    current_password: string;
    new_password: string;
  }): Promise<void> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.changePassword, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(passwordData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error cambiando contraseña');
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Recuperar contraseña
  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.forgotPassword, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error enviando email de recuperación');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  // Restablecer contraseña
  async resetPassword(resetData: {
    reset_token: string;
    new_password: string;
  }): Promise<void> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.resetPassword, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(resetData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error restableciendo contraseña');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  // Renovar token
  async refreshToken(): Promise<void> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.refreshToken, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error renovando token');
      }

      this.saveAuth(data);
    } catch (error) {
      console.error('Refresh token error:', error);
      this.clearAuth();
      throw error;
    }
  }

  // Métodos para manejo de roles
  getUserRole(): string | null {
    if (typeof window === 'undefined') return null;

    console.log('🔍 Debug getUserRole - Starting role detection...');

    // Intentar obtener desde el usuario en memoria
    if (this.user?.role) {
      console.log(
        '🔍 Debug getUserRole - Found role in memory:',
        this.user.role
      );
      return this.user.role;
    }

    // Intentar obtener desde localStorage directo
    const directRole = localStorage.getItem('user_role');
    if (directRole) {
      console.log(
        '🔍 Debug getUserRole - Found direct role in localStorage:',
        directRole
      );
      return directRole;
    }

    // Intentar obtener desde user_data
    const userData = localStorage.getItem('user_data');
    console.log('🔍 Debug getUserRole - user_data exists:', !!userData);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('🔍 Debug getUserRole - parsed user_data:', user);
        if (user.role) {
          console.log(
            '🔍 Debug getUserRole - Found role in user_data:',
            user.role
          );
          return user.role;
        }
        if (user.user_metadata?.role) {
          console.log(
            '🔍 Debug getUserRole - Found role in user_metadata:',
            user.user_metadata.role
          );
          return user.user_metadata.role;
        }
        if (user.user_metadata?.rol) {
          console.log(
            '🔍 Debug getUserRole - Found rol in user_metadata:',
            user.user_metadata.rol
          );
          return user.user_metadata.rol;
        }
      } catch (error) {
        console.error('Error parsing user data for role:', error);
      }
    }

    // Intentar obtener desde user_profile (fallback)
    const userProfile = localStorage.getItem('user_profile');
    console.log('🔍 Debug getUserRole - user_profile exists:', !!userProfile);
    if (userProfile) {
      try {
        const profile = JSON.parse(userProfile);
        console.log('🔍 Debug getUserRole - parsed user_profile:', profile);
        if (profile.role) {
          console.log(
            '🔍 Debug getUserRole - Found role in user_profile:',
            profile.role
          );
          return profile.role;
        }
        if (profile.user_metadata?.role) {
          console.log(
            '🔍 Debug getUserRole - Found role in profile user_metadata:',
            profile.user_metadata.role
          );
          return profile.user_metadata.role;
        }
        if (profile.user_metadata?.rol) {
          console.log(
            '🔍 Debug getUserRole - Found rol in profile user_metadata:',
            profile.user_metadata.rol
          );
          return profile.user_metadata.rol;
        }
        if (profile.rol) {
          console.log(
            '🔍 Debug getUserRole - Found rol in profile:',
            profile.rol
          );
          return profile.rol;
        }
      } catch (error) {
        console.error('Error parsing user profile for role:', error);
      }
    }

    console.log('🔍 Debug getUserRole - No role found anywhere');
    return null;
  }

  // Verificar si el usuario tiene un rol específico
  hasRole(roleToCheck: string): boolean {
    const role = this.getUserRole();
    return role === roleToCheck;
  }

  // Obtener nombre para mostrar (con truncado si es necesario)
  getDisplayName(maxLength: number = 20): string {
    if (!this.user) {
      // Intentar obtener desde localStorage
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          const name =
            user.full_name ||
            user.user_metadata?.full_name ||
            user.email?.split('@')[0] ||
            'Usuario';
          return this.truncateName(name, maxLength);
        } catch (error) {
          console.error('Error parsing user data for display name:', error);
          return 'Usuario';
        }
      }
      return 'Usuario';
    }

    const name =
      this.user.full_name ||
      this.user.user_metadata?.full_name ||
      this.user.email?.split('@')[0] ||
      'Usuario';

    return this.truncateName(name, maxLength);
  }

  // Truncar nombre si es muy largo
  private truncateName(name: string, maxLength: number): string {
    if (name.length <= maxLength) {
      return name;
    }

    // Si es un nombre completo, intentar mostrar solo el primer nombre
    const words = name.split(' ');
    if (words.length > 1 && words[0].length <= maxLength - 3) {
      return words[0] + '...';
    }

    // Si el primer nombre también es muy largo, truncar
    return name.substring(0, maxLength - 3) + '...';
  }

  // Obtener iniciales para avatars
  getInitials(): string {
    const name = this.getDisplayName(50); // Usar nombre completo para iniciales
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // Verificar email
  async verifyEmail(verifyData: {
    email: string;
    code: string;
  }): Promise<AuthResponse> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.verifyEmail, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(verifyData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error verificando email');
      }

      // Guardar datos de autenticación después de verificar el email
      this.saveAuth(data);
      return data;
    } catch (error) {
      console.error('Verify email error:', error);
      throw error;
    }
  }

  // Reenviar código de verificación
  async resendVerificationCode(resendData: { email: string }): Promise<void> {
    try {
      const response = await fetch(AUTH_ENDPOINTS.resendVerification, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(resendData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Error reenviando código de verificación'
        );
      }
    } catch (error) {
      console.error('Resend verification code error:', error);
      throw error;
    }
  }

  // Actualizar datos del usuario en localStorage
  updateUserData(userData: Partial<User>): void {
    if (typeof window === 'undefined') return;

    if (this.user) {
      this.user = { ...this.user, ...userData };
      localStorage.setItem('user_data', JSON.stringify(this.user));
    }
  }
}

// Instancia única del servicio de autenticación
export const authService = new AuthService();
export default authService;
