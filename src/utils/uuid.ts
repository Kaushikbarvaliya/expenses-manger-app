/**
 * Generate a unique UUID for transactions
 * React Native compatible implementation that doesn't require crypto polyfills
 */
export const generateUUID = (): string => {
  // React Native compatible UUID generation
  // Using timestamp + random string approach that works in all environments
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 7);
  return `${timestamp}_${randomPart}_${randomPart2}`;
};

/**
 * Generate a UUID with a prefix for easier identification
 */
export const generatePrefixedUUID = (prefix: string): string => {
  return `${prefix}_${generateUUID()}`;
};

/**
 * Alternative UUID generator using counter for more deterministic approach
 */
let uuidCounter = 0;
export const generateCounterUUID = (): string => {
  const timestamp = Date.now().toString(36);
  const counter = (uuidCounter++).toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${timestamp}_${counter}_${randomPart}`;
};
