import { authService, usersService } from '../../utils/api/index';
import type { User } from '../../types/types';

// Estado de la aplicación para usuarios
let currentPage = 1;
let currentFilters: any = {};
let currentUser: any = null;

export async function initializeUsuariosPage() {
  const loadingEl = document.getElementById('loading');
  const accessDeniedEl = document.getElementById('access-denied');
  const usersPanelEl = document.getElementById('users-panel');

  try {
    // Verificar autenticación
    if (!authService.isAuthenticated()) {
      function closeCreateUserModal() {
        const modal = document.querySelector(
          '.fixed.inset-0.bg-black.bg-opacity-50'
        );
        if (modal) {
          modal.remove();
        }
      }

      function closeUserModal() {
        const modal = document.querySelector(
          '.fixed.inset-0.bg-black.bg-opacity-50'
        );
        if (modal) {
          modal.remove();
        }
      }
      loadingEl?.classList.add('hidden');
      window.location.href =
        '/login?return=' + encodeURIComponent(window.location.pathname);
      return;
    }

    currentUser = authService.getCurrentUser();

    // Verificar permisos de administrador
    if (!authService.isAdmin()) {
      loadingEl?.classList.add('hidden');
      accessDeniedEl?.classList.remove('hidden');
      return;
    }

    // Inicializar UI de gestión de usuarios
    setupEventListeners();
    await loadUsers();
    await loadUserStats();

    loadingEl?.classList.add('hidden');
    usersPanelEl?.classList.remove('hidden');
  } catch (error) {
    console.error('Error initializing users page:', error);
    loadingEl?.classList.add('hidden');
    accessDeniedEl?.classList.remove('hidden');
  }
}

function setupEventListeners() {
  // Filtros
  const filterBtn = document.getElementById('users-filter-btn');
  filterBtn?.addEventListener('click', loadUsers);

  const searchInput = document.getElementById(
    'users-search'
  ) as HTMLInputElement;
  if (searchInput) {
    let timeout: NodeJS.Timeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(loadUsers, 500);
    });
  }

  // Exportar
  const exportBtn = document.getElementById('export-users-btn');
  exportBtn?.addEventListener('click', exportUsers);

  // Limpiar filtros
  const clearBtn = document.getElementById('clear-filters-btn');
  clearBtn?.addEventListener('click', clearFilters);

  // Nuevo usuario
  const addBtn = document.getElementById('add-user-btn');
  addBtn?.addEventListener('click', showCreateUserModal);
}

async function loadUserStats() {
  try {
    const response = await usersService.getAllUsers({ page: 1, limit: 100 });
    console.log('Response from backend:', response);
    const users = response.users || [];
    console.log('Users array:', users);

    // Calcular estadísticas
    const today = new Date().toDateString();
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();

    const todayUsers = users.filter(
      (user: any) => new Date(user.created_at).toDateString() === today
    );

    const monthUsers = users.filter((user: any) => {
      const userDate = new Date(user.created_at);
      return (
        userDate.getMonth() === thisMonth && userDate.getFullYear() === thisYear
      );
    });

    const activeUsers = users.filter((user: any) => user.is_active);
    const adminUsers = users.filter((user: any) => user.rol === 'admin');

    console.log('Stats calculated:', {
      total: users.length,
      active: activeUsers.length,
      today: todayUsers.length,
      admins: adminUsers.length,
    });

    // Actualizar UI
    updateStatElement('total-users', users.length.toString());
    updateStatElement('active-users', activeUsers.length.toString());
    updateStatElement('new-users-today', todayUsers.length.toString());
    updateStatElement('admin-users', adminUsers.length.toString());
  } catch (error) {
    console.error('Error loading user stats:', error);
  }
}

// Cargar usuarios con filtros
export async function loadUsers() {
  const tableBody = document.getElementById('users-table-body');
  if (!tableBody) return;

  try {
    // Mostrar loading
    showLoading(true);

    // Obtener filtros
    const filters = getCurrentFilters();
    console.log('Filters being sent:', filters);

    const response = await usersService.getAllUsers(filters);
    console.log('Users response:', response);

    if (!response.users || response.users.length === 0) {
      showEmptyState();
      return;
    }

    renderUsersTable(response.users);
    updatePagination(response.pagination);
  } catch (error) {
    console.error('Error loading users:', error);
    showErrorState();
  } finally {
    showLoading(false);
  }
}

