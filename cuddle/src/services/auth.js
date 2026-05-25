import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_TOKEN  = '@cuddle:token';
const KEY_USERID = '@cuddle:userId';
const KEY_NAME   = '@cuddle:userName';
const KEY_ISADM  = '@cuddle:isAdm';

let _token    = null;
let _userId   = null;
let _userName = null;
let _isAdm    = false;

export async function setAuth(token, userId, userName, isAdm = false) {
  _token    = token;
  _userId   = userId;
  _userName = userName;
  _isAdm    = Boolean(isAdm);
  await Promise.all([
    AsyncStorage.setItem(KEY_TOKEN,  String(token)),
    AsyncStorage.setItem(KEY_USERID, String(userId)),
    AsyncStorage.setItem(KEY_NAME,   String(userName)),
    AsyncStorage.setItem(KEY_ISADM,  _isAdm ? '1' : '0'),
  ]);
}

export async function restoreAuth() {
  try {
    const [token, userId, userName, isAdmRaw] = await Promise.all([
      AsyncStorage.getItem(KEY_TOKEN),
      AsyncStorage.getItem(KEY_USERID),
      AsyncStorage.getItem(KEY_NAME),
      AsyncStorage.getItem(KEY_ISADM),
    ]);
    if (token) {
      _token    = token;
      _userId   = userId;
      _userName = userName;
      _isAdm    = isAdmRaw === '1' || isAdmRaw === 'true';
      return { token, userId, userName, isAdm: _isAdm };
    }
  } catch (_) {}
  return null;
}

export async function clearAuth() {
  _token    = null;
  _userId   = null;
  _userName = null;
  _isAdm    = false;
  await Promise.all([
    AsyncStorage.removeItem(KEY_TOKEN),
    AsyncStorage.removeItem(KEY_USERID),
    AsyncStorage.removeItem(KEY_NAME),
    AsyncStorage.removeItem(KEY_ISADM),
  ]);
}

export function getToken()    { return _token; }
export function getUserId()   { return _userId; }
export function getUserName() { return _userName; }
export function getIsAdm()    { return _isAdm; }
export function isAuthenticated() { return _token !== null; }
