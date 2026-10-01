import { useState } from 'react';

// All storage is now handled by the backend database only
// These functions are kept as no-ops for backward compatibility

export function useLocalStorage(key, initialValue) {
  // Only keep state in memory, do not persist to localStorage
  const [storedValue, setStoredValue] = useState(initialValue);

  const setValue = (value) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value;
    setStoredValue(valueToStore);
    // No localStorage persistence
  };

  const removeValue = () => {
    setStoredValue(initialValue);
    // No localStorage removal
  };

  return [storedValue, setValue, removeValue];
}

export function readFromStorage(key, fallback = null) {
  // No localStorage - return fallback
  return fallback;
}

export function writeToStorage(key, value) {
  // No localStorage persistence
  return true;
}

export function removeFromStorage(key) {
  // No localStorage removal
  return true;
}

export function readFromSessionStorage(key, fallback = null) {
  // No sessionStorage - return fallback
  return fallback;
}

export function writeToSessionStorage(key, value) {
  // No sessionStorage persistence
  return true;
}

export function removeFromSessionStorage(key) {
  // No sessionStorage removal
  return true;
}