// Obtener filtros actuales
function getCurrentFilters() {
  const search =
    (document.getElementById('users-search') as HTMLInputElement)?.value || '';
  const role =
    (document.getElementById('users-role') as HTMLSelectElement)?.value || '';
  const status =
    (document.getElementById('users-status') as HTMLSelectElement)?.value || '';

  const filters: any = { page: currentPage, limit: 10 };
  if (search) filters.search = search;
  if (role) filters.role = role;
  if (status) filters.is_active = status === 'true';

  return filters;
}

// Renderizar tabla de usuarios
function renderUsersTable(users: any[]) {
  const tableBody = document.getElementById('users-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = users
    .map(
      (user: any) => `
    <tr class="hover:bg-neutral-50 transition-colors">
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="w-10 h-10 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center mr-3">
            <span class="text-white font-medium text-sm">
              ${(user.full_name || user.email).substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div class="text-sm font-medium text-neutral-900">${
              user.full_name || 'Sin nombre'
            }</div>
            <div class="text-sm text-neutral-500">ID: ${user.id}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-neutral-900">${user.email}</div>
        <div class="text-sm text-neutral-500">
          Registrado: ${new Date(user.created_at).toLocaleDateString()}
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <select onchange="updateUserRole('${user.id}', this.value)" 
                class="text-xs border-neutral-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${getRoleClass(
                  user.rol
                )}">
          <option value="cliente" ${
            user.rol === 'cliente' ? 'selected' : ''
          }>Cliente</option>
          <option value="admin" ${
            user.rol === 'admin' ? 'selected' : ''
          }>Admin</option>
          <option value="moderador" ${
            user.rol === 'moderador' ? 'selected' : ''
          }>Moderador</option>
        </select>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          user.is_active
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }">
          ${user.is_active ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
        ${user.phone || 'Sin teléfono'}
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div class="flex space-x-2">
          <button onclick="viewUserDetails('${user.id}')" 
                  class="text-indigo-600 hover:text-indigo-900 transition-colors">
            Ver
          </button>
          <button onclick="editUser('${user.id}')" 
                  class="text-blue-600 hover:text-blue-900 transition-colors">
            Editar
          </button>
          <button onclick="toggleUserStatus('${user.id}', ${user.is_active})" 
                  class="text-yellow-600 hover:text-yellow-900 transition-colors">
            ${user.is_active ? 'Desactivar' : 'Activar'}
          </button>
          <button onclick="deleteUser('${user.id}')" 
                  class="text-red-600 hover:text-red-900 transition-colors">
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  `
    )
    .join('');
}

// Funciones de utilidad
function updateStatElement(id: string, value: string) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function showLoading(show: boolean) {
  const tableBody = document.getElementById('users-table-body');

  if (show && tableBody) {
    tableBody.innerHTML =
      '<tr><td colspan="6" class="px-6 py-4 text-center"><div class="flex items-center justify-center"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mr-2"></div>Cargando usuarios...</div></td></tr>';
  }
}

function showEmptyState() {
  const tableBody = document.getElementById('users-table-body');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-12 text-center">
          <div class="text-neutral-400 mb-2">
            <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p class="text-neutral-500 font-medium">No se encontraron usuarios</p>
          <p class="text-neutral-400 text-sm">Intenta ajustar los filtros de búsqueda</p>
        </td>
      </tr>
    `;
  }
}

function showErrorState() {
  const tableBody = document.getElementById('users-table-body');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="px-6 py-12 text-center text-red-500">
          <div class="text-red-400 mb-2">
            <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p class="font-medium">Error al cargar los usuarios</p>
          <button onclick="window.location.reload()" class="mt-2 text-sm bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 transition-colors">
            Reintentar
          </button>
        </td>
      </tr>
    `;
  }
}

