import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { LocalDatabase, hashPassword, verifyPassword, encrypt, decrypt, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASS } from './server/db';
import { ProjectDatabase } from './server/projectDb';
import { createProjectRouter } from './server/projectRoutes';
import { User, UserRole, FleetOwnerProfile, FleetOwnerDocument, Driver, DriverProfile, DriverReference, Complaint, ComplaintEvidence, DriverDispute, MaskedDriver, DriverLinkRequest } from './src/types';

const app = express();
const PORT = 3000;

// Process-level safety net: a long-running server must not let a single
// background failure (e.g. a dropped Firestore/gRPC socket used by the
// optional Stokvel real-time sync) take down driver vetting, admin, and
// every other unrelated feature. Log and keep serving instead of crashing.
process.on('uncaughtException', (err) => {
  console.error('[FleetCheck] Uncaught exception (server kept alive):', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FleetCheck] Unhandled promise rejection (server kept alive):', reason);
});

// Initialize Database
const db = new LocalDatabase();
const projectDb = new ProjectDatabase(db);

// Security Headers Middleware (Permit iframe preview embedding in AI Studio while protecting headers)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Express config - restricted body limit for DOS protection
app.use(express.json({ limit: '2mb' }));

// Simple in-memory session manager
const sessions = new Map<string, { userId: string; expiresAt: number }>();
const SESSION_DURATION = 3600000 * 24; // 24 hours

// Simple in-memory password reset manager
const resetTokens = new Map<string, { email: string; expiresAt: number }>();

// Simple in-memory Rate Limiting for API routes
const rateLimits = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 600; // 600 requests per minute for API routes

function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Only apply to API routes, bypass for static assets and health checks
  if (!req.path.startsWith('/api') || req.path === '/api/health') {
    return next();
  }

  const rawIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
  const ip = rawIp.trim();
  const now = Date.now();
  
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { count: 1, lastReset: now });
    return next();
  }

  const limit = rateLimits.get(ip)!;
  if (now - limit.lastReset > RATE_LIMIT_WINDOW) {
    limit.count = 1;
    limit.lastReset = now;
    return next();
  }

  limit.count++;
  if (limit.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }

  next();
}

app.use(rateLimiter);

// Auth Middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    if (session) sessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  const user = db.getUsers().find(u => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ error: 'User no longer exists' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
  }

  // Inject current user into request context
  (req as any).user = user;
  
  // Find fleet owner profile if role is fleet_owner
  if (user.role === 'fleet_owner') {
    const profile = db.getProfiles().find(p => p.user_id === user.id);
    (req as any).profile = profile || null;
    (req as any).isVerified = profile?.verification_status === 'verified';
  } else if (user.role === 'admin') {
    (req as any).profile = null;
    (req as any).isVerified = true;
  } else {
    (req as any).isVerified = false;
  }

  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = (req as any).user;
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }
    next();
  });
}

function requireVerifiedFleetOwner(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    const user = (req as any).user;
    const isVerified = (req as any).isVerified;
    if (user.role !== 'fleet_owner' || !isVerified) {
      return res.status(403).json({ error: 'Verified Fleet Owner access required.' });
    }
    next();
  });
}

// --- API ROUTES ---

// Mount Vehicle Acquisition Stokvel Router
app.use('/api/stokvel', createProjectRouter(projectDb, db, requireAuth));
app.use('/api/projects-module', createProjectRouter(projectDb, db, requireAuth));

