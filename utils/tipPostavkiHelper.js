/**
 * Helper function to determine tipPostavki (delivery type) from task name
 * @param {string} nazvanie_zadaniya - Task name or filename
 * @returns {boolean|null} - true for box delivery (коробочная), false for pallet delivery (паллетная), null if unknown
 */
function determineTipPostavki(nazvanie_zadaniya) {
  if (!nazvanie_zadaniya || typeof nazvanie_zadaniya !== 'string') {
    return null;
  }

  const lowerName = nazvanie_zadaniya.toLowerCase();
  
  // Check for "короб" or "коробочн" keywords - box delivery
  if (lowerName.includes('короб') || lowerName.includes('коробочн')) {
    return true;
  }
  
  // Check for "паллет" or "паллетн" keywords - pallet delivery
  if (lowerName.includes('паллет') || lowerName.includes('паллетн')) {
    return false;
  }
  
  // TODO: Add more business logic if needed
  // For example:
  // - Check for specific marketplaces (OZON, WB, etc.)
  // - Check for specific warehouse prefixes
  // - Parse file names for additional markers
  
  // Default to null if no keyword found
  return null;
}

/**
 * Convert tipPostavki value to human-readable string
 * @param {boolean|null} tipPostavki - Delivery type
 * @returns {string} - "коробочная", "паллетная", or "не определено"
 */
function tipPostavkiToString(tipPostavki) {
  if (tipPostavki === true) {
    return 'коробочная';
  } else if (tipPostavki === false) {
    return 'паллетная';
  } else {
    return 'не определено';
  }
}

/**
 * Helper function to determine Mono flag from task name
 * Mono = true means only one article per pallet is allowed
 * @param {string} nazvanie_zadaniya - Task name or filename
 * @returns {boolean} - true if task name contains "МОНО", false otherwise
 */
function determineMono(nazvanie_zadaniya) {
  if (!nazvanie_zadaniya || typeof nazvanie_zadaniya !== 'string') {
    return false;
  }

  const upperName = nazvanie_zadaniya.toUpperCase();
  
  // Check for "МОНО" keyword - mono-pallet mode (one article per pallet)
  return upperName.includes('МОНО');
}

module.exports = {
  determineTipPostavki,
  tipPostavkiToString,
  determineMono
};