function updatePagination(pagination: any) {
  const paginationEl = document.getElementById('users-pagination');
  if (!paginationEl || !pagination) return;

  // Calcular valores desde el backend
  const currentPage = pagination.page || 1;
  const totalPages = pagination.totalPages || 1;
  const total = pagination.total || 0;
  const limit = pagination.limit || 10;
  const from = (currentPage - 1) * limit + 1;
  const to = Math.min(currentPage * limit, total);

  paginationEl.innerHTML = `
    <div class="text-sm text-neutral-700">
      Mostrando ${from} a ${to} de ${total} usuarios
    </div>
    <div class="flex items-center space-x-2">
      <button onclick="changePage(${currentPage - 1})" 
              ${currentPage <= 1 ? 'disabled' : ''} 
              class="px-3 py-1 border border-neutral-300 rounded-md text-sm transition-colors ${
                currentPage <= 1
                  ? 'opacity-50 cursor-not-allowed bg-neutral-100'
                  : 'hover:bg-neutral-50 hover:border-neutral-400'
              }">
        Anterior
      </button>
      <span class="px-3 py-1 text-sm font-medium">
        Página ${currentPage} de ${totalPages}
      </span>
      <button onclick="changePage(${currentPage + 1})" 
              ${currentPage >= totalPages ? 'disabled' : ''} 
              class="px-3 py-1 border border-neutral-300 rounded-md text-sm transition-colors ${
                currentPage >= totalPages
                  ? 'opacity-50 cursor-not-allowed bg-neutral-100'
                  : 'hover:bg-neutral-50 hover:border-neutral-400'
              }">
        Siguiente
      </button>
    </div>
  `;
}

function getRoleClass(role: string): string {
  switch (role) {
    case 'admin':
      return 'text-red-700 bg-red-50 border-red-200';
    case 'moderador':
      return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'cliente':
      return 'text-green-700 bg-green-50 border-green-200';
    default:
      return 'text-neutral-700 bg-neutral-50 border-neutral-200';
  }
}

function clearFilters() {
  const searchInput = document.getElementById(
    'users-search'
  ) as HTMLInputElement;
  const roleSelect = document.getElementById('users-role') as HTMLSelectElement;
  const statusSelect = document.getElementById(
    'users-status'
  ) as HTMLSelectElement;

  if (searchInput) searchInput.value = '';
  if (roleSelect) roleSelect.value = '';
  if (statusSelect) statusSelect.value = '';

  currentPage = 1;
  loadUsers();
}

async function exportUsers() {
  try {
    showToast('Preparando exportación...', 'info');

    const filters = getCurrentFilters();
    filters.limit = 100;

    const response = await usersService.getAllUsers(filters);

    const csvData = [
      [
        'ID',
        'Nombre',
        'Email',
        'Rol',
        'Estado',
        'Teléfono',
        'Fecha Registro',
      ].join(','),
      ...(response.users ?? []).map((user: any) =>
        [
          user.id,
          `"${user.full_name || 'Sin nombre'}"`,
          `"${user.email}"`,
          user.rol,
          user.is_active ? 'Activo' : 'Inactivo',
          `"${user.phone || 'Sin teléfono'}"`,
          new Date(user.created_at).toLocaleDateString(),
        ].join(',')
      ),
    ].join('\n');

    // Descargar archivo
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    showToast('Usuarios exportados correctamente', 'success');
  } catch (error) {
    console.error('Error exporting users:', error);
    showToast('Error al exportar usuarios', 'error');
  }
}

function showCreateUserModal() {
  const modal = document.createElement('div');
  modal.className =
    'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-neutral-900">
          Crear Nuevo Usuario
        </h3>
        <button onclick="closeCreateUserModal()" class="text-neutral-400 hover:text-neutral-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <form id="create-user-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-neutral-700">Nombre completo *</label>
          <input type="text" id="create-user-name" 
                 placeholder="Ingresa el nombre completo"
                 class="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700">Email *</label>
          <input type="email" id="create-user-email" 
                 placeholder="ejemplo@email.com"
                 class="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700">Rol *</label>
          <select id="create-user-role" class="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            <option value="cliente">Cliente</option>
            <option value="admin">Administrador</option>
            <option value="moderador">Moderador</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700">Contraseña *</label>
          <input type="password" id="create-user-password" 
                 placeholder="Mínimo 6 caracteres"
                 class="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
          <p class="text-xs text-gray-500 mt-1">La contraseña debe tener al menos 6 caracteres</p>
        </div>
        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button type="button" onclick="closeCreateUserModal()" class="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors">
            Crear Usuario
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Agregar event listener al formulario de creación
  const form = document.getElementById('create-user-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    createUser();
  });

  // Auto-focus en el primer campo
  const firstInput = document.getElementById(
    'create-user-name'
  ) as HTMLInputElement;
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