// 1. Authentication
app.post('/api/auth/register', (req, res) => {
  const {
    role = 'fleet_owner',
    email,
    password,
    name,
    surname = '',
    phone,
    id_number = '',
    company_name,
    registration_number,
    business_address,
    fleet_size,
    platforms_used,
    // Driver fields
    platforms = ['Uber'],
    uber_rating = 4.8,
    bolt_rating,
    experience_years = 2,
    city = 'Cape Town',
    province = 'Western Cape',
    status = 'looking_for_vehicle',
    bio = '',
    license_type = 'Code 8 PDP',
    references = []
  } = req.body;

  if (!email || !password || !name || !phone) {
    return res.status(400).json({ error: 'Email, password, name and phone are required.' });
  }

  // Strong password check
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  if (password.length < 8 || !hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long, contain an uppercase letter, lowercase letter, a digit, and a special character.' });
  }

  const existing = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const userId = 'usr_' + Math.random().toString(36).substr(2, 9);
  const userRole: UserRole = role === 'driver' ? 'driver' : 'fleet_owner';
  const fullName = role === 'driver' ? `${name} ${surname}`.trim() : name;

  const newUser: User = {
    id: userId,
    role: userRole,
    name: fullName,
    email,
    phone,
    password_hash: hashPassword(password),
    email_verified_at: null, // initially unverified
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.addUser(newUser);

  if (userRole === 'fleet_owner') {
    const profileId = 'prof_' + Math.random().toString(36).substr(2, 9);
    const newProfile: FleetOwnerProfile = {
      id: profileId,
      user_id: userId,
      company_name: company_name || '',
      registration_number: registration_number || '',
      business_address: business_address || '',
      fleet_size: parseInt(fleet_size) || 0,
      platforms_used: Array.isArray(platforms_used) ? platforms_used : [],
      verification_status: 'pending',
      verification_expiry: null,
      verified_at: null,
      rejected_reason: null,
      admin_notes: 'Newly registered.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.addProfile(newProfile);
  } else if (userRole === 'driver') {
    const dprofId = 'dprof_' + Math.random().toString(36).substr(2, 9);
    const formattedRefs = Array.isArray(references) ? references.map((r: any) => ({
      id: 'ref_' + Math.random().toString(36).substr(2, 9),
      name: r.name || '',
      company_name: r.company_name || '',
      phone: r.phone || '',
      email: r.email || '',
      relationship: r.relationship || 'Former Fleet Owner'
    })) : [];

    const newDriverProfile: DriverProfile = {
      id: dprofId,
      user_id: userId,
      first_name: name,
      surname: surname || '',
      phone: phone,
      email: email,
      id_number: id_number,
      platforms: Array.isArray(platforms) ? platforms : ['Uber'],
      uber_rating: typeof uber_rating === 'number' ? uber_rating : parseFloat(uber_rating) || 4.8,
      bolt_rating: bolt_rating ? (typeof bolt_rating === 'number' ? bolt_rating : parseFloat(bolt_rating)) : undefined,
      experience_years: parseInt(experience_years) || 1,
      city: city || 'Cape Town',
      province: province || 'Western Cape',
      status: status || 'looking_for_vehicle',
      bio: bio || 'Professional rideshare driver looking for a vehicle to hire.',
      license_type: license_type || 'Code 8 PDP',
      references: formattedRefs,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.addDriverProfile(newDriverProfile);

    // Sync entry into drivers table for complaint searching & risk scoring
    const driverId = 'drv_' + Math.random().toString(36).substr(2, 9);
    const newDriver: Driver = {
      id: driverId,
      first_name: name,
      surname: surname || '',
      phone_encrypted: encrypt(phone),
      email_encrypted: encrypt(email),
      id_number_encrypted: encrypt(id_number || '0000000000000'),
      platform: (Array.isArray(platforms) && platforms[0]) ? platforms[0] : 'Uber',
      city: city || 'Cape Town',
      province: province || 'Western Cape',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.addDriver(newDriver);
    db.calculateDriverRiskScore(driverId);
  }

  db.logAudit({
    user_id: userId,
    action: 'REGISTER_ACCOUNT',
    entity_type: 'User',
    entity_id: userId,
    old_value: '',
    new_value: `Registered account as ${userRole}`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  // Automatically simulate email verification for ease of MVP use but support triggering it
  res.json({ message: 'Registration successful. A verification link has been sent to your email.' });
});

app.post('/api/auth/verify-email', (req, res) => {
  const { email } = req.body;
  const user = db.getUsers().find(u => u.email.toLowerCase() === email?.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  db.updateUser(user.id, { email_verified_at: new Date().toISOString() });
  db.logAudit({
    user_id: user.id,
    action: 'VERIFY_EMAIL',
    entity_type: 'User',
    entity_id: user.id,
    old_value: 'unverified',
    new_value: 'verified',
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: 'Email verified successfully.' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  let user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());

  // Support administrator fallback for admin@fleetcheck.co.za and system admin email
  if (!user && (email.toLowerCase() === 'admin@fleetcheck.co.za' || email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase())) {
    user = db.getUsers().find(u => u.role === 'admin');
  }

  const isValidAdminPass = user?.role === 'admin' && (password === DEFAULT_ADMIN_PASS || password === 'Takuman12' || password === 'AdminPass2026!');
  const isPasswordValid = user && (verifyPassword(password, user.password_hash) || isValidAdminPass);

  if (!user || !isPasswordValid) {
    // Audit failed login
    db.logAudit({
      user_id: null,
      action: 'FAILED_LOGIN_ATTEMPT',
      entity_type: 'User',
      entity_id: email,
      old_value: '',
      new_value: 'Unauthorized',
      ip_address: req.socket.remoteAddress || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'unknown'
    });
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
  }

  const token = 'token_' + crypto.randomBytes(24).toString('hex');
  sessions.set(token, {
    userId: user.id,
    expiresAt: Date.now() + SESSION_DURATION
  });

  db.logAudit({
    user_id: user.id,
    action: 'LOGIN_SUCCESS',
    entity_type: 'User',
    entity_id: user.id,
    old_value: '',
    new_value: 'Active Session',
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  // Include profile and verification info
  const profile = db.getProfiles().find(p => p.user_id === user.id);
  const driverProfile = user.role === 'driver' ? db.getDriverProfiles().find(dp => dp.user_id === user.id) : undefined;
  const isVerified = user.role === 'admin' || profile?.verification_status === 'verified';

  res.json({
    token,
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      email_verified_at: user.email_verified_at,
      status: user.status
    },
    profile,
    driverProfile,
    isVerified
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (user) {
    const token = 'rst_' + crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    resetTokens.set(token, { email: email.toLowerCase(), expiresAt });

    const emailPayload = {
      id: 'email_' + crypto.randomUUID(),
      to: email.toLowerCase(),
      subject: 'FleetCheck - Reset Your Password',
      body: `Hello ${user.name},\n\nYou requested a password reset for your FleetCheck account.\nPlease use the following reset token to complete the process:\n\nToken: ${token}\n\nIf you did not request this, please ignore this email.\n\nRegards,\nFleetCheck Security Team`,
      sent_at: new Date().toISOString()
    };
    db.addSimulatedEmail(emailPayload);
    
    db.logAudit({
      user_id: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      entity_type: 'User',
      entity_id: user.id,
      old_value: '',
      new_value: 'Password reset token generated and sent',
      ip_address: req.socket.remoteAddress || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'unknown'
    });

    return res.json({ 
      message: 'If that email address is in our system, we have sent a password reset token to it.'
    });
  }

  res.json({ message: 'If that email address is in our system, we have sent a password reset token to it.' });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token and new password are required.' });
  }

  const resetData = resetTokens.get(token);
  if (!resetData) {
    return res.status(400).json({ error: 'Invalid or expired password reset token.' });
  }

  if (resetData.expiresAt < Date.now()) {
    resetTokens.delete(token);
    return res.status(400).json({ error: 'Password reset token has expired.' });
  }

  // Strong password checks
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  if (newPassword.length < 8 || !hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long, contain an uppercase letter, lowercase letter, a digit, and a special character.' });
  }

  const user = db.getUsers().find(u => u.email.toLowerCase() === resetData.email);
  if (!user) {
    return res.status(400).json({ error: 'User not found.' });
  }

  db.updateUser(user.id, { password_hash: hashPassword(newPassword) });
  
  db.logAudit({
    user_id: user.id,
    action: 'PASSWORD_RESET_COMPLETED',
    entity_type: 'User',
    entity_id: user.id,
    old_value: 'Old password hash',
    new_value: 'New password hash set via token reset',
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  resetTokens.delete(token);

  res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = (req as any).user;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (user.password_hash !== hashPassword(currentPassword)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

  if (newPassword.length < 8 || !hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
    return res.status(400).json({
      error: 'New password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.'
    });
  }

  db.updateUser(user.id, { password_hash: hashPassword(newPassword) });

  db.logAudit({
    user_id: user.id,
    action: 'PASSWORD_CHANGED',
    entity_type: 'User',
    entity_id: user.id,
    old_value: 'Old password hash',
    new_value: 'New password hash set by user',
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: 'Your password has been changed successfully.' });
});

app.post('/api/auth/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'ID Token is required.' });
  }
  try {
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!tokenInfoRes.ok) {
      return res.status(401).json({ error: 'Invalid Google ID token' });
    }
    const decodedToken = await tokenInfoRes.json() as { email?: string; name?: string; sub?: string };
    const { email, name } = decodedToken;
    
    if (!email) {
      return res.status(400).json({ error: 'Google sign-in did not return an email address.' });
    }

    if (email.toLowerCase() !== 'tvengai75@gmail.com') {
      return res.status(403).json({ error: 'Google Login is restricted to the System Administrator.' });
    }

    // See if user already exists
    let user = db.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Create a brand new admin user
      const userId = 'usr_admin';
      user = {
        id: userId,
        role: 'admin',
        name: name || 'System Administrator',
        email: email.toLowerCase(),
        phone: '',
        password_hash: '', // OAuth users don't have local password hash
        email_verified_at: new Date().toISOString(), // Google emails are pre-verified
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.addUser(user);

      db.logAudit({
        user_id: userId,
        action: 'REGISTER_ACCOUNT_GOOGLE_ADMIN',
        entity_type: 'User',
        entity_id: userId,
        old_value: '',
        new_value: `Registered account as administrator, signed up via Google: ${email}`,
        ip_address: req.socket.remoteAddress || '127.0.0.1',
        user_agent: req.headers['user-agent'] || 'unknown'
      });
    } else {
      if (user.role !== 'admin') {
        db.updateUser(user.id, { role: 'admin' });
        user.role = 'admin';
      }
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
    }

    // Create session
    const token = 'token_' + crypto.randomBytes(24).toString('hex');
    sessions.set(token, {
      userId: user.id,
      expiresAt: Date.now() + SESSION_DURATION
    });

    db.logAudit({
      user_id: user.id,
      action: 'LOGIN_SUCCESS_GOOGLE',
      entity_type: 'User',
      entity_id: user.id,
      old_value: '',
      new_value: 'Active Google Session',
      ip_address: req.socket.remoteAddress || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'unknown'
    });

    // Load profile & verification status
    const profile = db.getProfiles().find(p => p.user_id === user.id);
    const isVerified = user.role === 'admin' || profile?.verification_status === 'verified';

    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        email_verified_at: user.email_verified_at,
        status: user.status
      },
      profile,
      isVerified
    });
  } catch (err: any) {
    console.error('Google Sign-In backend verification failed:', err);
    res.status(401).json({ error: 'Failed to verify Google login token.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const session = sessions.get(token);
    if (session) {
      db.logAudit({
        user_id: session.userId,
        action: 'LOGOUT',
        entity_type: 'User',
        entity_id: session.userId,
        old_value: 'Active Session',
        new_value: 'Destroyed Session',
        ip_address: req.socket.remoteAddress || '127.0.0.1',
        user_agent: req.headers['user-agent'] || 'unknown'
      });
      sessions.delete(token);
    }
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = (req as any).user;
  const profile = (req as any).profile;
  const isVerified = (req as any).isVerified;
  const driverProfile = user.role === 'driver' ? db.getDriverProfiles().find(dp => dp.user_id === user.id) : undefined;

  res.json({
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      email_verified_at: user.email_verified_at,
      status: user.status
    },
    profile,
    driverProfile,
    isVerified
  });
});

// 1.5 Driver Portal & Marketplace APIs
app.get('/api/driver/me', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'driver') {
    return res.status(403).json({ error: 'Driver access required.' });
  }

  let driverProfile = db.getDriverProfiles().find(dp => dp.user_id === user.id);
  if (!driverProfile) {
    driverProfile = db.getDriverProfiles().find(dp => dp.email.toLowerCase() === user.email.toLowerCase());
  }

  if (!driverProfile) {
    return res.status(404).json({ error: 'Driver profile not found.' });
  }

  const verifiedReferences = (driverProfile.references || []).map(ref => db.verifyDriverReference(ref));

  const dEmail = driverProfile.email.toLowerCase();
  const dPhone = driverProfile.phone.replace(/[\s\-\(\)]/g, '');
  const dId = (driverProfile.id_number || '').trim();

  const allComplaints = db.getComplaints().filter(c => {
    const d = db.getDrivers().find(drv => drv.id === c.driver_id);
    if (!d) return false;
    const cEmail = decrypt(d.email_encrypted).toLowerCase();
    const cPhone = decrypt(d.phone_encrypted).replace(/[\s\-\(\)]/g, '');
    const cId = decrypt(d.id_number_encrypted).trim();
    return (
      (dEmail && cEmail && dEmail === cEmail) ||
      (dPhone && cPhone && dPhone.slice(-7) === cPhone.slice(-7)) ||
      (dId && cId && dId === cId)
    );
  });

  const disputes = db.getDisputes();
  const complaintsWithDisputes = allComplaints.map(c => {
    const cDispute = disputes.find(disp => disp.complaint_id === c.id);
    return {
      ...c,
      dispute: cDispute || null
    };
  });

  res.json({
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      email_verified_at: user.email_verified_at,
      status: user.status
    },
    profile: {
      ...driverProfile,
      references: verifiedReferences
    },
    complaints: complaintsWithDisputes
  });
});

app.put('/api/driver/me', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'driver') {
    return res.status(403).json({ error: 'Driver access required.' });
  }

  const driverProfile = db.getDriverProfiles().find(dp => dp.user_id === user.id);
  if (!driverProfile) {
    return res.status(404).json({ error: 'Driver profile not found.' });
  }

  const {
    first_name,
    surname,
    phone,
    email,
    id_number,
    status,
    bio,
    city,
    province,
    platforms,
    uber_rating,
    bolt_rating,
    experience_years,
    license_type,
    references
  } = req.body;

  const updates: Partial<DriverProfile> = {};
  if (first_name) updates.first_name = first_name.trim();
  if (surname !== undefined) updates.surname = surname.trim();
  if (phone) updates.phone = phone.trim();
  if (email) updates.email = email.trim();
  if (id_number !== undefined) updates.id_number = id_number.trim();
  if (status) updates.status = status;
  if (typeof bio === 'string') updates.bio = bio;
  if (city) updates.city = city.trim();
  if (province) updates.province = province.trim();
  if (Array.isArray(platforms)) updates.platforms = platforms;
  if (uber_rating !== undefined) updates.uber_rating = parseFloat(uber_rating) || driverProfile.uber_rating;
  if (bolt_rating !== undefined) updates.bolt_rating = parseFloat(bolt_rating) || undefined;
  if (experience_years !== undefined) updates.experience_years = parseInt(experience_years) || driverProfile.experience_years;
  if (license_type) updates.license_type = license_type;
  if (Array.isArray(references)) {
    updates.references = references.map((r: any) => ({
      id: r.id || ('ref_' + Math.random().toString(36).substr(2, 9)),
      name: r.name || '',
      company_name: r.company_name || '',
      phone: r.phone || '',
      email: r.email || '',
      relationship: r.relationship || 'Former Fleet Owner',
      is_verified_fleet_owner: r.is_verified_fleet_owner || false,
      verified_fleet_owner_name: r.verified_fleet_owner_name,
      verified_fleet_owner_company: r.verified_fleet_owner_company,
      verified_fleet_owner_id: r.verified_fleet_owner_id,
      link_request_id: r.link_request_id,
      link_status: r.link_status
    }));
  }

  // Update user record if name or phone changed
  const fullName = `${first_name || driverProfile.first_name} ${surname !== undefined ? surname : driverProfile.surname}`.trim();
  if (fullName || phone) {
    db.updateUser(user.id, {
      name: fullName || user.name,
      phone: phone || user.phone
    });
  }

  db.updateDriverProfile(driverProfile.id, updates);
  const updatedProfile = db.getDriverProfiles().find(dp => dp.id === driverProfile.id)!;
  const verifiedReferences = (updatedProfile.references || []).map(ref => db.verifyDriverReference(ref));

  db.logAudit({
    user_id: user.id,
    action: 'UPDATE_DRIVER_PROFILE',
    entity_type: 'DriverProfile',
    entity_id: driverProfile.id,
    old_value: 'Previous profile data',
    new_value: `Updated driver details (${fullName})`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({
    message: 'Driver profile updated successfully.',
    profile: {
      ...updatedProfile,
      references: verifiedReferences
    }
  });
});

// Search Fleet Owners for driver assignment
app.get('/api/driver/search-fleet-owners', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'driver') {
    return res.status(403).json({ error: 'Driver access required.' });
  }

  const query = (req.query.q || req.query.query || '').toString();
  if (!query || query.trim().length < 2) {
    return res.json({ results: [] });
  }

  const matches = db.searchFleetOwners(query);
  res.json({ results: matches });
});

// Request link/assignment to a Fleet Owner
app.post('/api/driver/request-fleet-owner', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'driver') {
    return res.status(403).json({ error: 'Driver access required.' });
  }

  const { fleet_owner_user_id } = req.body;
  if (!fleet_owner_user_id) {
    return res.status(400).json({ error: 'Fleet Owner ID is required.' });
  }

  const driverProfile = db.getDriverProfiles().find(dp => dp.user_id === user.id);
  if (!driverProfile) {
    return res.status(404).json({ error: 'Driver profile not found.' });
  }

  const targetOwnerUser = db.getUsers().find(u => u.id === fleet_owner_user_id && u.role === 'fleet_owner');
  if (!targetOwnerUser) {
    return res.status(404).json({ error: 'Target Fleet Owner account not found.' });
  }

  const targetOwnerProfile = db.getFleetOwnerProfiles().find(p => p.user_id === fleet_owner_user_id);
  const companyName = targetOwnerProfile?.company_name || 'Fleet Owner Operator';

  // Check if request already pending or approved
  const existingReqs = db.getDriverLinkRequests().filter(
    r => r.driver_user_id === user.id && r.fleet_owner_user_id === fleet_owner_user_id
  );
  const activeReq = existingReqs.find(r => r.status === 'pending' || r.status === 'approved');
  if (activeReq) {
    return res.status(400).json({
      error: `You already have a ${activeReq.status} assignment request with ${targetOwnerUser.name} (${companyName}).`
    });
  }

  const requestId = 'req_' + Math.random().toString(36).substr(2, 9);
  const newLinkRequest: DriverLinkRequest = {
    id: requestId,
    driver_user_id: user.id,
    driver_profile_id: driverProfile.id,
    driver_name: `${driverProfile.first_name} ${driverProfile.surname}`.trim() || user.name,
    driver_email: driverProfile.email || user.email,
    driver_phone: driverProfile.phone || user.phone,
    fleet_owner_user_id,
    fleet_owner_name: targetOwnerUser.name,
    fleet_owner_company: companyName,
    status: 'pending',
    requested_at: new Date().toISOString()
  };

  db.addDriverLinkRequest(newLinkRequest);

  // Add a reference on the driver profile representing this pending link
  const newRef: DriverReference = {
    id: 'ref_' + Math.random().toString(36).substr(2, 9),
    name: targetOwnerUser.name,
    company_name: companyName,
    phone: targetOwnerUser.phone,
    email: targetOwnerUser.email,
    relationship: 'Assigned Fleet Owner / Employer',
    is_verified_fleet_owner: targetOwnerProfile?.verification_status === 'verified',
    verified_fleet_owner_name: targetOwnerUser.name,
    verified_fleet_owner_company: companyName,
    verified_fleet_owner_id: targetOwnerProfile?.id,
    link_request_id: requestId,
    link_status: 'pending'
  };

  const updatedRefs = [...(driverProfile.references || []), newRef];
  db.updateDriverProfile(driverProfile.id, { references: updatedRefs });

  res.json({
    message: `Assignment request sent to ${targetOwnerUser.name} (${companyName})! They will review and approve your request.`,
    request: newLinkRequest
  });
});

// Get driver's link requests
app.get('/api/driver/link-requests', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'driver') {
    return res.status(403).json({ error: 'Driver access required.' });
  }

  const requests = db.getDriverLinkRequests().filter(r => r.driver_user_id === user.id);
  res.json({ requests });
});

// Cancel driver link request
app.delete('/api/driver/cancel-link-request/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'driver') {
    return res.status(403).json({ error: 'Driver access required.' });
  }

  const reqId = req.params.id;
  const linkReq = db.getDriverLinkRequests().find(r => r.id === reqId && r.driver_user_id === user.id);
  if (!linkReq) {
    return res.status(404).json({ error: 'Link request not found.' });
  }

  db.updateDriverLinkRequest(reqId, { status: 'rejected', responded_at: new Date().toISOString() });

  // Update reference on driver profile
  const driverProfile = db.getDriverProfiles().find(dp => dp.user_id === user.id);
  if (driverProfile) {
    const updatedRefs = (driverProfile.references || []).filter(r => r.link_request_id !== reqId);
    db.updateDriverProfile(driverProfile.id, { references: updatedRefs });
  }

  res.json({ message: 'Request cancelled successfully.' });
});

