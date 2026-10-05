/**
 * Utility functions for date formatting across the Farm ERP application.
 * Formats all user-visible dates in DD-MM-YYYY format.
 */

export const formatDate = (dateValue?: string | Date | null): string => {
  if (!dateValue) return '-';

  if (typeof dateValue === 'string') {
    const cleanStr = dateValue.trim();
    if (!cleanStr) return '-';

    // Matches YYYY-MM-DD (or YYYY-MM-DDTHH:MM:SS)
    const ymdMatch = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const [, yyyy, mm, dd] = ymdMatch;
      return `${dd}-${mm}-${yyyy}`;
    }

    // If already in DD-MM-YYYY format
    const dmyMatch = cleanStr.match(/^(\d{2})-(\d{2})-(\d{4})/);
    if (dmyMatch) {
      return cleanStr;
    }
  }

  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return String(dateValue);

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};
