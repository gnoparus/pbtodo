/**
 * PocketBase Service (Legacy)
 *
 * This file provides backward compatibility for code still importing from 'pocketbase'.
 * All functionality has been migrated to the Cloudflare Workers backend.
 *
 * New code should import directly from './api' instead.
 */

// Re-export everything from the API client for backward compatibility
export { api } from './api';
export type { User, Todo } from './api';

// Note: The direct PocketBase SDK should not be used in application code.
// Integration tests and test setup files still import the npm package for database testing,
// but the frontend application uses only the REST API client above.