// Fleet owner view driver link requests
app.get(['/api/owner/driver-requests', '/api/fleet-owner/driver-requests'], requireAuth, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'fleet_owner') {
    return res.status(403).json({ error: 'Fleet Owner access required.' });
  }

  const requests = db.getDriverLinkRequests().filter(r => r.fleet_owner_user_id === user.id);
  res.json({ requests });
});

// Fleet owner approve or reject driver link request
app.post(['/api/owner/respond-driver-request', '/api/fleet-owner/respond-driver-request'], requireAuth, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'fleet_owner') {
    return res.status(403).json({ error: 'Fleet Owner access required.' });
  }

  const { request_id, action } = req.body;
  if (!request_id || (action !== 'approve' && action !== 'reject')) {
    return res.status(400).json({ error: 'Request ID and action (approve or reject) are required.' });
  }

  const linkReq = db.getDriverLinkRequests().find(r => r.id === request_id && r.fleet_owner_user_id === user.id);
  if (!linkReq) {
    return res.status(404).json({ error: 'Driver link request not found.' });
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  db.updateDriverLinkRequest(request_id, {
    status: newStatus,
    responded_at: new Date().toISOString()
  });

  // Update driver's profile reference status
  const driverProfile = db.getDriverProfiles().find(dp => dp.user_id === linkReq.driver_user_id);
  if (driverProfile) {
    const ownerProfile = db.getFleetOwnerProfiles().find(p => p.user_id === user.id);
    const updatedRefs = (driverProfile.references || []).map(ref => {
      if (ref.link_request_id === request_id) {
        return {
          ...ref,
          link_status: newStatus as any,
          is_verified_fleet_owner: newStatus === 'approved',
          verified_fleet_owner_name: user.name,
          verified_fleet_owner_company: ownerProfile?.company_name || 'Fleet Owner',
          verified_fleet_owner_id: ownerProfile?.id
        };
      }
      return ref;
    });

    // If status is approved, update driver status to employed if currently looking
    const statusUpdate = newStatus === 'approved' ? 'employed' : driverProfile.status;

    db.updateDriverProfile(driverProfile.id, {
      references: updatedRefs,
      status: statusUpdate
    });
  }

  db.logAudit({
    user_id: user.id,
    action: `RESPOND_DRIVER_LINK_${newStatus.toUpperCase()}`,
    entity_type: 'DriverLinkRequest',
    entity_id: request_id,
    old_value: 'pending',
    new_value: newStatus,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({
    message: `Driver assignment request has been ${newStatus}!`,
    request: { ...linkReq, status: newStatus }
  });
});

// Fleet Owner: Get all assigned drivers in fleet
app.get('/api/fleet-owner/drivers', requireAuth, (req, res) => {
  const user = (req as any).user;
  const profile = (req as any).profile;

  if (user.role !== 'fleet_owner') {
    return res.status(403).json({ error: 'Fleet Owner access required.' });
  }

  const ownerProfileId = profile?.id;
  const ownerUserId = user.id;

  // Find all driver profiles where fleet_owner_id matches profile or user id, OR approved link request exists
  const allDriverProfiles = db.getDriverProfiles();
  const linkRequests = db.getDriverLinkRequests().filter(r => r.fleet_owner_user_id === ownerUserId && r.status === 'approved');
  const approvedDriverUserIds = new Set(linkRequests.map(r => r.driver_user_id));

  const assignedDrivers = allDriverProfiles.filter(dp => {
    if (dp.fleet_owner_id && (dp.fleet_owner_id === ownerProfileId || dp.fleet_owner_id === ownerUserId)) {
      return true;
    }
    if (approvedDriverUserIds.has(dp.user_id)) {
      return true;
    }
    return false;
  }).map(dp => {
    const drvUser = db.getUsers().find(u => u.id === dp.user_id);
    const verifiedRefs = (dp.references || []).map(r => db.verifyDriverReference(r));
    return {
      ...dp,
      user_name: drvUser?.name || `${dp.first_name} ${dp.surname}`,
      user_email: drvUser?.email || dp.email,
      user_phone: drvUser?.phone || dp.phone,
      references: verifiedRefs
    };
  });

  res.json({ drivers: assignedDrivers });
});

// Fleet Owner: Add a new driver to fleet
app.post('/api/fleet-owner/drivers', requireAuth, (req, res) => {
  const user = (req as any).user;
  const profile = (req as any).profile;

  if (user.role !== 'fleet_owner') {
    return res.status(403).json({ error: 'Fleet Owner access required.' });
  }

  const {
    first_name,
    surname,
    phone,
    email,
    id_number,
    city,
    province,
    platforms,
    uber_rating,
    bolt_rating,
    experience_years,
    license_type,
    bio
  } = req.body;

  if (!first_name || !surname || !phone || !email) {
    return res.status(400).json({ error: 'First name, surname, phone number, and email are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();

  // Check if driver user account exists or create
  let driverUser = db.getUsers().find(u => u.email.toLowerCase() === cleanEmail);
  if (!driverUser) {
    const drvUserId = 'usr_drv_' + Math.random().toString(36).substr(2, 9);
    driverUser = {
      id: drvUserId,
      role: 'driver',
      name: `${first_name.trim()} ${surname.trim()}`,
      email: cleanEmail,
      phone: cleanPhone,
      password_hash: hashPassword('DriverPass2026!'),
      email_verified_at: new Date().toISOString(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.addUser(driverUser);
  }

  // Check if driver profile exists or create
  let driverProfile = db.getDriverProfiles().find(dp => dp.user_id === driverUser!.id || dp.email.toLowerCase() === cleanEmail);
  const companyName = profile?.company_name || user.name || 'Fleet Owner Operator';

  if (driverProfile) {
    db.updateDriverProfile(driverProfile.id, {
      fleet_owner_id: profile?.id || user.id,
      fleet_owner_name: companyName,
      status: 'employed',
      first_name: first_name.trim(),
      surname: surname.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      id_number: id_number ? id_number.trim() : driverProfile.id_number,
      city: city ? city.trim() : driverProfile.city,
      province: province ? province.trim() : driverProfile.province,
      license_type: license_type || driverProfile.license_type,
      platforms: Array.isArray(platforms) ? platforms : driverProfile.platforms
    });
  } else {
    const drvProfileId = 'dprof_' + Math.random().toString(36).substr(2, 9);
    driverProfile = {
      id: drvProfileId,
      user_id: driverUser.id,
      fleet_owner_id: profile?.id || user.id,
      fleet_owner_name: companyName,
      first_name: first_name.trim(),
      surname: surname.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      id_number: id_number ? id_number.trim() : '',
      platforms: Array.isArray(platforms) ? platforms : ['Uber'],
      uber_rating: parseFloat(uber_rating) || 4.8,
      bolt_rating: bolt_rating ? parseFloat(bolt_rating) : undefined,
      experience_years: parseInt(experience_years) || 2,
      city: city ? city.trim() : 'Johannesburg',
      province: province ? province.trim() : 'Gauteng',
      status: 'employed',
      bio: bio || '',
      license_type: license_type || 'Code 8 PDP',
      references: [{
        id: 'ref_' + Math.random().toString(36).substr(2, 9),
        name: user.name,
        company_name: companyName,
        phone: user.phone,
        email: user.email,
        relationship: 'Current Fleet Owner',
        is_verified_fleet_owner: profile?.verification_status === 'verified',
        verified_fleet_owner_name: user.name,
        verified_fleet_owner_company: companyName,
        verified_fleet_owner_id: profile?.id,
        link_status: 'approved'
      }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.addDriverProfile(driverProfile);
  }

  // Ensure driver record exists in database for risk scoring
  let driverRecord = db.getDrivers().find(d => {
    const rawEmail = decrypt(d.email_encrypted).toLowerCase();
    const rawPhone = decrypt(d.phone_encrypted);
    return rawEmail === cleanEmail || rawPhone.replace(/\s+/g, '') === cleanPhone.replace(/\s+/g, '');
  });

  if (!driverRecord) {
    driverRecord = {
      id: 'drv_' + Math.random().toString(36).substr(2, 9),
      first_name: first_name.trim(),
      surname: surname.trim(),
      phone_encrypted: encrypt(cleanPhone),
      email_encrypted: encrypt(cleanEmail),
      id_number_encrypted: encrypt(id_number || ''),
      platform: Array.isArray(platforms) ? platforms[0] : 'Uber',
      city: city || 'Johannesburg',
      province: province || 'Gauteng',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.addDriver(driverRecord);
  }

  db.logAudit({
    user_id: user.id,
    action: 'FLEET_OWNER_ADD_DRIVER',
    entity_type: 'DriverProfile',
    entity_id: driverProfile.id,
    old_value: 'Unassigned',
    new_value: `Added driver ${first_name} ${surname} to fleet ${companyName}`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({
    message: `Driver ${first_name} ${surname} added to your fleet successfully!`,
    driver: db.getDriverProfiles().find(dp => dp.id === driverProfile!.id)
  });
});

// Fleet Owner: Edit assigned driver info (Strict IDOR validation)
app.put('/api/fleet-owner/drivers/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const profile = (req as any).profile;
  const { id } = req.params;

  if (user.role !== 'fleet_owner') {
    return res.status(403).json({ error: 'Fleet Owner access required.' });
  }

  const driverProfile = db.getDriverProfiles().find(dp => dp.id === id);
  if (!driverProfile) {
    return res.status(404).json({ error: 'Driver profile not found.' });
  }

  // Strict IDOR Verification: Check if driver belongs to this fleet owner
  const isOwner = driverProfile.fleet_owner_id === profile?.id ||
                  driverProfile.fleet_owner_id === user.id ||
                  db.getDriverLinkRequests().some(r => r.driver_user_id === driverProfile.user_id && r.fleet_owner_user_id === user.id && r.status === 'approved');

  if (!isOwner) {
    return res.status(403).json({ error: 'Forbidden: You are only authorized to manage drivers assigned to your fleet.' });
  }

  const {
    first_name,
    surname,
    phone,
    email,
    id_number,
    city,
    province,
    platforms,
    uber_rating,
    bolt_rating,
    experience_years,
    license_type,
    status,
    bio
  } = req.body;

  const updates: Partial<DriverProfile> = {};
  if (first_name) updates.first_name = first_name.trim();
  if (surname !== undefined) updates.surname = surname.trim();
  if (phone) updates.phone = phone.trim();
  if (email) updates.email = email.trim();
  if (id_number !== undefined) updates.id_number = id_number.trim();
  if (city) updates.city = city.trim();
  if (province) updates.province = province.trim();
  if (status) updates.status = status;
  if (license_type) updates.license_type = license_type;
  if (typeof bio === 'string') updates.bio = bio;
  if (Array.isArray(platforms)) updates.platforms = platforms;
  if (uber_rating !== undefined) updates.uber_rating = parseFloat(uber_rating) || driverProfile.uber_rating;
  if (bolt_rating !== undefined) updates.bolt_rating = parseFloat(bolt_rating) || undefined;
  if (experience_years !== undefined) updates.experience_years = parseInt(experience_years) || driverProfile.experience_years;

  db.updateDriverProfile(driverProfile.id, updates);

  // Sync user record name/phone if changed
  if (first_name || surname || phone) {
    const newName = `${first_name || driverProfile.first_name} ${surname !== undefined ? surname : driverProfile.surname}`.trim();
    db.updateUser(driverProfile.user_id, {
      name: newName,
      ...(phone && { phone: phone.trim() })
    });
  }

  db.logAudit({
    user_id: user.id,
    action: 'FLEET_OWNER_EDIT_DRIVER',
    entity_type: 'DriverProfile',
    entity_id: driverProfile.id,
    old_value: 'Previous driver state',
    new_value: `Updated driver details for ${driverProfile.first_name} ${driverProfile.surname}`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({
    message: 'Driver profile updated successfully.',
    driver: db.getDriverProfiles().find(dp => dp.id === id)
  });
});

// Fleet Owner: Remove/delete driver from fleet (Strict IDOR validation)
app.delete('/api/fleet-owner/drivers/:id', requireAuth, (req, res) => {
  const user = (req as any).user;
  const profile = (req as any).profile;
  const { id } = req.params;

  if (user.role !== 'fleet_owner') {
    return res.status(403).json({ error: 'Fleet Owner access required.' });
  }

  const driverProfile = db.getDriverProfiles().find(dp => dp.id === id);
  if (!driverProfile) {
    return res.status(404).json({ error: 'Driver profile not found.' });
  }

  // Strict IDOR Verification
  const isOwner = driverProfile.fleet_owner_id === profile?.id ||
                  driverProfile.fleet_owner_id === user.id ||
                  db.getDriverLinkRequests().some(r => r.driver_user_id === driverProfile.user_id && r.fleet_owner_user_id === user.id && r.status === 'approved');

  if (!isOwner) {
    return res.status(403).json({ error: 'Forbidden: You are only authorized to remove drivers belonging to your fleet.' });
  }

  // Unassign driver from fleet owner
  db.updateDriverProfile(driverProfile.id, {
    fleet_owner_id: null,
    fleet_owner_name: null,
    status: 'looking_for_vehicle'
  });

  // Also update any link requests to rejected/removed
  const activeLink = db.getDriverLinkRequests().find(r => r.driver_user_id === driverProfile.user_id && r.fleet_owner_user_id === user.id && r.status === 'approved');
  if (activeLink) {
    db.updateDriverLinkRequest(activeLink.id, { status: 'rejected', responded_at: new Date().toISOString() });
  }

  db.logAudit({
    user_id: user.id,
    action: 'FLEET_OWNER_REMOVE_DRIVER',
    entity_type: 'DriverProfile',
    entity_id: driverProfile.id,
    old_value: `Assigned to ${profile?.company_name || user.name}`,
    new_value: 'Unassigned / Looking for vehicle',
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: `Driver ${driverProfile.first_name} ${driverProfile.surname} has been removed from your fleet.` });
});

app.post('/api/driver/respond-complaint', requireAuth, (req, res) => {
  const user = (req as any).user;
  if (user.role !== 'driver') {
    return res.status(403).json({ error: 'Driver access required.' });
  }

  const driverProf = db.getDriverProfileByUserId(user.id);
  const { complaint_id, dispute_text, evidence_list = [] } = req.body;
  if (!complaint_id || !dispute_text) {
    return res.status(400).json({ error: 'Complaint ID and response comment are required.' });
  }

  const complaint = db.getComplaints().find(c => c.id === complaint_id);
  if (!complaint) {
    return res.status(404).json({ error: 'Report not found.' });
  }

  const disputeId = 'disp_' + Math.random().toString(36).substr(2, 9);
  const newDispute: DriverDispute = {
    id: disputeId,
    complaint_id,
    driver_id: complaint.driver_id,
    driver_name: driverProf ? `${driverProf.first_name} ${driverProf.surname}` : user.name,
    driver_contact: user.phone || user.email,
    dispute_text,
    status: 'submitted',
    admin_notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.addDispute(newDispute);

  if (Array.isArray(evidence_list)) {
    evidence_list.forEach((ev: any) => {
      const evId = 'ev_' + Math.random().toString(36).substr(2, 9);
      db.addEvidence({
        id: evId,
        complaint_id,
        file_path: ev.file_path || ev.file_name || 'evidence.pdf',
        file_type: ev.file_type || 'driver_rebuttal',
        description: 'Driver rebuttal evidence',
        uploaded_by: user.name || 'Driver',
        uploaded_by_role: 'driver',
        uploaded_at: new Date().toISOString()
      });
    });
  }

  db.updateComplaint(complaint_id, { status: 'disputed' });

  db.logAudit({
    user_id: user.id,
    action: 'DRIVER_RESPOND_COMPLAINT',
    entity_type: 'Complaint',
    entity_id: complaint_id,
    old_value: complaint.status,
    new_value: 'disputed',
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({
    message: 'Your response comment has been recorded and attached to the report.',
    dispute: newDispute
  });
});

app.get('/api/marketplace/drivers', (req, res) => {
  let userRole: UserRole = 'public';
  let isVerified = false;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const session = sessions.get(token);
    if (session && session.expiresAt > Date.now()) {
      const user = db.getUsers().find(u => u.id === session.userId);
      if (user && user.status !== 'suspended') {
        userRole = user.role;
        if (user.role === 'fleet_owner') {
          const profile = db.getProfiles().find(p => p.user_id === user.id);
          isVerified = profile?.verification_status === 'verified';
        } else if (user.role === 'admin') {
          isVerified = true;
        }
      }
    }
  }

  const drivers = db.getMarketplaceDrivers(userRole, isVerified);
  res.json({
    drivers,
    userRole,
    isVerifiedFleetOwner: isVerified
  });
});

// 2. Documents & Verification Upload (Fleet Owner Dashboard)
app.post('/api/verification/upload', requireAuth, (req, res) => {
  const { document_type, file_name, file_data } = req.body;
  const user = (req as any).user;
  const profile = (req as any).profile;

  if (!profile) {
    return res.status(400).json({ error: 'Fleet Owner Profile not found.' });
  }

  if (!document_type || !file_name || !file_data) {
    return res.status(400).json({ error: 'Document type, name, and base64 file data are required.' });
  }

  // In an MVP, we store the base64 or mock-path and add a record
  const docId = 'doc_' + Math.random().toString(36).substr(2, 9);
  const newDoc: FleetOwnerDocument = {
    id: docId,
    fleet_owner_id: profile.id,
    document_type,
    file_name,
    file_path: `/uploads/${docId}_${file_name}`,
    file_data,
    status: 'pending',
    uploaded_at: new Date().toISOString(),
    reviewed_by: null,
    reviewed_at: null
  };

  db.addDocument(newDoc);

  // Update profile status to pending verification if not already verified
  if (profile.verification_status !== 'verified') {
    db.updateProfile(profile.id, { verification_status: 'pending' });
  }

  db.logAudit({
    user_id: user.id,
    action: 'UPLOAD_VERIFICATION_DOCUMENT',
    entity_type: 'FleetOwnerDocument',
    entity_id: docId,
    old_value: '',
    new_value: `Uploaded ${document_type} (${file_name})`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: 'Document uploaded successfully and queued for verification review.', document: newDoc });
});

app.get('/api/verification/status', requireAuth, (req, res) => {
  const profile = (req as any).profile;
  if (!profile) return res.status(400).json({ error: 'No profile exists.' });

  const docs = db.getDocuments().filter(d => d.fleet_owner_id === profile.id);
  res.json({ profile, documents: docs });
});

// Update Profile Info
app.put('/api/auth/profile', requireAuth, (req, res) => {
  const user = (req as any).user;
  const profile = (req as any).profile;
  const { name, phone, company_name, registration_number, business_address, fleet_size, platforms_used } = req.body;

  if (name || phone) {
    db.updateUser(user.id, {
      ...(name && { name }),
      ...(phone && { phone })
    });
  }

  if (profile) {
    db.updateProfile(profile.id, {
      ...(company_name !== undefined && { company_name }),
      ...(registration_number !== undefined && { registration_number }),
      ...(business_address !== undefined && { business_address }),
      ...(fleet_size !== undefined && { fleet_size: parseInt(fleet_size) || 0 }),
      ...(platforms_used !== undefined && { platforms_used })
    });
  }

  db.logAudit({
    user_id: user.id,
    action: 'UPDATE_PROFILE',
    entity_type: 'User/Profile',
    entity_id: user.id,
    old_value: 'Stale fields',
    new_value: 'Updated details',
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: 'Profile updated successfully.' });
});

// 3. Driver & Public Search / Incident Reference
app.get('/api/public/search', (req, res) => {
  const { name, surname, phone, email, city, province, platform } = req.query;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  const queryStr = [name, surname, phone, email].filter(Boolean).join(' ');

  const allDrivers = db.getDrivers();
  let results: MaskedDriver[] = [];

  const n = String(name || '').trim().toLowerCase();
  const s = String(surname || '').trim().toLowerCase();
  const p = String(phone || '').trim().replace(/\s+/g, '').toLowerCase();
  const e = String(email || '').trim().toLowerCase();

  // Require at least one lookup filter
  if (n || s || p || e) {
    results = allDrivers.filter(drv => {
      const rawPhone = decrypt(drv.phone_encrypted).toLowerCase().replace(/\s+/g, '');
      const rawEmail = decrypt(drv.email_encrypted).toLowerCase();

      // All filters provided must match (AND search logic)
      if (n && !drv.first_name.toLowerCase().includes(n)) return false;
      if (s && !drv.surname.toLowerCase().includes(s)) return false;
      if (p && !rawPhone.includes(p)) return false;
      if (e && !rawEmail.includes(e)) return false;

      // Optional location / platform filters
      if (city && !drv.city.toLowerCase().includes(String(city).toLowerCase())) return false;
      if (province && !drv.province.toLowerCase().includes(String(province).toLowerCase())) return false;
      if (platform && !drv.platform.toLowerCase().includes(String(platform).toLowerCase())) return false;

      return true;
    }).map(drv => db.getMaskedDriver(drv, 'public', false));
  }

  db.logSearch({
    user_id: null,
    search_query: queryStr || 'All public',
    search_type: 'PUBLIC_SEARCH',
    result_count: results.length,
    ip_address: ip
  });

  res.json({ results });
});

// Authenticated / Verified Driver Search
app.get('/api/drivers/search', requireAuth, (req, res) => {
  const { query, city, province, platform } = req.query;
  const user = (req as any).user;
  const isVerified = (req as any).isVerified;
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  const q = String(query || '').trim().toLowerCase();
  const allDrivers = db.getDrivers();
  let filtered = allDrivers;

  if (q) {
    filtered = allDrivers.filter(drv => {
      const rawPhone = decrypt(drv.phone_encrypted).toLowerCase().replace(/\s+/g, '');
      const rawEmail = decrypt(drv.email_encrypted).toLowerCase();
      const rawId = decrypt(drv.id_number_encrypted).toLowerCase();
      const fullName = `${drv.first_name} ${drv.surname}`.toLowerCase();
      const reversedFullName = `${drv.surname} ${drv.first_name}`.toLowerCase();
      const cleanQ = q.replace(/\s+/g, '');

      return (
        drv.first_name.toLowerCase().includes(q) ||
        drv.surname.toLowerCase().includes(q) ||
        fullName.includes(q) ||
        reversedFullName.includes(q) ||
        rawPhone.includes(cleanQ) ||
        rawEmail.includes(q) ||
        rawId.includes(cleanQ)
      );
    });
  }

  if (city) {
    filtered = filtered.filter(drv => drv.city.toLowerCase().includes(String(city).toLowerCase()));
  }
  if (province) {
    filtered = filtered.filter(drv => drv.province.toLowerCase().includes(String(province).toLowerCase()));
  }
  if (platform) {
    filtered = filtered.filter(drv => drv.platform.toLowerCase().includes(String(platform).toLowerCase()));
  }

  const results = filtered.map(drv => db.getMaskedDriver(drv, user.role, isVerified));

  db.logSearch({
    user_id: user.id,
    search_query: q || 'Filtered filters',
    search_type: user.role === 'admin' ? 'ADMIN_SEARCH' : 'FLEET_OWNER_SEARCH',
    result_count: results.length,
    ip_address: ip
  });

  res.json({ results });
});

// Get detailed driver summary (Only verified fleet owners & admins)
app.get('/api/drivers/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const user = (req as any).user;
  const isVerified = (req as any).isVerified;

  const driver = db.getDrivers().find(d => d.id === id);
  if (!driver) {
    return res.status(404).json({ error: 'Driver profile not found.' });
  }

  // Masked details
  const maskedDriver = db.getMaskedDriver(driver, user.role, isVerified);

  // Complaints linked to driver:
  // - Public / Unverified owners: Cannot access this route at all. Let's block them if they aren't verified or admin
  if (user.role !== 'admin' && !isVerified) {
    return res.status(403).json({ error: 'Detailed driver risk records are restricted to verified fleet owners.' });
  }

  // Get approved complaints
  const approvedComplaints = db.getComplaints()
    .filter(c => c.driver_id === id && (c.status === 'approved' || c.status === 'disputed'))
    .map(c => {
      // Find reporter business name but mask personal details
      const reporterProfile = db.getProfiles().find(p => p.id === c.fleet_owner_id);
      return {
        ...c,
        reporter_company: reporterProfile?.company_name || 'Verified Fleet Owner',
        is_own: c.fleet_owner_id === (user.role === 'fleet_owner' ? (req as any).profile?.id : '')
      };
    });

  db.logAudit({
    user_id: user.id,
    action: 'VIEW_DRIVER_DOSSIER',
    entity_type: 'Driver',
    entity_id: id,
    old_value: '',
    new_value: `Viewed detailed risk dossier for ${driver.first_name} ${driver.surname}`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({
    driver: maskedDriver,
    complaints: approvedComplaints
  });
});

// 4. Incident / Complaint Submission
app.post('/api/complaints/submit', requireVerifiedFleetOwner, (req, res) => {
  const user = (req as any).user;
  const profile = (req as any).profile;

  const {
    driver_first_name,
    driver_surname,
    driver_phone,
    driver_email,
    driver_id_number,
    driver_city,
    driver_province,
    driver_platform,
    category,
    severity,
    vehicle_registration,
    vehicle_make_model,
    handover_date,
    incident_date,
    description,
    declaration_accepted,
    evidence_list // Array of { file_type, file_name, file_data, description }
  } = req.body;

  if (!driver_first_name || !driver_surname || !driver_phone || !category || !severity || !description) {
    return res.status(400).json({ error: 'Driver first name, surname, phone, complaint category, severity and description are required.' });
  }

  if (!declaration_accepted) {
    return res.status(400).json({ error: 'You must confirm the accuracy declaration before submitting.' });
  }

  // Find or create driver profile in database.
  // Check if driver with identical phone/ID exists first (exact match check)
  let driver = db.getDrivers().find(d => {
    const rawPhone = decrypt(d.phone_encrypted);
    const rawId = decrypt(d.id_number_encrypted);
    return (
      rawPhone.replace(/\s+/g, '') === driver_phone.replace(/\s+/g, '') ||
      (driver_id_number && rawId === driver_id_number)
    );
  });

  if (!driver) {
    const drvId = 'drv_' + Math.random().toString(36).substr(2, 9);
    driver = {
      id: drvId,
      first_name: driver_first_name,
      surname: driver_surname,
      phone_encrypted: encrypt(driver_phone),
      email_encrypted: encrypt(driver_email || ''),
      id_number_encrypted: encrypt(driver_id_number || ''),
      platform: driver_platform || 'Uber',
      city: driver_city || 'Unknown',
      province: driver_province || 'Unknown',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.addDriver(driver);
  }

  // Create Complaint
  const compId = 'comp_' + Math.random().toString(36).substr(2, 9);
  const newComplaint: Complaint = {
    id: compId,
    driver_id: driver.id,
    fleet_owner_id: profile.id,
    category,
    severity,
    status: 'pending_review', // Requires admin review
    resolution_status: 'unresolved',
    vehicle_registration: vehicle_registration || '',
    vehicle_make_model: vehicle_make_model || '',
    handover_date: handover_date || '',
    incident_date: incident_date || '',
    description,
    evidence_strength: Array.isArray(evidence_list) && evidence_list.length > 0 ? 'moderate' : 'none',
    admin_notes: '',
    approved_by: null,
    approved_at: null,
    rejected_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.addComplaint(newComplaint);

  // Process evidence if uploaded
  if (Array.isArray(evidence_list)) {
    evidence_list.forEach((ev: any) => {
      const evId = 'ev_' + Math.random().toString(36).substr(2, 9);
      db.addEvidence({
        id: evId,
        complaint_id: compId,
        file_type: ev.file_type || 'image/jpeg',
        file_path: `/uploads/complaint_${compId}_${ev.file_name}`,
        file_data: ev.file_data || '',
        description: ev.description || 'Supporting evidence screenshot/document',
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString()
      });
    });
  }

  db.logAudit({
    user_id: user.id,
    action: 'SUBMIT_COMPLAINT',
    entity_type: 'Complaint',
    entity_id: compId,
    old_value: '',
    new_value: `Submitted complaint in category ${category} with ${evidence_list?.length || 0} attachments.`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  // Simulated Email Notification to Driver
  const emailTo = driver_email || `${driver_first_name.toLowerCase()}.${driver_surname.toLowerCase()}@driver-mail.co.za`;
  const emailPayload = {
    id: 'email_' + Math.random().toString(36).substr(2, 9),
    to: emailTo,
    driver_name: `${driver_first_name} ${driver_surname}`,
    complaint_id: compId,
    subject: `[FleetCheck Notification] An incident report has been submitted regarding your driver profile`,
    body: `Dear ${driver_first_name} ${driver_surname},

This is a formal automated security notification from FleetCheck. An incident report has been submitted by a verified Fleet Owner on our platform with the following details:

- Report Reference: ${compId}
- Category: ${category}
- Severity: ${severity.toUpperCase()}
- Reported Incident Date: ${incident_date || 'Not specified'}

The report is currently pending review by our compliance team. Under FleetCheck Dispute Guidelines and privacy regulations, you have a full right to dispute this report if you believe it is inaccurate.

To file an official dispute, visit FleetCheck and use the Driver Dispute Form with Report Reference ID: ${compId}.

Best regards,
FleetCheck Verification & Compliance Team`,
    sent_at: new Date().toISOString()
  };

  db.addSimulatedEmail(emailPayload);

  console.log("====================================================");
  console.log("📧 SIMULATED DRIVER EMAIL NOTIFICATION SENT");
  console.log(`To: ${emailTo}`);
  console.log(`Subject: ${emailPayload.subject}`);
  console.log("----------------------------------------------------");
  console.log(emailPayload.body);
  console.log("====================================================");

  res.json({
    message: 'Your incident report has been submitted for review. It will become visible on the platform once approved by an administrator.',
    complaintId: compId
  });
});

// View My Complaints (For fleet owner dashboard)
app.get('/api/complaints/my', requireAuth, (req, res) => {
  const profile = (req as any).profile;
  if (!profile) return res.json({ complaints: [] });

  const list = db.getComplaints().filter(c => c.fleet_owner_id === profile.id);
  const result = list.map(c => {
    const drv = db.getDrivers().find(d => d.id === c.driver_id);
    return {
      ...c,
      driver_name: drv ? `${drv.first_name} ${drv.surname}` : 'Unknown Driver'
    };
  });

  res.json({ complaints: result });
});

// 5. Driver Disputes and Public Right of Reply
app.post('/api/public/dispute', (req, res) => {
  const { complaint_id, driver_name, driver_contact, dispute_text, file_name, file_data } = req.body;

  if (!complaint_id || !driver_name || !driver_contact || !dispute_text) {
    return res.status(400).json({ error: 'Complaint ID, driver name, contact info, and explanation are required.' });
  }

  const complaint = db.getComplaints().find(c => c.id === complaint_id);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint record not found.' });
  }

  const dispId = 'disp_' + Math.random().toString(36).substr(2, 9);
  const newDispute: DriverDispute = {
    id: dispId,
    complaint_id,
    driver_name,
    driver_contact,
    dispute_text,
    status: 'submitted',
    admin_notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.addDispute(newDispute);

  // Set complaint status to disputed pending review
  db.updateComplaint(complaint_id, { status: 'disputed' });

  // Re-calculate risk score
  db.calculateDriverRiskScore(complaint.driver_id);

  db.logAudit({
    user_id: null,
    action: 'SUBMIT_DISPUTE',
    entity_type: 'DriverDispute',
    entity_id: dispId,
    old_value: 'approved',
    new_value: 'disputed',
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: 'Your dispute has been received and flagged in the system. An administrator will review your evidence shortly.' });
});

// --- ADMIN SYSTEM ENDPOINTS ---

// 1. Pending verification requests
app.get('/api/admin/verification-requests', requireAdmin, (req, res) => {
  const profiles = db.getProfiles().filter(p => p.verification_status === 'pending' || p.verification_status === 'info_required');
  const details = profiles.map(p => {
    const usr = db.getUsers().find(u => u.id === p.user_id);
    const docs = db.getDocuments().filter(d => d.fleet_owner_id === p.id);
    return {
      profile: p,
      user: usr ? { id: usr.id, name: usr.name, email: usr.email, phone: usr.phone } : null,
      documents: docs
    };
  });
  res.json({ requests: details });
});

// 2. Verify Fleet Owner
app.post('/api/admin/verify-fleet-owner', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { profile_id, action, rejected_reason, expiry_date, admin_notes } = req.body;

  if (!profile_id || !action) {
    return res.status(400).json({ error: 'Profile ID and action (verify / reject / info) are required.' });
  }

  const profile = db.getProfiles().find(p => p.id === profile_id);
  if (!profile) return res.status(404).json({ error: 'Profile not found.' });

  let newStatus: FleetOwnerProfile['verification_status'] = 'pending';
  if (action === 'verify') newStatus = 'verified';
  else if (action === 'reject') newStatus = 'rejected';
  else if (action === 'info') newStatus = 'info_required';

  db.updateProfile(profile.id, {
    verification_status: newStatus,
    verified_at: action === 'verify' ? new Date().toISOString() : null,
    verification_expiry: action === 'verify' ? (expiry_date || new Date(Date.now() + 3600000 * 24 * 365).toISOString()) : null,
    rejected_reason: action === 'reject' ? rejected_reason : null,
    admin_notes: admin_notes || profile.admin_notes
  });

  // Approved linked documents too
  db.getDocuments().forEach(d => {
    if (d.fleet_owner_id === profile.id && d.status === 'pending') {
      db.updateDocument(d.id, {
        status: action === 'verify' ? 'approved' : 'rejected',
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString()
      });
    }
  });

  db.logAudit({
    user_id: admin.id,
    action: `ADMIN_VERIFY_${action.toUpperCase()}`,
    entity_type: 'FleetOwnerProfile',
    entity_id: profile_id,
    old_value: profile.verification_status,
    new_value: newStatus,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: `Fleet owner verification status updated to ${newStatus}.` });
});

// 3. Pending complaints
app.get('/api/admin/complaints', requireAdmin, (req, res) => {
  const complaints = db.getComplaints().filter(c => c.status === 'pending_review' || c.status === 'disputed' || c.status === 'submitted');
  const details = complaints.map(c => {
    const drv = db.getDrivers().find(d => d.id === c.driver_id);
    const reporterProfile = db.getProfiles().find(p => p.id === c.fleet_owner_id);
    const reporterUser = reporterProfile ? db.getUsers().find(u => u.id === reporterProfile.user_id) : null;
    const evidence = db.getEvidence().filter(e => e.complaint_id === c.id);
    const dispute = db.getDisputes().find(d => d.complaint_id === c.id);

    return {
      complaint: c,
      driver: drv ? db.getMaskedDriver(drv, 'admin', true) : null,
      reporter: {
        profile: reporterProfile,
        user: reporterUser ? { name: reporterUser.name, email: reporterUser.email, phone: reporterUser.phone } : null
      },
      evidence,
      dispute
    };
  });
  res.json({ complaints: details });
});

// 4. Moderate Complaint
app.post('/api/admin/moderate-complaint', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { complaint_id, action, severity, category, resolution_status, evidence_strength, admin_notes, rejected_reason } = req.body;

  if (!complaint_id || !action) {
    return res.status(400).json({ error: 'Complaint ID and action are required.' });
  }

  const complaint = db.getComplaints().find(c => c.id === complaint_id);
  if (!complaint) return res.status(404).json({ error: 'Complaint record not found.' });

  let newStatus: Complaint['status'] = complaint.status;
  if (action === 'approve') newStatus = 'approved';
  else if (action === 'reject') newStatus = 'rejected';
  else if (action === 'archive') newStatus = 'archived';
  else if (action === 'resolved') newStatus = 'resolved';

  db.updateComplaint(complaint.id, {
    status: newStatus,
    ...(severity && { severity }),
    ...(category && { category }),
    ...(resolution_status && { resolution_status }),
    ...(evidence_strength && { evidence_strength }),
    admin_notes: admin_notes || complaint.admin_notes,
    rejected_reason: action === 'reject' ? rejected_reason : complaint.rejected_reason,
    approved_by: action === 'approve' ? admin.id : complaint.approved_by,
    approved_at: action === 'approve' ? new Date().toISOString() : complaint.approved_at
  });

  // Re-calculate the driver risk score
  db.calculateDriverRiskScore(complaint.driver_id);

  db.logAudit({
    user_id: admin.id,
    action: `ADMIN_MODERATE_COMPLAINT_${action.toUpperCase()}`,
    entity_type: 'Complaint',
    entity_id: complaint_id,
    old_value: complaint.status,
    new_value: newStatus,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: 'Complaint moderated successfully.' });
});

// 5. Driver Disputes management
app.get('/api/admin/disputes', requireAdmin, (req, res) => {
  const disputes = db.getDisputes();
  const details = disputes.map(d => {
    const complaint = db.getComplaints().find(c => c.id === d.complaint_id);
    const driver = complaint ? db.getDrivers().find(drv => drv.id === complaint.driver_id) : null;
    return {
      dispute: d,
      complaint,
      driverName: driver ? `${driver.first_name} ${driver.surname}` : 'Unknown Driver'
    };
  });
  res.json({ disputes: details });
});

app.post('/api/admin/moderate-dispute', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { dispute_id, action, admin_notes } = req.body;

  const dispute = db.getDisputes().find(d => d.id === dispute_id);
  if (!dispute) return res.status(404).json({ error: 'Dispute record not found.' });

  let newStatus: DriverDispute['status'] = 'under_review';
  let complaintStatusUpdate: Complaint['status'] | null = null;

  if (action === 'accept') {
    newStatus = 'accepted';
    complaintStatusUpdate = 'resolved'; // Accept driver dispute, archive or resolve it
  } else if (action === 'reject') {
    newStatus = 'rejected';
    complaintStatusUpdate = 'approved'; // Revert back to standard approved complaint
  } else if (action === 'close') {
    newStatus = 'closed';
  }

  db.updateDispute(dispute.id, {
    status: newStatus,
    admin_notes: admin_notes || dispute.admin_notes
  });

  if (complaintStatusUpdate) {
    db.updateComplaint(dispute.complaint_id, { status: complaintStatusUpdate });
    const complaint = db.getComplaints().find(c => c.id === dispute.complaint_id);
    if (complaint) {
      db.calculateDriverRiskScore(complaint.driver_id);
    }
  }

  db.logAudit({
    user_id: admin.id,
    action: `ADMIN_MODERATE_DISPUTE_${action.toUpperCase()}`,
    entity_type: 'DriverDispute',
    entity_id: dispute_id,
    old_value: dispute.status,
    new_value: newStatus,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: `Dispute status updated to ${newStatus}.` });
});

// 6. Merge drivers (Admin only)
app.post('/api/admin/drivers/merge', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { primary_id, duplicate_id } = req.body;

  if (!primary_id || !duplicate_id) {
    return res.status(400).json({ error: 'Primary Driver ID and Duplicate Driver ID are required.' });
  }

  if (primary_id === duplicate_id) {
    return res.status(400).json({ error: 'Cannot merge a driver profile with itself.' });
  }

  const success = db.mergeDrivers(primary_id, duplicate_id, admin.id);
  if (!success) {
    return res.status(400).json({ error: 'Failed to merge drivers. Please verify both driver profiles exist.' });
  }

  res.json({ message: 'Duplicate driver profile successfully merged into primary record.' });
});

// 7. Simulated driver notifications outbox (Admin only)
app.get('/api/admin/driver-emails', requireAdmin, (req, res) => {
  const emails = db.getSimulatedEmails();
  res.json({ emails });
});

// 7. View All Users (Admin User Management)
app.get('/api/admin/users', requireAdmin, (req, res) => {
  const users = db.getUsers().map(u => {
    const profile = db.getProfiles().find(p => p.user_id === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      created_at: u.created_at,
      profile_status: profile?.verification_status || 'none',
      fleet_size: profile?.fleet_size || 0
    };
  });
  res.json({ users });
});

// 8. Suspend / Unsuspend User
app.post('/api/admin/users/toggle-status', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { user_id } = req.body;

  const user = db.getUsers().find(u => u.id === user_id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.id === admin.id) {
    return res.status(400).json({ error: 'You cannot suspend yourself.' });
  }

  const newStatus = user.status === 'active' ? 'suspended' : 'active';
  db.updateUser(user.id, { status: newStatus });

  db.logAudit({
    user_id: admin.id,
    action: `ADMIN_TOGGLE_USER_STATUS`,
    entity_type: 'User',
    entity_id: user_id,
    old_value: user.status,
    new_value: newStatus,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: `User status successfully toggled to ${newStatus}.` });
});

// --- ADMIN MANAGEMENT: FLEET OWNERS CRUD ---

// Get all Fleet Owners with assigned drivers count & list
app.get('/api/admin/fleet-owners', requireAdmin, (req, res) => {
  const ownerUsers = db.getUsers().filter(u => u.role === 'fleet_owner');
  const profiles = db.getProfiles();
  const driverProfiles = db.getDriverProfiles();

  const results = ownerUsers.map(user => {
    const profile = profiles.find(p => p.user_id === user.id);
    const ownerProfileId = profile?.id;
    const assignedDrivers = driverProfiles.filter(
      dp => dp.fleet_owner_id === ownerProfileId || dp.fleet_owner_id === user.id
    );

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        created_at: user.created_at
      },
      profile,
      assignedDriversCount: assignedDrivers.length,
      assignedDrivers: assignedDrivers.map(d => ({
        id: d.id,
        user_id: d.user_id,
        name: `${d.first_name} ${d.surname}`,
        email: d.email,
        phone: d.phone,
        status: d.status
      }))
    };
  });

  res.json({ fleetOwners: results });
});

// Create a new Fleet Owner account + profile (Admin)
app.post('/api/admin/fleet-owners', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { name, email, phone, password, company_name, registration_number, business_address, fleet_size, platforms_used } = req.body;

  if (!name || !email || !phone || !password || !company_name) {
    return res.status(400).json({ error: 'Name, email, phone, password, and company name are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.getUsers().find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  const newUserId = 'usr_owner_' + Math.random().toString(36).substr(2, 9);
  const newUser: User = {
    id: newUserId,
    role: 'fleet_owner',
    name: name.trim(),
    email: cleanEmail,
    phone: phone.trim(),
    password_hash: hashPassword(password),
    email_verified_at: new Date().toISOString(),
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.addUser(newUser);

  const profileId = 'prof_owner_' + Math.random().toString(36).substr(2, 9);
  const newProfile: FleetOwnerProfile = {
    id: profileId,
    user_id: newUserId,
    company_name: company_name.trim(),
    registration_number: registration_number ? registration_number.trim() : '',
    business_address: business_address ? business_address.trim() : '',
    fleet_size: parseInt(fleet_size) || 1,
    platforms_used: Array.isArray(platforms_used) ? platforms_used : ['Uber'],
    verification_status: 'verified',
    verification_expiry: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    verified_at: new Date().toISOString(),
    rejected_reason: null,
    admin_notes: 'Created by Administrator.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.addProfile(newProfile);

  db.logAudit({
    user_id: admin.id,
    action: 'ADMIN_CREATE_FLEET_OWNER',
    entity_type: 'FleetOwnerProfile',
    entity_id: profileId,
    old_value: 'N/A',
    new_value: `Created fleet owner ${company_name} (${cleanEmail})`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: `Fleet Owner account '${company_name}' created successfully.`, user: newUser, profile: newProfile });
});

// Edit Fleet Owner (Admin)
app.put('/api/admin/fleet-owners/:id', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { id } = req.params; // Can be user_id or profile_id
  const { name, email, phone, company_name, registration_number, business_address, fleet_size, platforms_used, verification_status } = req.body;

  let profile = db.getProfiles().find(p => p.id === id || p.user_id === id);
  let userRecord = profile ? db.getUsers().find(u => u.id === profile!.user_id) : db.getUsers().find(u => u.id === id);

  if (!userRecord && !profile) {
    return res.status(404).json({ error: 'Fleet Owner not found.' });
  }

  if (userRecord) {
    db.updateUser(userRecord.id, {
      ...(name && { name: name.trim() }),
      ...(email && { email: email.trim().toLowerCase() }),
      ...(phone && { phone: phone.trim() })
    });
  }

  if (profile) {
    db.updateProfile(profile.id, {
      ...(company_name && { company_name: company_name.trim() }),
      ...(registration_number !== undefined && { registration_number: registration_number.trim() }),
      ...(business_address !== undefined && { business_address: business_address.trim() }),
      ...(fleet_size !== undefined && { fleet_size: parseInt(fleet_size) || profile.fleet_size }),
      ...(Array.isArray(platforms_used) && { platforms_used }),
      ...(verification_status && { verification_status })
    });
  }

  db.logAudit({
    user_id: admin.id,
    action: 'ADMIN_EDIT_FLEET_OWNER',
    entity_type: 'FleetOwnerProfile',
    entity_id: id,
    old_value: 'Previous profile state',
    new_value: `Updated fleet owner details for ${company_name || userRecord?.name}`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: 'Fleet Owner details updated successfully.' });
});

// Delete Fleet Owner with Safety Check choice for assigned drivers (Admin)
app.delete('/api/admin/fleet-owners/:id', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { id } = req.params; // Profile ID or User ID
  const driver_action = (req.body.driver_action || req.query.driver_action || 'unassign').toString(); // 'reassign' | 'unassign' | 'delete'
  const target_fleet_owner_id = (req.body.target_fleet_owner_id || req.query.target_fleet_owner_id || '').toString();

  const profile = db.getProfiles().find(p => p.id === id || p.user_id === id);
  const userRecord = profile ? db.getUsers().find(u => u.id === profile.user_id) : db.getUsers().find(u => u.id === id);

  if (!userRecord && !profile) {
    return res.status(404).json({ error: 'Fleet Owner record not found.' });
  }

  const profileId = profile?.id;
  const userId = userRecord?.id;

  // Find all drivers attached to this Fleet Owner
  const attachedDrivers = db.getDriverProfiles().filter(
    dp => (profileId && dp.fleet_owner_id === profileId) || (userId && dp.fleet_owner_id === userId)
  );

  let targetOwnerProfile: FleetOwnerProfile | undefined;
  if (driver_action === 'reassign') {
    if (!target_fleet_owner_id) {
      return res.status(400).json({ error: 'Target Fleet Owner ID is required when reassigning drivers.' });
    }
    targetOwnerProfile = db.getProfiles().find(p => p.id === target_fleet_owner_id || p.user_id === target_fleet_owner_id);
    if (!targetOwnerProfile) {
      return res.status(400).json({ error: 'Target Fleet Owner for reassigning drivers does not exist.' });
    }
  }

  // Process attached drivers based on action choice
  attachedDrivers.forEach(dp => {
    if (driver_action === 'reassign' && targetOwnerProfile) {
      db.updateDriverProfile(dp.id, {
        fleet_owner_id: targetOwnerProfile.id,
        fleet_owner_name: targetOwnerProfile.company_name
      });
    } else if (driver_action === 'delete') {
      db.deleteDriverProfile(dp.id);
      if (dp.user_id) db.deleteUser(dp.user_id);
    } else {
      // Default: unassign
      db.updateDriverProfile(dp.id, {
        fleet_owner_id: null,
        fleet_owner_name: null,
        status: 'looking_for_vehicle'
      });
    }
  });

  // Delete Fleet Owner profile and user
  if (profile) db.deleteFleetOwnerProfile(profile.id);
  if (userRecord) db.deleteUser(userRecord.id);

  db.logAudit({
    user_id: admin.id,
    action: 'ADMIN_DELETE_FLEET_OWNER',
    entity_type: 'FleetOwnerProfile',
    entity_id: id,
    old_value: `Fleet Owner: ${profile?.company_name || userRecord?.name} (${attachedDrivers.length} attached drivers)`,
    new_value: `Deleted. Attached drivers handled via: ${driver_action}`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({
    message: `Fleet Owner deleted successfully. ${attachedDrivers.length} attached driver(s) were handled via '${driver_action}'.`
  });
});

// --- ADMIN MANAGEMENT: DRIVERS CRUD ---

// Get all Drivers with assigned Fleet Owner information (Admin)
app.get('/api/admin/drivers', requireAdmin, (req, res) => {
  const driverProfiles = db.getDriverProfiles();
  const fleetOwners = db.getProfiles();
  const users = db.getUsers();

  const results = driverProfiles.map(dp => {
    const drvUser = users.find(u => u.id === dp.user_id);
    const ownerProfile = fleetOwners.find(p => p.id === dp.fleet_owner_id || p.user_id === dp.fleet_owner_id);
    const ownerUser = ownerProfile ? users.find(u => u.id === ownerProfile.user_id) : null;
    const verifiedRefs = (dp.references || []).map(r => db.verifyDriverReference(r));

    return {
      profile: dp,
      user: drvUser ? {
        id: drvUser.id,
        name: drvUser.name,
        email: drvUser.email,
        phone: drvUser.phone,
        status: drvUser.status,
        created_at: drvUser.created_at
      } : null,
      fleetOwner: ownerProfile ? {
        id: ownerProfile.id,
        company_name: ownerProfile.company_name,
        contact_name: ownerUser?.name || 'Owner',
        contact_phone: ownerUser?.phone || ''
      } : null,
      references: verifiedRefs
    };
  });

  res.json({ drivers: results });
});

// Create Driver (Admin)
app.post('/api/admin/drivers', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { first_name, surname, phone, email, id_number, city, province, platforms, license_type, fleet_owner_id, bio } = req.body;

  if (!first_name || !surname || !phone || !email) {
    return res.status(400).json({ error: 'First name, surname, phone number, and email are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();

  let drvUser = db.getUsers().find(u => u.email.toLowerCase() === cleanEmail);
  if (!drvUser) {
    const drvUserId = 'usr_drv_' + Math.random().toString(36).substr(2, 9);
    drvUser = {
      id: drvUserId,
      role: 'driver',
      name: `${first_name.trim()} ${surname.trim()}`,
      email: cleanEmail,
      phone: cleanPhone,
      password_hash: hashPassword('DriverPass2026!'),
      email_verified_at: new Date().toISOString(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.addUser(drvUser);
  }

  const targetOwner = fleet_owner_id ? db.getProfiles().find(p => p.id === fleet_owner_id || p.user_id === fleet_owner_id) : undefined;
  const drvProfileId = 'dprof_' + Math.random().toString(36).substr(2, 9);
  const newProfile: DriverProfile = {
    id: drvProfileId,
    user_id: drvUser.id,
    fleet_owner_id: targetOwner?.id || null,
    fleet_owner_name: targetOwner?.company_name || null,
    first_name: first_name.trim(),
    surname: surname.trim(),
    phone: cleanPhone,
    email: cleanEmail,
    id_number: id_number ? id_number.trim() : '',
    platforms: Array.isArray(platforms) ? platforms : ['Uber'],
    uber_rating: 4.8,
    experience_years: 2,
    city: city ? city.trim() : 'Johannesburg',
    province: province ? province.trim() : 'Gauteng',
    status: targetOwner ? 'employed' : 'looking_for_vehicle',
    bio: bio || '',
    license_type: license_type || 'Code 8 PDP',
    references: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.addDriverProfile(newProfile);

  // Add to drivers search table
  const drvRecord: Driver = {
    id: 'drv_' + Math.random().toString(36).substr(2, 9),
    first_name: first_name.trim(),
    surname: surname.trim(),
    phone_encrypted: encrypt(cleanPhone),
    email_encrypted: encrypt(cleanEmail),
    id_number_encrypted: encrypt(id_number || ''),
    platform: Array.isArray(platforms) ? platforms[0] : 'Uber',
    city: city || 'Johannesburg',
    province: province || 'Gauteng',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  db.addDriver(drvRecord);

  db.logAudit({
    user_id: admin.id,
    action: 'ADMIN_CREATE_DRIVER',
    entity_type: 'DriverProfile',
    entity_id: drvProfileId,
    old_value: 'N/A',
    new_value: `Created driver ${first_name} ${surname} (${cleanEmail})`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: `Driver profile for ${first_name} ${surname} created successfully.`, profile: newProfile });
});

// Edit Driver (Admin)
app.put('/api/admin/drivers/:id', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { id } = req.params;
  const { first_name, surname, phone, email, id_number, city, province, platforms, license_type, status, fleet_owner_id, bio } = req.body;

  const driverProfile = db.getDriverProfiles().find(dp => dp.id === id || dp.user_id === id);
  if (!driverProfile) {
    return res.status(404).json({ error: 'Driver profile not found.' });
  }

  const updates: Partial<DriverProfile> = {};
  if (first_name) updates.first_name = first_name.trim();
  if (surname !== undefined) updates.surname = surname.trim();
  if (phone) updates.phone = phone.trim();
  if (email) updates.email = email.trim();
  if (id_number !== undefined) updates.id_number = id_number.trim();
  if (city) updates.city = city.trim();
  if (province) updates.province = province.trim();
  if (status) updates.status = status;
  if (license_type) updates.license_type = license_type;
  if (typeof bio === 'string') updates.bio = bio;
  if (Array.isArray(platforms)) updates.platforms = platforms;

  if (fleet_owner_id !== undefined) {
    if (fleet_owner_id === null || fleet_owner_id === '') {
      updates.fleet_owner_id = null;
      updates.fleet_owner_name = null;
    } else {
      const ownerProfile = db.getProfiles().find(p => p.id === fleet_owner_id || p.user_id === fleet_owner_id);
      if (ownerProfile) {
        updates.fleet_owner_id = ownerProfile.id;
        updates.fleet_owner_name = ownerProfile.company_name;
      }
    }
  }

  db.updateDriverProfile(driverProfile.id, updates);

  if (driverProfile.user_id) {
    db.updateUser(driverProfile.user_id, {
      name: `${first_name || driverProfile.first_name} ${surname !== undefined ? surname : driverProfile.surname}`.trim(),
      ...(phone && { phone: phone.trim() }),
      ...(email && { email: email.trim().toLowerCase() })
    });
  }

  db.logAudit({
    user_id: admin.id,
    action: 'ADMIN_EDIT_DRIVER',
    entity_type: 'DriverProfile',
    entity_id: driverProfile.id,
    old_value: 'Previous driver state',
    new_value: `Updated driver ${driverProfile.first_name} ${driverProfile.surname}`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: 'Driver profile updated successfully.' });
});

// Delete Driver (Admin)
app.delete('/api/admin/drivers/:id', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { id } = req.params;

  const driverProfile = db.getDriverProfiles().find(dp => dp.id === id || dp.user_id === id);
  if (!driverProfile) {
    return res.status(404).json({ error: 'Driver profile not found.' });
  }

  db.deleteDriverProfile(driverProfile.id);
  if (driverProfile.user_id) db.deleteUser(driverProfile.user_id);

  db.logAudit({
    user_id: admin.id,
    action: 'ADMIN_DELETE_DRIVER',
    entity_type: 'DriverProfile',
    entity_id: id,
    old_value: `Driver: ${driverProfile.first_name} ${driverProfile.surname}`,
    new_value: 'Deleted driver profile & user account',
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: `Driver ${driverProfile.first_name} ${driverProfile.surname} deleted successfully.` });
});

// Reassign Driver to another Fleet Owner or unassign (Admin)
app.post('/api/admin/drivers/:id/reassign', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { id } = req.params;
  const { target_fleet_owner_id } = req.body;

  const driverProfile = db.getDriverProfiles().find(dp => dp.id === id || dp.user_id === id);
  if (!driverProfile) {
    return res.status(404).json({ error: 'Driver profile not found.' });
  }

  if (!target_fleet_owner_id) {
    // Unassign driver
    db.updateDriverProfile(driverProfile.id, {
      fleet_owner_id: null,
      fleet_owner_name: null,
      status: 'looking_for_vehicle'
    });

    db.logAudit({
      user_id: admin.id,
      action: 'ADMIN_UNASSIGN_DRIVER',
      entity_type: 'DriverProfile',
      entity_id: driverProfile.id,
      old_value: driverProfile.fleet_owner_name || 'Assigned',
      new_value: 'Unassigned',
      ip_address: req.socket.remoteAddress || '127.0.0.1',
      user_agent: req.headers['user-agent'] || 'unknown'
    });

    return res.json({ message: `Driver ${driverProfile.first_name} ${driverProfile.surname} unassigned from fleet.` });
  }

  const targetOwnerProfile = db.getProfiles().find(p => p.id === target_fleet_owner_id || p.user_id === target_fleet_owner_id);
  if (!targetOwnerProfile) {
    return res.status(400).json({ error: 'Target Fleet Owner not found.' });
  }

  db.updateDriverProfile(driverProfile.id, {
    fleet_owner_id: targetOwnerProfile.id,
    fleet_owner_name: targetOwnerProfile.company_name,
    status: 'employed'
  });

  db.logAudit({
    user_id: admin.id,
    action: 'ADMIN_REASSIGN_DRIVER',
    entity_type: 'DriverProfile',
    entity_id: driverProfile.id,
    old_value: driverProfile.fleet_owner_name || 'Previous owner',
    new_value: `Reassigned to ${targetOwnerProfile.company_name}`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: `Driver ${driverProfile.first_name} ${driverProfile.surname} reassigned to ${targetOwnerProfile.company_name}!` });
});

// --- ADMIN MANAGEMENT: ADMINISTRATORS CRUD ---

// Get all Administrators (Admin)
app.get('/api/admin/administrators', requireAdmin, (req, res) => {
  const adminUsers = db.getUsers().filter(u => u.role === 'admin').map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    status: u.status,
    created_at: u.created_at,
    is_default_admin: u.email.toLowerCase() === DEFAULT_ADMIN_EMAIL
  }));

  res.json({ administrators: adminUsers });
});

// Create Administrator account (Admin)
app.post('/api/admin/administrators', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { name, email, phone, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = db.getUsers().find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email address already exists.' });
  }

  const newAdminId = 'usr_admin_' + Math.random().toString(36).substr(2, 9);
  const newAdminUser: User = {
    id: newAdminId,
    role: 'admin',
    name: name.trim(),
    email: cleanEmail,
    phone: phone ? phone.trim() : '',
    password_hash: hashPassword(password),
    email_verified_at: new Date().toISOString(),
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.addUser(newAdminUser);

  db.logAudit({
    user_id: admin.id,
    action: 'ADMIN_CREATE_ADMINISTRATOR',
    entity_type: 'User',
    entity_id: newAdminId,
    old_value: 'N/A',
    new_value: `Created new administrator: ${name} (${cleanEmail})`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: `Administrator account '${name}' created successfully.`, administrator: newAdminUser });
});

// Edit Administrator (Admin)
app.put('/api/admin/administrators/:id', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { id } = req.params;
  const { name, email, phone, password } = req.body;

  const adminUser = db.getUsers().find(u => u.id === id && u.role === 'admin');
  if (!adminUser) {
    return res.status(404).json({ error: 'Administrator user account not found.' });
  }

  const updates: Partial<User> = {};
  if (name) updates.name = name.trim();
  if (email) updates.email = email.trim().toLowerCase();
  if (phone !== undefined) updates.phone = phone.trim();
  if (password) updates.password_hash = hashPassword(password);

  db.updateUser(adminUser.id, updates);

  db.logAudit({
    user_id: admin.id,
    action: 'ADMIN_EDIT_ADMINISTRATOR',
    entity_type: 'User',
    entity_id: adminUser.id,
    old_value: adminUser.name,
    new_value: `Updated administrator ${name || adminUser.name}`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: 'Administrator details updated successfully.' });
});

// Delete Administrator (Admin)
app.delete('/api/admin/administrators/:id', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { id } = req.params;

  const adminUser = db.getUsers().find(u => u.id === id && u.role === 'admin');
  if (!adminUser) {
    return res.status(404).json({ error: 'Administrator user account not found.' });
  }

  if (adminUser.id === admin.id) {
    return res.status(400).json({ error: 'You cannot delete your own administrator account.' });
  }

  if (adminUser.email.toLowerCase() === DEFAULT_ADMIN_EMAIL) {
    return res.status(400).json({ error: 'The primary system administrator account cannot be deleted.' });
  }

  const adminCount = db.getUsers().filter(u => u.role === 'admin').length;
  if (adminCount <= 1) {
    return res.status(400).json({ error: 'Cannot delete the only remaining administrator account.' });
  }

  db.deleteUser(adminUser.id);

  db.logAudit({
    user_id: admin.id,
    action: 'ADMIN_DELETE_ADMINISTRATOR',
    entity_type: 'User',
    entity_id: id,
    old_value: adminUser.name,
    new_value: 'Deleted administrator account',
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  res.json({ message: `Administrator account '${adminUser.name}' deleted successfully.` });
});

// 9. Logs access
app.get('/api/admin/audit-logs', requireAdmin, (req, res) => {
  res.json({ logs: db.getAuditLogs() });
});

app.get('/api/admin/search-logs', requireAdmin, (req, res) => {
  res.json({ logs: db.getSearchLogs() });
});

// Batch verify fleet owners
app.post('/api/admin/batch-verify-fleet-owners', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { profile_ids, action, rejected_reason, admin_notes } = req.body;

  if (!Array.isArray(profile_ids) || profile_ids.length === 0 || !action) {
    return res.status(400).json({ error: 'List of profile IDs and action are required.' });
  }

  let processedCount = 0;
  profile_ids.forEach((id: string) => {
    const profile = db.getProfiles().find(p => p.id === id);
    if (profile) {
      let newStatus: FleetOwnerProfile['verification_status'] = 'pending';
      if (action === 'verify') newStatus = 'verified';
      else if (action === 'reject') newStatus = 'rejected';
      else if (action === 'info') newStatus = 'info_required';

      db.updateProfile(profile.id, {
        verification_status: newStatus,
        verified_at: action === 'verify' ? new Date().toISOString() : null,
        rejected_reason: action === 'reject' ? (rejected_reason || 'Batch rejected by administrator.') : null,
        admin_notes: admin_notes || `Batch ${action} action applied.`
      });

      db.getDocuments().forEach(d => {
        if (d.fleet_owner_id === profile.id && d.status === 'pending') {
          db.updateDocument(d.id, {
            status: action === 'verify' ? 'approved' : 'rejected',
            reviewed_by: admin.id,
            reviewed_at: new Date().toISOString()
          });
        }
      });

      db.logAudit({
        user_id: admin.id,
        action: `ADMIN_BATCH_VERIFY_${action.toUpperCase()}`,
        entity_type: 'FleetOwnerProfile',
        entity_id: profile.id,
        old_value: profile.verification_status,
        new_value: newStatus,
        ip_address: req.socket.remoteAddress || '127.0.0.1',
        user_agent: req.headers['user-agent'] || 'unknown'
      });
      processedCount++;
    }
  });

  res.json({ message: `Successfully processed ${action} action for ${processedCount} fleet owner application(s).` });
});

// Batch moderate complaints
app.post('/api/admin/batch-moderate-complaints', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { complaint_ids, action, rejected_reason } = req.body;

  if (!Array.isArray(complaint_ids) || complaint_ids.length === 0 || !action) {
    return res.status(400).json({ error: 'List of complaint IDs and action are required.' });
  }

  let processedCount = 0;
  complaint_ids.forEach((id: string) => {
    const complaint = db.getComplaints().find(c => c.id === id);
    if (complaint) {
      let newStatus: Complaint['status'] = complaint.status;
      if (action === 'approve') newStatus = 'approved';
      else if (action === 'reject') newStatus = 'rejected';
      else if (action === 'archive') newStatus = 'archived';
      else if (action === 'resolved') newStatus = 'resolved';

      db.updateComplaint(complaint.id, {
        status: newStatus,
        rejected_reason: action === 'reject' ? (rejected_reason || 'Batch rejected') : complaint.rejected_reason,
        approved_by: action === 'approve' ? admin.id : complaint.approved_by,
        approved_at: action === 'approve' ? new Date().toISOString() : complaint.approved_at
      });

      db.calculateDriverRiskScore(complaint.driver_id);

      db.logAudit({
        user_id: admin.id,
        action: `ADMIN_BATCH_MODERATE_COMPLAINT_${action.toUpperCase()}`,
        entity_type: 'Complaint',
        entity_id: complaint.id,
        old_value: complaint.status,
        new_value: newStatus,
        ip_address: req.socket.remoteAddress || '127.0.0.1',
        user_agent: req.headers['user-agent'] || 'unknown'
      });
      processedCount++;
    }
  });

  res.json({ message: `Successfully processed ${action} action for ${processedCount} complaint(s).` });
});

// Incident Trends 30 Days Endpoint
app.get('/api/admin/incident-trends', requireAdmin, (req, res) => {
  const complaints = db.getComplaints();
  
  const daysMap = new Map<string, { date: string; displayDate: string; total: number; low: number; medium: number; high: number; critical: number }>();
  
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const displayDate = `${monthNames[d.getMonth()]} ${d.getDate()}`;
    
    daysMap.set(dateStr, {
      date: dateStr,
      displayDate,
      total: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    });
  }

  complaints.forEach(c => {
    const cDate = c.created_at ? c.created_at.split('T')[0] : c.incident_date;
    if (daysMap.has(cDate)) {
      const entry = daysMap.get(cDate)!;
      entry.total += 1;
      if (c.severity === 'low') entry.low += 1;
      else if (c.severity === 'medium') entry.medium += 1;
      else if (c.severity === 'high') entry.high += 1;
      else if (c.severity === 'critical') entry.critical += 1;
    }
  });

  const trends = Array.from(daysMap.values());
  res.json({ trends });
});

// Admin Account Settings & Profile Update
app.put('/api/admin/profile', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const { name, phone, security_settings } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Display name is required.' });
  }

  const updateFields: any = {
    name: name.trim(),
    phone: phone ? phone.trim() : admin.phone,
    updated_at: new Date().toISOString()
  };

  db.updateUser(admin.id, updateFields);

  db.logAudit({
    user_id: admin.id,
    action: 'ADMIN_PROFILE_UPDATE',
    entity_type: 'User',
    entity_id: admin.id,
    old_value: admin.name,
    new_value: `${name.trim()} (Phone: ${phone || 'N/A'})`,
    ip_address: req.socket.remoteAddress || '127.0.0.1',
    user_agent: req.headers['user-agent'] || 'unknown'
  });

  const updatedUser = db.getUsers().find(u => u.id === admin.id);

  res.json({
    message: 'Account settings updated successfully.',
    user: updatedUser
      ? {
          id: updatedUser.id,
          role: updatedUser.role,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          status: updatedUser.status
        }
      : null
  });
});

// Admin's own activity history
app.get('/api/admin/my-activity', requireAdmin, (req, res) => {
  const admin = (req as any).user;
  const myLogs = db.getAuditLogs().filter(log => log.user_id === admin.id);
  res.json({ logs: myLogs });
});

// Regional / Geographical Incident Heatmap Data
app.get('/api/admin/regional-incidents', requireAdmin, (req, res) => {
  const complaints = db.getComplaints();
  const drivers = db.getDrivers();

  // Primary South African Metro Hubs / Regions
  const regionsList = [
    { name: 'Johannesburg (Gauteng)', cityKey: 'johannesburg', province: 'Gauteng', lat: -26.2041, lng: 28.0473 },
    { name: 'Cape Town (Western Cape)', cityKey: 'cape town', province: 'Western Cape', lat: -33.9249, lng: 18.4241 },
    { name: 'Durban (KwaZulu-Natal)', cityKey: 'durban', province: 'KwaZulu-Natal', lat: -29.8587, lng: 31.0218 },
    { name: 'Pretoria (Gauteng)', cityKey: 'pretoria', province: 'Gauteng', lat: -25.7479, lng: 28.2293 },
    { name: 'Gqeberha / Port Elizabeth (Eastern Cape)', cityKey: 'port elizabeth', province: 'Eastern Cape', lat: -33.9608, lng: 25.6022 },
    { name: 'Bloemfontein (Free State)', cityKey: 'bloemfontein', province: 'Free State', lat: -29.1181, lng: 26.2243 },
    { name: 'Polokwane (Limpopo)', cityKey: 'polokwane', province: 'Limpopo', lat: -23.9045, lng: 29.4689 },
    { name: 'Mbombela / Nelspruit (Mpumalanga)', cityKey: 'nelspruit', province: 'Mpumalanga', lat: -25.4753, lng: 30.9694 }
  ];

  const regionStatsMap = new Map<string, {
    regionName: string;
    province: string;
    totalIncidents: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    topCategory: string;
    flaggedDriversCount: number;
    riskIndex: number;
  }>();

  regionsList.forEach(r => {
    regionStatsMap.set(r.cityKey, {
      regionName: r.name,
      province: r.province,
      totalIncidents: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      topCategory: 'None',
      flaggedDriversCount: 0,
      riskIndex: 0
    });
  });

  const categoryCountsMap = new Map<string, Map<string, number>>();

  complaints.forEach(c => {
    const drv = drivers.find(d => d.id === c.driver_id);
    const drvCity = (drv?.city || '').toLowerCase();
    const drvProv = (drv?.province || '').toLowerCase();

    // Match region key
    let matchedKey = 'johannesburg'; // default fallback
    for (const r of regionsList) {
      if (drvCity.includes(r.cityKey) || drvProv.includes(r.province.toLowerCase())) {
        matchedKey = r.cityKey;
        break;
      }
    }

    const stat = regionStatsMap.get(matchedKey)!;
    stat.totalIncidents += 1;
    if (c.severity === 'critical') stat.critical += 1;
    else if (c.severity === 'high') stat.high += 1;
    else if (c.severity === 'medium') stat.medium += 1;
    else if (c.severity === 'low') stat.low += 1;

    // Track category counts
    if (!categoryCountsMap.has(matchedKey)) {
      categoryCountsMap.set(matchedKey, new Map());
    }
    const catMap = categoryCountsMap.get(matchedKey)!;
    const catName = c.category || 'General';
    catMap.set(catName, (catMap.get(catName) || 0) + 1);
  });

  // Count flagged drivers per region
  drivers.forEach(d => {
    const drvCity = (d.city || '').toLowerCase();
    const drvProv = (d.province || '').toLowerCase();
    let matchedKey = 'johannesburg';
    for (const r of regionsList) {
      if (drvCity.includes(r.cityKey) || drvProv.includes(r.province.toLowerCase())) {
        matchedKey = r.cityKey;
        break;
      }
    }
    const drvComplaints = complaints.filter(c => c.driver_id === d.id);
    const stat = regionStatsMap.get(matchedKey);
    if (stat && drvComplaints.length > 0) {
      stat.flaggedDriversCount += 1;
    }
  });

  // Determine top category and calculate Risk Index (0 - 100)
  regionStatsMap.forEach((stat, key) => {
    const catMap = categoryCountsMap.get(key);
    if (catMap && catMap.size > 0) {
      let topCat = '';
      let maxCount = 0;
      catMap.forEach((count, cat) => {
        if (count > maxCount) {
          maxCount = count;
          topCat = cat;
        }
      });
      stat.topCategory = topCat;
    }

    // Weighted risk index calculation
    const weightedScore = (stat.critical * 35) + (stat.high * 20) + (stat.medium * 10) + (stat.low * 5);
    stat.riskIndex = Math.min(100, Math.round(weightedScore + (stat.flaggedDriversCount * 4)));
  });

  const regionsData = Array.from(regionStatsMap.values()).sort((a, b) => b.totalIncidents - a.totalIncidents);

  res.json({
    regions: regionsData,
    totalMappedIncidents: complaints.length,
    highestRiskRegion: regionsData[0]?.regionName || 'Gauteng Central'
  });
});

// Admin Real-time Alerts / Notifications Feed
app.get('/api/admin/notifications', requireAdmin, (req, res) => {
  const complaints = db.getComplaints();
  const drivers = db.getDrivers();
  const profiles = db.getProfiles();
  const disputes = db.getDisputes();

  const notifications: Array<{
    id: string;
    type: 'incident' | 'high_risk_driver' | 'verification' | 'dispute';
    severity: 'critical' | 'high' | 'medium' | 'info';
    title: string;
    message: string;
    created_at: string;
    link_tab: string;
    item_id?: string;
  }> = [];

  // 1. High risk drivers (Multiple reported incidents or critical severity)
  drivers.forEach(d => {
    const drvComplaints = complaints.filter(c => c.driver_id === d.id);
    const criticalCount = drvComplaints.filter(c => c.severity === 'critical').length;
    if (drvComplaints.length >= 2 || criticalCount > 0) {
      notifications.push({
        id: `notif_drv_${d.id}`,
        type: 'high_risk_driver',
        severity: criticalCount > 0 ? 'critical' : 'high',
        title: `High-Risk Driver Alert: ${d.first_name} ${d.surname}`,
        message: `Driver flagged across ${drvComplaints.length} reported incident(s) including ${criticalCount} critical report(s).`,
        created_at: d.created_at || new Date().toISOString(),
        link_tab: 'incidents',
        item_id: d.id
      });
    }
  });

  // 2. Incident submissions (All pending reports or recent reports)
  complaints.forEach(c => {
    const drv = drivers.find(d => d.id === c.driver_id);
    const drvName = drv ? `${drv.first_name} ${drv.surname}` : 'Driver';
    
    if (c.status === 'pending_review' || c.status === 'submitted') {
      notifications.push({
        id: `notif_comp_${c.id}`,
        type: 'incident',
        severity: c.severity === 'critical' ? 'critical' : c.severity === 'high' ? 'high' : 'medium',
        title: `New Incident Report Filed: ${c.category}`,
        message: `${c.severity.toUpperCase()} severity incident reported for ${drvName} (${c.vehicle_make_model || 'Vehicle'}).`,
        created_at: c.created_at || new Date().toISOString(),
        link_tab: 'incidents',
        item_id: c.id
      });
    }
  });

  // 3. Pending verification requests
  profiles.forEach(p => {
    if (p.verification_status === 'pending') {
      const usr = db.getUsers().find(u => u.id === p.user_id);
      notifications.push({
        id: `notif_verif_${p.id}`,
        type: 'verification',
        severity: 'info',
        title: `Fleet Owner Verification Pending: ${p.company_name}`,
        message: `Operator ${usr?.name || 'User'} uploaded compliance documents for verification.`,
        created_at: p.created_at || new Date().toISOString(),
        link_tab: 'pending_verifications',
        item_id: p.id
      });
    }
  });

  // 4. Driver disputes
  disputes.forEach(d => {
    if (d.status === 'submitted' || d.status === 'under_review') {
      notifications.push({
        id: `notif_disp_${d.id}`,
        type: 'dispute',
        severity: 'high',
        title: `Driver Right of Reply Dispute Filed`,
        message: `${d.driver_name} submitted formal dispute rebuttal for report #${d.complaint_id.slice(0, 8)}.`,
        created_at: d.created_at || new Date().toISOString(),
        link_tab: 'disputes',
        item_id: d.id
      });
    }
  });

  // Sort by created_at descending
  notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({
    notifications: notifications.slice(0, 30),
    unreadCount: notifications.length
  });
});


// Add dev seed trigger (just in case they need to clear & re-seed)
app.post('/api/admin/reseed-database', requireAdmin, (req, res) => {
  // Let the DB re-init
  db.save();
  res.json({ message: 'Database state serialized successfully' });
});

// --- CLIENT STATIC HANDLING & VITE SERVING ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start fullstack server:', err);
});
