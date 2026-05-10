const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    },
    ...options
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Server returned an invalid response.');
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

export function getSession() {
  return request('/auth/me.php');
}

export function login(email, password, csrfToken) {
  return request('/auth/login.php', {
    method: 'POST',
    body: JSON.stringify({ email, password, csrfToken })
  });
}

export function registerOwner(payload) {
  return request('/auth/register.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function logout(csrfToken) {
  return request('/auth/logout.php', {
    method: 'POST',
    body: JSON.stringify({ csrfToken })
  });
}

export function getDashboardSummary() {
  return request('/dashboard/summary.php');
}

export function listUsers(query = '') {
  const search = query ? `?q=${encodeURIComponent(query)}` : '';
  return request(`/users/list.php${search}`);
}

export function createUser(payload) {
  return request('/users/create.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateProfile(payload) {
  return request('/users/profile.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function changePassword(payload) {
  return request('/users/password.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function uploadPhoto(formData) {
  return request('/users/photo.php', {
    method: 'POST',
    body: formData
  });
}

export function getTenants(params = {}) {
  const searchParams = new URLSearchParams();
  const query = params.query ?? '';
  const status = params.status ?? '';
  const unitId = params.unitId ?? '';
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  if (query) {
    searchParams.set('q', query);
  }

  if (status) {
    searchParams.set('status', status);
  }

  if (unitId) {
    searchParams.set('unitId', String(unitId));
  }

  if (limit !== undefined && limit !== null) {
    searchParams.set('limit', String(limit));
  }

  if (offset !== undefined && offset !== null) {
    searchParams.set('offset', String(offset));
  }

  const queryString = searchParams.toString();

  return request(`/tenants/list.php${queryString ? `?${queryString}` : ''}`);
}

export function getTenant(id) {
  const query = id ? `?id=${encodeURIComponent(id)}` : '';
  return request(`/tenants/view.php${query}`);
}

export function createTenant(payload) {
  return request('/tenants/create.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateTenant(payload) {
  return request('/tenants/update.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function deleteTenant(payload) {
  return request('/tenants/delete.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function uploadTenantPhoto(formData) {
  return request('/tenants/photo.php', {
    method: 'POST',
    body: formData
  });
}

export function uploadTenantDocument(formData) {
  return request('/tenants/document-upload.php', {
    method: 'POST',
    body: formData
  });
}

export function deleteTenantDocument(payload) {
  return request('/tenants/document-delete.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getProperties(params = {}) {
  const searchParams = new URLSearchParams();
  const query = params.query ?? '';
  const status = params.status ?? '';
  const propertyTypeId = params.propertyTypeId ?? '';
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  if (query) {
    searchParams.set('q', query);
  }

  if (status) {
    searchParams.set('status', status);
  }

  if (propertyTypeId) {
    searchParams.set('propertyTypeId', String(propertyTypeId));
  }

  if (limit !== undefined && limit !== null) {
    searchParams.set('limit', String(limit));
  }

  if (offset !== undefined && offset !== null) {
    searchParams.set('offset', String(offset));
  }

  const queryString = searchParams.toString();

  return request(`/properties/list.php${queryString ? `?${queryString}` : ''}`);
}

export function getProperty(id) {
  const query = id ? `?id=${encodeURIComponent(id)}` : '';
  return request(`/properties/view.php${query}`);
}

export function createProperty(payload) {
  return request('/properties/create.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateProperty(payload) {
  return request('/properties/update.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function deleteProperty(payload) {
  return request('/properties/delete.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function uploadPropertyImage(formData) {
  return request('/properties/image-upload.php', {
    method: 'POST',
    body: formData
  });
}

export function deletePropertyImage(payload) {
  return request('/properties/image-delete.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getUnits(params = {}) {
  const searchParams = new URLSearchParams();
  const query = params.query ?? '';
  const status = params.status ?? '';
  const propertyId = params.propertyId ?? '';
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  if (query) {
    searchParams.set('q', query);
  }

  if (status) {
    searchParams.set('status', status);
  }

  if (propertyId) {
    searchParams.set('propertyId', String(propertyId));
  }

  if (limit !== undefined && limit !== null) {
    searchParams.set('limit', String(limit));
  }

  if (offset !== undefined && offset !== null) {
    searchParams.set('offset', String(offset));
  }

  const queryString = searchParams.toString();

  return request(`/units/list.php${queryString ? `?${queryString}` : ''}`);
}

export function getUnit(id) {
  const query = id ? `?id=${encodeURIComponent(id)}` : '';
  return request(`/units/view.php${query}`);
}

export function createUnit(payload) {
  return request('/units/create.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateUnit(payload) {
  return request('/units/update.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function deleteUnit(payload) {
  return request('/units/delete.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function listPropertyTypes() {
  return request('/property-types/list.php');
}

export function createPropertyType(payload) {
  return request('/property-types/create.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updatePropertyType(payload) {
  return request('/property-types/update.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function deletePropertyType(payload) {
  return request('/property-types/delete.php', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
