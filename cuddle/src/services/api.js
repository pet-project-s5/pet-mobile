import Constants from 'expo-constants';
import { getToken } from './auth';

// Resolve host dynamically so Expo Go on the phone can reach the backend
const hostFromExpoConfig = Constants.expoConfig?.hostUri?.split(':')?.[0];
const hostFromExpoGo = Constants.expoGoConfig?.debuggerHost?.split(':')?.[0];
const hostFromManifest = Constants.manifest?.debuggerHost?.split(':')?.[0];
const hostFromManifest2 = Constants.manifest2?.extra?.expoClient?.hostUri?.split(':')?.[0];

const resolvedHost =
  hostFromExpoConfig || hostFromExpoGo || hostFromManifest || hostFromManifest2 || 'localhost';

export const API_BASE_URL = `http://${resolvedHost}:8080`;

async function request(path, options = {}, authenticated = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (authenticated) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      message = body.message || body.error || message;
    } catch (_) {}
    const err = new Error(message);
    err.status = response.status;
    throw err;
  }

  return response.json();
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  // Returns: { id, name, email, token, isAdmin }
  return request('/api/owners/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(payload) {
  // Returns: { id, name, email }
  return request('/api/owners', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ─── OWNERS ──────────────────────────────────────────────────────────────────

export async function getOwnerById() {
  return request('/api/owners/me', {}, true);
}

// ─── PETS ────────────────────────────────────────────────────────────────────

export async function getPetsByUser(ownerId) {
  const data = await request(`/api/pets/all/${ownerId}`, {}, true);
  return data ?? [];
}

export async function getPetById(petId, ownerId) {
  return request(`/api/pets/${petId}/${ownerId}`, {}, true);
}

export async function createPet(ownerId, payload) {
  // payload: { name, size, species, breed, coat, age, sex }
  return request(`/api/pets/${ownerId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
}

export async function updatePet(petId, payload) {
  // payload: { name, size, species, breed, coat, age, sex }
  return request(`/api/pets/${petId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }, true);
}

// ─── PET OFFERINGS (SERVICES) ────────────────────────────────────────────────

export async function getServices() {
  const data = await request('/api/pet-offerings', {}, true);
  return data ?? [];
}

export async function getServicePricesForPet(petId, petOfferingIds) {
  const query = petOfferingIds.map((id) => `petOfferingIds=${id}`).join('&');
  return request(`/api/pet-offerings/price/${petId}?${query}`, {}, true);
}

// ─── APPOINTMENTS ─────────────────────────────────────────────────────────────

export async function getAppointmentsByUser(ownerId, page = 0, size = 20) {
  const result = await request(
    `/api/appointments/owner/${ownerId}?page=${page}&size=${size}`,
    {},
    true
  );
  // result is a PageResponse — return the content array (or [] if 204/empty)
  return result?.content ?? [];
}

export async function getAvailableTimes(petId, date, petOfferingIds) {
  // date: 'YYYY-MM-DD'
  return request(`/api/appointments/available-times/${petId}`, {
    method: 'POST',
    body: JSON.stringify({ date, petOfferingIds }),
  }, true);
}

export async function createAppointment(payload) {
  // payload: { petId, employee_id, petOfferingNames, totalPrice, observations, startDateTime, durationMinutes }
  return request('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, true);
}

export async function deleteAppointment(appointmentId) {
  return request(`/api/appointments/${appointmentId}`, {
    method: 'DELETE',
  }, true);
}
