import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TOKEN  = '@cuddle:token';
const KEY_USERID = '@cuddle:userId';
const KEY_NAME   = '@cuddle:userName';

let _token    = null;
let _userId   = null;
let _userName = null;

export async function setAuth(token, userId, userName) {
  _token    = token;
  _userId   = userId;
  _userName = userName;
  await Promise.all([
    AsyncStorage.setItem(KEY_TOKEN,  String(token)),
    AsyncStorage.setItem(KEY_USERID, String(userId)),
    AsyncStorage.setItem(KEY_NAME,   String(userName)),
  ]);
}

export async function restoreAuth() {
  try {
    const [token, userId, userName] = await Promise.all([
      AsyncStorage.getItem(KEY_TOKEN),
      AsyncStorage.getItem(KEY_USERID),
      AsyncStorage.getItem(KEY_NAME),
    ]);
    if (token) {
      _token    = token;
      _userId   = userId;
      _userName = userName;
      return { token, userId, userName };
    }
  } catch (_) {}
  return null;
}

export async function clearAuth() {
  _token    = null;
  _userId   = null;
  _userName = null;
  await Promise.all([
    AsyncStorage.removeItem(KEY_TOKEN),
    AsyncStorage.removeItem(KEY_USERID),
    AsyncStorage.removeItem(KEY_NAME),
  ]);
}

export function getToken()    { return _token; }
export function getUserId()   { return _userId; }
export function getUserName() { return _userName; }
export function isAuthenticated() { return _token !== null; }
