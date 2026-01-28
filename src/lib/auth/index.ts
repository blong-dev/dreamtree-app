/**
 * DreamTree Auth Module
 *
 * Exports all authentication utilities.
 */

export {
  createAnonymousSession,
  getSessionData,
  deleteSession,
  createSessionCookie,
  clearSessionCookie,
  getSessionIdFromCookie,
  type SessionData,
} from './session';

export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
} from './password';

export {
  deriveWrappingKey,
  generateDataKey,
  wrapDataKey,
  unwrapDataKey,
  encryptField,
  decryptField,
  generateSalt,
  encodeSalt,
  decodeSalt,
  isEncrypted,
  hashEmail,
  type EncryptedField,
} from './encryption';

export {
  login,
  claimAccount,
  changePassword,
  getDataKey,
  type ClaimAccountResult,
  type LoginResult,
} from './actions';

export {
  withAuth,
  getAuthContext,
  type AuthContext,
  type AuthenticatedHandler,
} from './with-auth';

export {
  getDataKeyFromSession,
  storeDataKeyInSession,
  unwrapDataKeyFromAuth,
  encryptPII,
  decryptPII,
  decryptPIIBatch,
  PII_FIELDS,
} from './pii';
