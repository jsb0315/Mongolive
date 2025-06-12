import { useState, useEffect } from 'react';

// Custom hook for managing local storage operations
const useLocalStorage = (key: string, initialValue: any) => {
  // State to hold the stored value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Get the item from local storage
      const item = window.localStorage.getItem(key);
      // Parse and return the item or return the initial value
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Effect to update local storage whenever the stored value changes
  useEffect(() => {
    try {
      // Convert the value to a string and set it in local storage
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Return the stored value and a function to update it
  return [storedValue, setStoredValue] as const;
};

export default useLocalStorage;