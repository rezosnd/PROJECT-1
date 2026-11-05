import { verifyAccessToken } from '../modules/auth/jwt.js';
import { AppError } from './error-handler.js';

/**
 * Authentication verification middleware.
 * Inspects Authorization: Bearer <token> and mounts claims onto req.user.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication credentials required', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return next(new AppError('Bearer token cannot be empty', 401, 'UNAUTHORIZED'));
  }

  try {
    const decoded = verifyAccessToken(token);
    decoded.id = decoded.id || decoded.sub;
    req.user = decoded;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-Based Access Control (RBAC) middleware factory.
 * Enforces role clearance for sensitive administrative or staff routes.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('User not authenticated', 401, 'UNAUTHORIZED'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(
        `Role '${req.user.role}' lacks permission for this action. Required: [${allowedRoles.join(', ')}]`,
        403,
        'FORBIDDEN'
      ));
    }

    next();
  };
}

/**
 * Distributed Systems Note: Multi-tenant Data Isolation.
 * In a shared medical platform, hospital nodes act as independent administrative domains.
 * Staff members are restricted to mutative operations solely within their designated hospital partition.
 * We enforce that hospitalId is extracted strictly from the cryptographic JWT, never from untrusted request bodies.
 */
export function requireTenant(req, res, next) {
  if (!req.user) {
    return next(new AppError('User authentication required', 401, 'UNAUTHORIZED'));
  }

  const { role, hospitalId } = req.user;

  // CITY_ADMIN has global observability and management rights across all hospitals
  if (role === 'CITY_ADMIN') {
    req.hospitalId = req.params.hospitalId || req.params.id || req.body?.hospitalId || null;
    return next();
  }

  // Hospital staff and hospital admins must possess a valid hospital assignment
  if (role === 'HOSPITAL_STAFF' || role === 'HOSPITAL_ADMIN') {
    if (!hospitalId) {
      return next(new AppError('Staff credentials lack assigned hospital affiliation', 403, 'TENANT_NOT_ASSIGNED'));
    }

    // Verify URL path parameter matches staff's JWT hospital
    const targetHospitalId = req.params.hospitalId || req.params.id;
    if (targetHospitalId && targetHospitalId !== hospitalId) {
      return next(new AppError('Cross-hospital tenant access is prohibited', 403, 'TENANT_ACCESS_DENIED'));
    }

    // Strict Rule: Never accept foreign hospitalId from the body for staff.
    if (req.body && req.body.hospitalId && req.body.hospitalId !== hospitalId) {
      return next(new AppError('Cross-hospital tenant mutation is strictly prohibited', 403, 'TENANT_ACCESS_DENIED'));
    }

    // Force hospitalId to strictly match authenticated tenant from JWT
    if (req.body && typeof req.body === 'object') {
      req.body.hospitalId = hospitalId;
    }

    req.hospitalId = hospitalId;
    return next();
  }

  return next(new AppError('Patient accounts cannot perform hospital operational actions', 403, 'FORBIDDEN'));
}