function closeCreateUserModal() {
  const modal = document.querySelector('.fixed.inset-0.bg-black');
  if (modal) {
    modal.remove();
  }
}

function showUserModal(user: any) {
  const modal = document.createElement('div');
  modal.className =
    'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-neutral-900">
          Editar Usuario
        </h3>
        <button onclick="closeUserModal()" class="text-neutral-400 hover:text-neutral-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <form id="edit-user-form" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-neutral-700">Nombre completo *</label>
          <input type="text" id="edit-user-name" value="${
            user.full_name || ''
          }" 
                 placeholder="Ingresa el nombre completo"
                 class="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700">Email *</label>
          <input type="email" id="edit-user-email" value="${user.email || ''}" 
                 placeholder="ejemplo@email.com"
                 readonly
                 class="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-100">
          <p class="text-xs text-gray-500 mt-1">El email no se puede modificar</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-neutral-700">Rol *</label>
          <select id="edit-user-role" class="mt-1 w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
            <option value="cliente" ${
              user.rol === 'cliente' ? 'selected' : ''
            }>Cliente</option>
            <option value="admin" ${
              user.rol === 'admin' ? 'selected' : ''
            }>Administrador</option>
            <option value="moderador" ${
              user.rol === 'moderador' ? 'selected' : ''
            }>Moderador</option>
          </select>
        </div>
        <div class="flex justify-end space-x-3 pt-4 border-t">
          <button type="button" onclick="closeUserModal()" class="px-4 py-2 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 transition-colors">
            Cancelar
          </button>
          <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors">
            Actualizar Usuario
          </button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);

  // Agregar event listener al formulario de edición
  const form = document.getElementById('edit-user-form');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    updateUser(user.id);
  });

  // Auto-focus en el primer campo
  const firstInput = document.getElementById(
    'edit-user-name'
  ) as HTMLInputElement;
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 100);
  }
}

function closeUserModal() {
  const modal = document.querySelector('.fixed.inset-0.bg-black');
  if (modal) {
    modal.remove();
  }
}

