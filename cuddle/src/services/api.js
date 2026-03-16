import Constants from 'expo-constants';

const hostFromExpoConfig = Constants.expoConfig?.hostUri?.split(':')?.[0];
const hostFromExpoGo = Constants.expoGoConfig?.debuggerHost?.split(':')?.[0];
const hostFromManifest = Constants.manifest?.debuggerHost?.split(':')?.[0];
const hostFromManifest2 = Constants.manifest2?.extra?.expoClient?.hostUri?.split(':')?.[0];

const resolvedHost =
  hostFromExpoConfig || hostFromExpoGo || hostFromManifest || hostFromManifest2 || 'localhost';

const API_BASE_URL = `http://${resolvedHost}:3001`;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = `Request failed: ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function login(email, password) {
  const users = await request(`/users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
  return users[0] || null;
}

export async function register(payload) {
  return request('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getPetsByUser(userId) {
  return request(`/pets?userId=${userId}`);
}

export async function getPetById(petId) {
  return request(`/pets/${petId}`);
}

export async function getUserById(userId) {
  return request(`/users/${userId}`);
}

export async function getServices() {
  return request('/services');
}

export async function getAppointmentsByUser(userId) {
  return request(`/appointments?userId=${userId}`);
}

export async function updatePet(petId, payload) {
  return request(`/pets/${petId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
