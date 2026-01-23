/**
 * Sanitizes n8n workflow JSON before export
 * Removes sensitive data like credentials while preserving structure
 */

interface N8nNode {
  id: string;
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  [key: string]: unknown;
}

interface N8nWorkflow {
  name?: string;
  nodes?: N8nNode[];
  connections?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SanitizedWorkflow extends N8nWorkflow {
  _signalflow?: {
    exportedAt: string;
    sanitized: boolean;
    note: string;
  };
}

// Keys that may contain sensitive data
const SENSITIVE_KEYS = [
  'apikey', 'api_key', 'apiKey',
  'password', 'secret', 'token',
  'accesstoken', 'access_token', 'accessToken',
  'refreshtoken', 'refresh_token', 'refreshToken',
  'privatekey', 'private_key', 'privateKey',
  'clientsecret', 'client_secret', 'clientSecret',
  'authorization', 'auth',
  'bearer', 'jwt',
  'key', 'secretkey', 'secret_key', 'secretKey',
  'connectionstring', 'connection_string', 'connectionString',
  'webhook_url', 'webhookUrl', 'webhookurl',
];

/**
 * Check if a key name looks like it contains sensitive data
 */
function isSensitiveKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEYS.some(sk => lowerKey.includes(sk.toLowerCase()));
}

/**
 * Recursively sanitize an object, redacting sensitive values
 */
function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (isSensitiveKey(key) && typeof value === 'string' && value.length > 0) {
      // Redact sensitive string values
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects and arrays
      if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>)
            : item
        );
      } else {
        sanitized[key] = sanitizeObject(value as Record<string, unknown>);
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitize n8n workflow JSON for safe export
 * Removes credentials and sensitive parameters while preserving structure
 */
export function sanitizeWorkflowJSON(workflow: N8nWorkflow): SanitizedWorkflow {
  // Deep clone to avoid mutating original
  const sanitized: SanitizedWorkflow = JSON.parse(JSON.stringify(workflow));

  // Sanitize nodes
  if (sanitized.nodes && Array.isArray(sanitized.nodes)) {
    sanitized.nodes = sanitized.nodes.map((node: N8nNode) => {
      const cleanNode = { ...node };

      // Redact credential references
      if (cleanNode.credentials && typeof cleanNode.credentials === 'object') {
        cleanNode.credentials = Object.keys(cleanNode.credentials).reduce((acc, key) => {
          acc[key] = { name: '[REDACTED]', id: '[REDACTED]' };
          return acc;
        }, {} as Record<string, unknown>);
      }

      // Sanitize parameters that might contain secrets
      if (cleanNode.parameters && typeof cleanNode.parameters === 'object') {
        cleanNode.parameters = sanitizeObject(cleanNode.parameters as Record<string, unknown>);
      }

      return cleanNode;
    });
  }

  // Sanitize settings if present
  if (sanitized.settings && typeof sanitized.settings === 'object') {
    sanitized.settings = sanitizeObject(sanitized.settings as Record<string, unknown>);
  }

  // Add export metadata
  sanitized._signalflow = {
    exportedAt: new Date().toISOString(),
    sanitized: true,
    note: 'Credentials and secrets have been redacted for security. Attach this file to your Claude Code session along with the optimization prompt.',
  };

  return sanitized;
}

export default sanitizeWorkflowJSON;