async function createUser() {
  const name = (
    document.getElementById('create-user-name') as HTMLInputElement
  ).value.trim();
  const email = (
    document.getElementById('create-user-email') as HTMLInputElement
  ).value.trim();
  const role = (
    document.getElementById('create-user-role') as HTMLSelectElement
  ).value as 'cliente' | 'admin' | 'moderador' | 'vendedor';
  const password = (
    document.getElementById('create-user-password') as HTMLInputElement
  ).value;

  // Validaciones
  if (!name) {
    showToast('El nombre es obligatorio', 'error');
    return;
  }

  if (!email) {
    showToast('El email es obligatorio', 'error');
    return;
  }

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('Por favor ingresa un email válido', 'error');
    return;
  }

  if (!password) {
    showToast('La contraseña es obligatoria', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('La contraseña debe tener al menos 6 caracteres', 'error');
    return;
  }

  if (!role) {
    showToast('Por favor selecciona un rol', 'error');
    return;
  }

  try {
    // Deshabilitar el botón de envío para evitar doble clic
    const submitBtn = document.querySelector(
      '#create-user-form button[type="submit"]'
    ) as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creando usuario...';
    }

    // Usar el endpoint de registro directamente
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authService.getToken()}`,
      },
      body: JSON.stringify({
        full_name: name,
        email: email,
        password: password,
        rol: role,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al crear usuario');
    }

    showToast('Usuario creado correctamente', 'success');
    closeCreateUserModal();
    loadUsers();
    loadUserStats();
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof Error) {
      if (
        error.message.includes('already exists') ||
        error.message.includes('ya está registrado')
      ) {
        showToast('Ya existe un usuario con este email', 'error');
      } else if (
        error.message.includes('validation') ||
        error.message.includes('invalid')
      ) {
        showToast('Datos inválidos. Verifica la información', 'error');
      } else {
        showToast(error.message, 'error');
      }
    } else {
      showToast('Error al crear usuario', 'error');
    }
  } finally {
    // Rehabilitar el botón
    const submitBtn = document.querySelector(
      '#create-user-form button[type="submit"]'
    ) as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear Usuario';
    }
  }
}

async function updateUser(userId: string) {
  const name = (document.getElementById('edit-user-name') as HTMLInputElement)
    .value;
  const email = (document.getElementById('edit-user-email') as HTMLInputElement)
    .value;
  const role = (document.getElementById('edit-user-role') as HTMLSelectElement)
    .value as 'cliente' | 'admin' | 'moderador' | 'vendedor';

  if (!name || !email) {
    showToast('Por favor completa todos los campos', 'error');
    return;
  }

  try {
    // Usar rol en lugar de role para coincidir con el backend
    await usersService.updateUser(userId, {
      full_name: name,
      email,
      rol: role, // Cambiado de 'role' a 'rol'
    });
    showToast('Usuario actualizado correctamente', 'success');
    closeUserModal();
    loadUsers();
    loadUserStats();
  } catch (error) {
    console.error('Error updating user:', error);
    showToast('Error al actualizar usuario', 'error');
  }
}

function showToast(
  message: string,
  type: 'success' | 'error' | 'info' = 'success'
) {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
    type === 'success'
      ? 'bg-green-500 text-white'
      : type === 'error'
      ? 'bg-red-500 text-white'
      : 'bg-blue-500 text-white'
  }`;
  toast.textContent = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Funciones globales para llamadas desde HTML
declare global {
  interface Window {
    changePage: (page: number) => void;
    updateUserRole: (userId: string, role: string) => Promise<void>;
    viewUserDetails: (userId: string) => void;
    editUser: (userId: string) => void;
    toggleUserStatus: (userId: string, currentStatus: boolean) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    closeUserModal: () => void;
    closeCreateUserModal: () => void;
  }
}

// Exportar funciones globales
window.changePage = function (page: number) {
  currentPage = page;
  loadUsers();
};

window.updateUserRole = async function (userId: string, role: string) {
  try {
    await usersService.updateUserRole(parseInt(userId), role);
    showToast('Rol del usuario actualizado', 'success');
    loadUserStats();
  } catch (error) {
    console.error('Error updating user role:', error);
    showToast('Error al actualizar el rol', 'error');
    loadUsers(); // Recargar para revertir cambios
  }
};

window.viewUserDetails = function (userId: string) {
  showToast(`Ver detalles de usuario #${userId} - Por implementar`, 'info');
};

window.editUser = async function (userId: string) {
  try {
    const user = await usersService.getUserById(userId);
    showUserModal(user);
  } catch (error) {
    console.error('Error loading user:', error);
    showToast('Error al cargar usuario', 'error');
  }
};

window.toggleUserStatus = async function (
  userId: string,
  currentStatus: boolean
) {
  const action = currentStatus ? 'desactivar' : 'activar';
  if (confirm(`¿Estás seguro de que quieres ${action} este usuario?`)) {
    try {
      await usersService.toggleUserStatus(parseInt(userId));
      showToast(`Usuario ${action}do correctamente`, 'success');
      loadUsers();
      loadUserStats();
    } catch (error) {
      console.error('Error toggling user status:', error);
      showToast(`Error al ${action} el usuario`, 'error');
    }
  }
};

window.deleteUser = async function (userId: string) {
  if (
    confirm(
      '¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.'
    )
  ) {
    try {
      await usersService.deleteUser(userId);
      showToast('Usuario eliminado correctamente', 'success');
      loadUsers();
      loadUserStats();
    } catch (error) {
      console.error('Error deleting user:', error);
      showToast('Error al eliminar el usuario', 'error');
    }
  }
};

window.closeUserModal = closeUserModal;
window.closeCreateUserModal = closeCreateUserModal;
