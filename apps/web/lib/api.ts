// In a real implementation, this would be in .env.local or similar
// But for now, we'll hardcode it to avoid conflicts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081';

export { API_BASE_URL };