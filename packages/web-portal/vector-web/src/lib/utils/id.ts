/**
 * Generates a unique student ID in the format: 03-YYYY-XXXXX
 * 03: Prefix for Vector Students
 * YYYY: Current Year
 * XXXXX: Random 5-digit string for uniqueness
 */
export function generateStudentId(): string {
  const prefix = "03";
  const year = new Date().getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000); // 5-digit random number
  
  return `${prefix}-${year}-${random}`;
}
