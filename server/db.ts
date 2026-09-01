import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import {
  User,
  FleetOwnerProfile,
  FleetOwnerDocument,
  Driver,
  DriverProfile,
  DriverReference,
  MaskedMarketplaceDriver,
  Complaint,
  ComplaintEvidence,
  DriverDispute,
  RiskScore,
  AuditLog,
  SearchLog,
  MaskedDriver,
  UserRole,
  DriverLinkRequest,
  DriverReview,
  DriverReviewSummary,
  UserNotification,
  IncidentChatMessage,
  DriverDocument,
  VehicleListing,
  MaskedVehicleListing
} from '../src/types';

// Load Firebase configuration from applet config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let config: any = {};
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Failed to parse firebase-applet-config.json:', err);
  }
}

// Initialize Firebase Admin App. This talks to Firestore as a trusted server
// identity (bypassing firestore.rules entirely), which is what lets rules be
// locked down to deny direct client access without breaking this server.
//
// Credential resolution, in order:
//   1. GOOGLE_APPLICATION_CREDENTIALS env var pointing at a service account
//      JSON key (useful for local dev, if you ever obtain one).
//   2. Application Default Credentials from the environment — on Google
//      Cloud Run/GCE this resolves automatically to the attached compute
//      service account, no key file needed.
// If neither is available (e.g. local dev with no credentials at all), the
// first real Firestore call throws, which is caught by initFirebase()'s
// try/catch below and the server falls back to local-only seed data rather
// than failing to start.
const app = getApps().length === 0
  ? initializeApp({
      credential: process.env.GOOGLE_APPLICATION_CREDENTIALS ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS) : applicationDefault(),
      projectId: config.projectId
    })
  : getApps()[0];

// Instantiate Firestore DB using applet configuration
const firestoreDb: Firestore = getFirestore(app, config.firestoreDatabaseId);

// AES-256-GCM authenticated encryption for driver sensitive PII
const SECRET_SEED = process.env.ENCRYPTION_KEY || process.env.GEMINI_API_KEY || 'fleetcheck-secure-master-encryption-key-v1-32b';
const ENCRYPTION_KEY = crypto.scryptSync(SECRET_SEED, 'fleetcheck-pii-salt-2026', 32);

// Strip undefined fields because Firestore setDoc throws synchronously on undefined
export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore).filter(v => v !== undefined);
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    } else {
      clean[key] = null;
    }
  }
  return clean;
}

export function safeSetDoc(col: string, id: string, data: any, options?: { merge?: boolean }) {
  if (!id || !col) return;
  try {
    const cleanData = sanitizeForFirestore(data);
    const docRef = firestoreDb.collection(col).doc(id);
    if (options?.merge) {
      docRef.set(cleanData, { merge: true }).catch(err => {
        console.error(`[Firestore Sync] Failed to merge into ${col}/${id}:`, err?.message || err);
      });
    } else {
      docRef.set(cleanData).catch(err => {
        console.error(`[Firestore Sync] Failed to save to ${col}/${id}:`, err?.message || err);
      });
    }
  } catch (err: any) {
    console.error(`[Firestore Sync] Error preparing document for ${col}/${id}:`, err?.message || err);
  }
}

export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `gcm:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return text;
  }
}

export function decrypt(text: string): string {
  if (!text) return '';
  try {
    if (text.startsWith('gcm:')) {
      const parts = text.split(':');
      if (parts.length < 4) return text;
      const iv = Buffer.from(parts[1], 'hex');
      const authTag = Buffer.from(parts[2], 'hex');
      const encryptedText = parts[3];
      const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } else {
      // Legacy AES-256-CBC backwards compatibility
      const textParts = text.split(':');
      if (textParts.length < 2) return text;
      const ivHex = textParts.shift()!;
      const iv = Buffer.from(ivHex, 'hex');
      if (iv.length !== 16) return text;
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString('utf8');
    }
  } catch (err) {
    return '';
  }
}

// Scrypt salted password hashing
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derivedKey}`;
}

// Constant-time password verification with legacy fallback support
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) return false;
  try {
    if (storedHash.startsWith('scrypt:')) {
      const parts = storedHash.split(':');
      if (parts.length !== 3) return false;
      const [, salt, expectedHex] = parts;
      const derivedKey = crypto.scryptSync(password, salt, 64);
      const expectedKey = Buffer.from(expectedHex, 'hex');
      if (derivedKey.length !== expectedKey.length) return false;
      return crypto.timingSafeEqual(derivedKey, expectedKey);
    } else {
      // Legacy SHA-256 fallback comparison using timingSafeEqual
      const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
      const a = Buffer.from(legacyHash, 'utf8');
      const b = Buffer.from(storedHash, 'utf8');
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    }
  } catch (err) {
    return false;
  }
}

// System administrator configuration
export const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@fleetcheck.co.za').toLowerCase();
export const DEFAULT_ADMIN_PASS = process.env.ADMIN_PASSWORD || 'AdminPass2026!';

export interface DatabaseSchema {
  users: User[];
  fleetOwnerProfiles: FleetOwnerProfile[];
  fleetOwnerDocuments: FleetOwnerDocument[];
  drivers: Driver[];
  driverProfiles: DriverProfile[];
  complaints: Complaint[];
  complaintEvidence: ComplaintEvidence[];
  driverDisputes: DriverDispute[];
  riskScores: RiskScore[];
  auditLogs: AuditLog[];
  searchLogs: SearchLog[];
  driverLinkRequests?: DriverLinkRequest[];
  simulatedEmails?: any[];
  driverReviews?: DriverReview[];
  notifications?: UserNotification[];
  incidentChatMessages?: IncidentChatMessage[];
  driverDocuments?: DriverDocument[];
  vehicleListings?: VehicleListing[];
}

export class LocalDatabase {
  private data: DatabaseSchema;

  // Resolves once the initial Firestore sync (or a failed attempt at one) has
  // finished, so the HTTP server can wait for it before accepting requests —
  // otherwise the first several seconds after every boot/deploy would serve
  // incomplete data (only the local-first seed above, not the real dataset).
  public ready: Promise<void>;
  private markReady!: () => void;

  constructor() {
    this.ready = new Promise<void>(resolve => {
      this.markReady = resolve;
    });
    // Local-first seed: these accounts must exist immediately, even before (or if)
    // the Firestore initial sync below ever completes. Without this, environments
    // where Firestore is briefly unreachable at boot would have zero accountant/
    // demo accounts until sync finished (or none at all if it never does). The
    // async initFirebase() block further below performs the same find-or-create
    // check against Firestore-loaded data and will simply no-op for any account
    // already present here, so there is no duplication risk.
    const now = new Date().toISOString();
    this.data = {
      users: [
        {
          id: 'usr_admin',
          role: 'admin',
          name: 'System Administrator',
          email: DEFAULT_ADMIN_EMAIL,
          phone: '+27 82 555 0199',
          password_hash: hashPassword(DEFAULT_ADMIN_PASS),
          email_verified_at: now,
          status: 'active',
          created_at: now,
          updated_at: now
        },
        {
          id: 'usr_member_sipho',
          role: 'driver',
          name: 'Sipho Sithole',
          email: 'sipho.driver@actionpack.co.za',
          phone: '+27 82 910 4422',
          password_hash: hashPassword('MemberPass2026!'),
          email_verified_at: now,
          status: 'active',
          created_at: now,
          updated_at: now
        },
        {
          id: 'usr_member_thabo',
          role: 'driver',
          name: 'Thabo Nkosi',
          email: 'thabo.driver@actionpack.co.za',
          phone: '+27 84 771 9901',
          password_hash: hashPassword('MemberPass2026!'),
          email_verified_at: now,
          status: 'active',
          created_at: now,
          updated_at: now
        },
        {
          id: 'usr_member_james',
          role: 'fleet_owner',
          name: 'James Mthembu',
          email: 'james.fleet@actionpack.co.za',
          phone: '+27 81 332 5599',
          password_hash: hashPassword('MemberPass2026!'),
          email_verified_at: now,
          status: 'active',
          created_at: now,
          updated_at: now
        },
        {
          id: 'usr_member_sarah',
          role: 'fleet_owner',
          name: 'Sarah Dlamini',
          email: 'sarah.fleet@actionpack.co.za',
          phone: '+27 79 554 1122',
          password_hash: hashPassword('MemberPass2026!'),
          email_verified_at: now,
          status: 'active',
          created_at: now,
          updated_at: now
        },
        {
          id: 'usr_member_takudzwa',
          role: 'driver',
          name: 'Takudzwa Hanyire',
          email: 'takuman456@gmail.com',
          phone: '+27 83 456 7890',
          password_hash: hashPassword('MemberPass2026!'),
          email_verified_at: now,
          status: 'active',
          created_at: now,
          updated_at: now
        }
      ],
      fleetOwnerProfiles: [
        {
          id: 'prof_james',
          user_id: 'usr_member_james',
          company_name: 'Mthembu Transport Fleets',
          registration_number: '2021/108922/07',
          business_address: '14 Commerce Crescent, Sandton, Johannesburg',
          fleet_size: 8,
          platforms_used: ['Uber', 'Bolt'],
          verification_status: 'verified',
          verification_expiry: null,
          verified_at: now,
          rejected_reason: null,
          admin_notes: 'Verified operator.',
          created_at: now,
          updated_at: now
        },
        {
          id: 'prof_sarah',
          user_id: 'usr_member_sarah',
          company_name: 'Dlamini Mobility Solutions',
          registration_number: '2022/449102/07',
          business_address: '88 Loop Street, Cape Town',
          fleet_size: 5,
          platforms_used: ['Uber', 'Bolt'],
          verification_status: 'verified',
          verification_expiry: null,
          verified_at: now,
          rejected_reason: null,
          admin_notes: 'Verified operator.',
          created_at: now,
          updated_at: now
        }
      ],
      fleetOwnerDocuments: [],
      drivers: [
        {
          id: 'drv_sipho',
          first_name: 'Sipho',
          surname: 'Sithole',
          phone_encrypted: encrypt('+27 82 910 4422'),
          email_encrypted: encrypt('sipho.driver@actionpack.co.za'),
          id_number_encrypted: encrypt('9102145890082'),
          platform: 'Uber',
          city: 'Johannesburg',
          province: 'Gauteng',
          created_at: now,
          updated_at: now
        },
        {
          id: 'drv_thabo',
          first_name: 'Thabo',
          surname: 'Nkosi',
          phone_encrypted: encrypt('+27 84 771 9901'),
          email_encrypted: encrypt('thabo.driver@actionpack.co.za'),
          id_number_encrypted: encrypt('9308115890085'),
          platform: 'Uber',
          city: 'Cape Town',
          province: 'Western Cape',
          created_at: now,
          updated_at: now
        },
        {
          id: 'drv_takudzwa',
          first_name: 'Takudzwa',
          surname: 'Hanyire',
          phone_encrypted: encrypt('+27 83 456 7890'),
          email_encrypted: encrypt('takuman456@gmail.com'),
          id_number_encrypted: encrypt('9204125890081'),
          platform: 'Uber',
          city: 'Johannesburg',
          province: 'Gauteng',
          created_at: now,
          updated_at: now
        }
      ],
      driverProfiles: [
        {
          id: 'dprof_sipho',
          user_id: 'usr_member_sipho',
          first_name: 'Sipho',
          surname: 'Sithole',
          phone: '+27 82 910 4422',
          email: 'sipho.driver@actionpack.co.za',
          id_number: '9102145890082',
          platforms: ['Uber', 'Bolt'],
          uber_rating: 4.88,
          bolt_rating: 4.90,
          experience_years: 3,
          city: 'Johannesburg',
          province: 'Gauteng',
          status: 'looking_for_vehicle',
          bio: 'Experienced rideshare driver with 3+ years in Johannesburg. Clean record and top tier ratings.',
          license_type: 'Code 8 PDP',
          references: [],
          created_at: now,
          updated_at: now
        },
        {
          id: 'dprof_thabo',
          user_id: 'usr_member_thabo',
          first_name: 'Thabo',
          surname: 'Nkosi',
          phone: '+27 84 771 9901',
          email: 'thabo.driver@actionpack.co.za',
          id_number: '9308115890085',
          platforms: ['Uber'],
          uber_rating: 4.82,
          bolt_rating: 4.85,
          experience_years: 2,
          city: 'Cape Town',
          province: 'Western Cape',
          status: 'looking_for_vehicle',
          bio: 'Dependable driver with full PDP certification in Cape Town area.',
          license_type: 'Code 8 PDP',
          references: [],
          created_at: now,
          updated_at: now
        },
        {
          id: 'dprof_takudzwa',
          user_id: 'usr_member_takudzwa',
          first_name: 'Takudzwa',
          surname: 'Hanyire',
          phone: '+27 83 456 7890',
          email: 'takuman456@gmail.com',
          id_number: '9204125890081',
          platforms: ['Uber', 'Bolt'],
          uber_rating: 4.88,
          bolt_rating: 4.90,
          experience_years: 3,
          city: 'Johannesburg',
          province: 'Gauteng',
          status: 'looking_for_vehicle',
          bio: 'Experienced, professional rideshare driver with 3+ years on Uber and Bolt platforms looking for a vehicle to hire. Excellent track record and ratings.',
          license_type: 'Code 8 PDP',
          references: [],
          created_at: now,
          updated_at: now
        }
      ],
      complaints: [],
      complaintEvidence: [],
      driverDisputes: [],
      riskScores: [],
      auditLogs: [],
      searchLogs: [],
      driverLinkRequests: [],
      simulatedEmails: [],
      driverReviews: [],
      notifications: [],
      incidentChatMessages: [],
      driverDocuments: [],
      vehicleListings: []
    };
    this.initFirebase();
  }

  private async initFirebase() {
    try {
      console.log('[Firebase Engine] Connecting to Google Cloud Firestore...');

      // Fail fast on a single lightweight call rather than letting every
      // subsequent Firestore operation below independently time out on bad
      // credentials — each one logs its own (noisy) rejection.
      await firestoreDb.collection('users').limit(1).get();

      // Clean up previous dummy data (for production publishing preparation)
      const dummyCollections = [
        { name: 'users', ids: ['usr_owner_1', 'usr_owner_2', 'usr_james', 'usr_sipho', 'usr_thabo'] },
        { name: 'profiles', ids: ['prof_owner_1', 'prof_owner_2', 'prof_james'] },
        { name: 'documents', ids: ['doc_1', 'doc_2', 'doc_3'] },
        { name: 'drivers', ids: ['drv_1', 'drv_2', 'drv_3', 'drv_4'] },
        { name: 'driverProfiles', ids: ['dprof_sipho', 'dprof_thabo'] },
        { name: 'complaints', ids: ['comp_1', 'comp_2', 'comp_3'] },
        { name: 'disputes', ids: ['disp_1'] },
        { name: 'evidence', ids: ['ev_1', 'ev_2', 'ev_3'] },
        { name: 'auditLogs', ids: ['aud_1', 'aud_2'] },
        { name: 'searchLogs', ids: ['slog_1', 'slog_2'] }
      ];
      for (const col of dummyCollections) {
        for (const id of col.ids) {
          try {
            await firestoreDb.collection(col.name).doc(id).delete();
          } catch (e) {
            // ignore
          }
        }
      }

      const usersSnap = await firestoreDb.collection('users').get();
      if (usersSnap.empty || (usersSnap.size === 1 && usersSnap.docs[0].id === 'usr_admin' && this.data.users.length === 0)) {
        await this.seedInitialDataToFirestore();
      } else {
        console.log('[Firebase Engine] Firestore is ready.');
      }
      
      // Perform initial synchronous load of all collections to avoid race conditions
      console.log('[Firebase Engine] Performing initial database sync...');
      const collections = [
        { name: 'users', key: 'users' },
        { name: 'profiles', key: 'fleetOwnerProfiles' },
        { name: 'documents', key: 'fleetOwnerDocuments' },
        { name: 'drivers', key: 'drivers' },
        { name: 'driverProfiles', key: 'driverProfiles' },
        { name: 'complaints', key: 'complaints' },
        { name: 'evidence', key: 'complaintEvidence' },
        { name: 'disputes', key: 'driverDisputes' },
        { name: 'riskScores', key: 'riskScores' },
        { name: 'auditLogs', key: 'auditLogs' },
        { name: 'searchLogs', key: 'searchLogs' },
        { name: 'simulatedEmails', key: 'simulatedEmails' },
        { name: 'driverReviews', key: 'driverReviews' },
        { name: 'notifications', key: 'notifications' },
        { name: 'incidentChatMessages', key: 'incidentChatMessages' },
        { name: 'driverDocuments', key: 'driverDocuments' },
        { name: 'vehicleListings', key: 'vehicleListings' }
      ];

      for (const col of collections) {
        const snap = await firestoreDb.collection(col.name).get();
        const list: any[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        (this.data as any)[col.key] = list;
      }
      
      console.log('[Firebase Engine] Initial sync completed successfully.');
      
      // Ensure system administrators exist
      const adminUsersToEnsure = [
        {
          id: 'usr_admin',
          email: 'admin@fleetcheck.co.za',
          name: 'System Administrator',
          role: 'admin' as UserRole,
          pass: 'AdminPass2026!'
        },
        {
          id: 'usr_admin_default',
          email: DEFAULT_ADMIN_EMAIL,
          name: 'System Administrator',
          role: 'admin' as UserRole,
          pass: DEFAULT_ADMIN_PASS
        }
      ];

      for (const adm of adminUsersToEnsure) {
        if (!adm.email) continue;
        let existingAdmin = this.data.users.find(u => u.email.toLowerCase() === adm.email.toLowerCase());
        if (!existingAdmin) {
          existingAdmin = {
            id: adm.id,
            role: 'admin',
            name: adm.name,
            email: adm.email.toLowerCase(),
            phone: '+27 82 555 0199',
            password_hash: hashPassword(adm.pass),
            email_verified_at: new Date().toISOString(),
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          this.addUser(existingAdmin);
          console.log(`[Firebase Engine] Created system administrator: ${adm.email}`);
        } else {
          const updates: Partial<User> = {};
          if (existingAdmin.role !== 'admin') updates.role = 'admin';
          if (existingAdmin.status !== 'active') updates.status = 'active';
          if (Object.keys(updates).length > 0) {
            this.updateUser(existingAdmin.id, updates);
            existingAdmin.role = 'admin';
            existingAdmin.status = 'active';
          }
        }
      }

      // Ensure demo members exist for platform demo
      const demoUsers: User[] = [
        {
          id: 'usr_member_sipho',
          role: 'driver',
          name: 'Sipho Sithole',
          email: 'sipho.driver@actionpack.co.za',
          phone: '+27 82 910 4422',
          password_hash: hashPassword('MemberPass2026!'),
          email_verified_at: new Date().toISOString(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'usr_member_thabo',
          role: 'driver',
          name: 'Thabo Nkosi',
          email: 'thabo.driver@actionpack.co.za',
          phone: '+27 84 771 9901',
          password_hash: hashPassword('MemberPass2026!'),
          email_verified_at: new Date().toISOString(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'usr_member_james',
          role: 'fleet_owner',
          name: 'James Mthembu',
          email: 'james.fleet@actionpack.co.za',
          phone: '+27 81 332 5599',
          password_hash: hashPassword('MemberPass2026!'),
          email_verified_at: new Date().toISOString(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'usr_member_sarah',
          role: 'fleet_owner',
          name: 'Sarah Dlamini',
          email: 'sarah.fleet@actionpack.co.za',
          phone: '+27 79 554 1122',
          password_hash: hashPassword('MemberPass2026!'),
          email_verified_at: new Date().toISOString(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      demoUsers.forEach(du => {
        if (!this.data.users.some(u => u.email.toLowerCase() === du.email.toLowerCase())) {
          this.addUser(du);
        }
      });

      // Ensure demo fleet profiles exist
      const demoFleetProfiles: FleetOwnerProfile[] = [
        {
          id: 'prof_james',
          user_id: 'usr_member_james',
          company_name: 'Mthembu Transport Fleets',
          registration_number: '2021/108922/07',
          business_address: '14 Commerce Crescent, Sandton, Johannesburg',
          fleet_size: 8,
          platforms_used: ['Uber', 'Bolt'],
          verification_status: 'verified',
          verification_expiry: null,
          verified_at: new Date().toISOString(),
          rejected_reason: null,
          admin_notes: 'Verified commercial operator.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'prof_sarah',
          user_id: 'usr_member_sarah',
          company_name: 'Dlamini Mobility Solutions',
          registration_number: '2022/449102/07',
          business_address: '88 Loop Street, Cape Town',
          fleet_size: 5,
          platforms_used: ['Uber', 'Bolt'],
          verification_status: 'verified',
          verification_expiry: null,
          verified_at: new Date().toISOString(),
          rejected_reason: null,
          admin_notes: 'Verified commercial operator.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      demoFleetProfiles.forEach(prof => {
        if (!this.data.fleetOwnerProfiles.some(p => p.id === prof.id || p.user_id === prof.user_id)) {
          this.addProfile(prof);
        }
      });

      // Ensure full set of demo drivers exist in directory
      const demoDriversToSeed: Array<{
        driver: Driver;
        profile: DriverProfile;
      }> = [
        {
          driver: {
            id: 'drv_sipho',
            first_name: 'Sipho',
            surname: 'Sithole',
            phone_encrypted: encrypt('+27 82 910 4422'),
            email_encrypted: encrypt('sipho.driver@actionpack.co.za'),
            id_number_encrypted: encrypt('9102145890082'),
            platform: 'Uber',
            city: 'Johannesburg',
            province: 'Gauteng',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          profile: {
            id: 'dprof_sipho',
            user_id: 'usr_member_sipho',
            first_name: 'Sipho',
            surname: 'Sithole',
            phone: '+27 82 910 4422',
            email: 'sipho.driver@actionpack.co.za',
            id_number: '9102145890082',
            platforms: ['Uber', 'Bolt'],
            uber_rating: 4.88,
            bolt_rating: 4.90,
            experience_years: 3,
            city: 'Johannesburg',
            province: 'Gauteng',
            status: 'looking_for_vehicle',
            bio: 'Experienced rideshare driver with 3+ years in Johannesburg. Clean record and top tier ratings.',
            license_type: 'Code 8 PDP',
            references: [
              {
                id: 'ref_sipho_1',
                name: 'James Mthembu',
                company_name: 'Mthembu Transport Fleets',
                phone: '+27 81 332 5599',
                email: 'james.fleet@actionpack.co.za',
                relationship: 'Former Fleet Owner'
              }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        {
          driver: {
            id: 'drv_thabo',
            first_name: 'Thabo',
            surname: 'Nkosi',
            phone_encrypted: encrypt('+27 84 771 9901'),
            email_encrypted: encrypt('thabo.driver@actionpack.co.za'),
            id_number_encrypted: encrypt('9308115890085'),
            platform: 'Bolt',
            city: 'Cape Town',
            province: 'Western Cape',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          profile: {
            id: 'dprof_thabo',
            user_id: 'usr_member_thabo',
            first_name: 'Thabo',
            surname: 'Nkosi',
            phone: '+27 84 771 9901',
            email: 'thabo.driver@actionpack.co.za',
            id_number: '9308115890085',
            platforms: ['Bolt', 'Uber'],
            uber_rating: 4.82,
            bolt_rating: 4.85,
            experience_years: 2,
            city: 'Cape Town',
            province: 'Western Cape',
            status: 'looking_for_vehicle',
            bio: 'Dependable driver with full PDP certification in Cape Town area.',
            license_type: 'Code 8 PDP',
            references: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        {
          driver: {
            id: 'drv_takudzwa',
            first_name: 'Takudzwa',
            surname: 'Hanyire',
            phone_encrypted: encrypt('+27 83 456 7890'),
            email_encrypted: encrypt('takuman456@gmail.com'),
            id_number_encrypted: encrypt('9204125890081'),
            platform: 'Uber',
            city: 'Johannesburg',
            province: 'Gauteng',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          profile: {
            id: 'dprof_takudzwa',
            user_id: 'usr_member_takudzwa',
            first_name: 'Takudzwa',
            surname: 'Hanyire',
            phone: '+27 83 456 7890',
            email: 'takuman456@gmail.com',
            id_number: '9204125890081',
            platforms: ['Uber', 'Bolt'],
            uber_rating: 4.88,
            bolt_rating: 4.90,
            experience_years: 3,
            city: 'Johannesburg',
            province: 'Gauteng',
            status: 'looking_for_vehicle',
            bio: 'Experienced, professional rideshare driver with 3+ years on Uber and Bolt platforms looking for a vehicle to hire. Excellent track record and ratings.',
            license_type: 'Code 8 PDP',
            references: [
              {
                id: 'ref_tak_1',
                name: 'James Mthembu',
                company_name: 'Mthembu Transport Fleets',
                phone: '+27 81 332 5599',
                email: 'james.fleet@actionpack.co.za',
                relationship: 'Former Fleet Owner'
              }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        {
          driver: {
            id: 'drv_david',
            first_name: 'David',
            surname: 'Moyo',
            phone_encrypted: encrypt('+27 81 223 8844'),
            email_encrypted: encrypt('david.moyo@actionpack.co.za'),
            id_number_encrypted: encrypt('8911045890089'),
            platform: 'inDrive',
            city: 'Durban',
            province: 'KwaZulu-Natal',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          profile: {
            id: 'dprof_david',
            user_id: 'usr_member_david',
            first_name: 'David',
            surname: 'Moyo',
            phone: '+27 81 223 8844',
            email: 'david.moyo@actionpack.co.za',
            id_number: '8911045890089',
            platforms: ['inDrive', 'Bolt'],
            uber_rating: 4.75,
            bolt_rating: 4.80,
            experience_years: 4,
            city: 'Durban',
            province: 'KwaZulu-Natal',
            status: 'looking_for_vehicle',
            bio: 'Senior rideshare and logistics driver in eThekwini. Valid PrDP and clean background check.',
            license_type: 'Code 10 PDP',
            references: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        },
        {
          driver: {
            id: 'drv_peter',
            first_name: 'Peter',
            surname: 'Khumalo',
            phone_encrypted: encrypt('+27 76 331 4455'),
            email_encrypted: encrypt('peter.k@actionpack.co.za'),
            id_number_encrypted: encrypt('9501235890083'),
            platform: 'Bolt',
            city: 'Pretoria',
            province: 'Gauteng',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          profile: {
            id: 'dprof_peter',
            user_id: 'usr_member_peter',
            first_name: 'Peter',
            surname: 'Khumalo',
            phone: '+27 76 331 4455',
            email: 'peter.k@actionpack.co.za',
            id_number: '9501235890083',
            platforms: ['Bolt'],
            uber_rating: 4.91,
            bolt_rating: 4.93,
            experience_years: 2,
            city: 'Pretoria',
            province: 'Gauteng',
            status: 'looking_for_vehicle',
            bio: 'Tshwane region commercial rideshare driver with verified high passenger safety score.',
            license_type: 'Code 8 PDP',
            references: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }
      ];

      demoDriversToSeed.forEach(({ driver, profile }) => {
        if (!this.data.drivers.some(d => d.id === driver.id)) {
          this.addDriver(driver);
        }
        if (!this.data.driverProfiles.some(dp => dp.id === profile.id)) {
          this.addDriverProfile(profile);
        }
      });
      
      // Ensure seed search logs for trending query telemetry if empty
      if (!this.data.searchLogs || this.data.searchLogs.length === 0) {
        const seedQueries = [
          { q: 'Sipho Sithole', platform: 'Uber', city: 'Johannesburg', province: 'Gauteng', count: 18, res: 1 },
          { q: 'Uber Fleet Drivers', platform: 'Uber', city: 'Johannesburg', province: 'Gauteng', count: 26, res: 4 },
          { q: 'Bolt Code 8 PDP', platform: 'Bolt', city: 'Durban', province: 'KwaZulu-Natal', count: 21, res: 3 },
          { q: 'Thabo Nkosi', platform: 'Bolt', city: 'Pretoria', province: 'Gauteng', count: 14, res: 1 },
          { q: 'Cape Town inDrive', platform: 'inDrive', city: 'Cape Town', province: 'Western Cape', count: 16, res: 2 },
          { q: 'Takudzwa Hanyire', platform: 'Uber', city: 'Johannesburg', province: 'Gauteng', count: 19, res: 1 },
          { q: 'Zero Incident Clearance', platform: 'Uber', city: 'Johannesburg', province: 'Gauteng', count: 24, res: 5 },
          { q: 'Durban Rideshare Drivers', platform: 'Bolt', city: 'Durban', province: 'KwaZulu-Natal', count: 13, res: 3 },
          { q: 'Toyota Corolla PDP', platform: 'Uber', city: 'Johannesburg', province: 'Gauteng', count: 15, res: 2 },
          { q: 'Gauteng High Reliability', platform: 'Uber', city: 'Johannesburg', province: 'Gauteng', count: 17, res: 4 },
          { q: 'Sandton Uber Drivers', platform: 'Uber', city: 'Johannesburg', province: 'Gauteng', count: 11, res: 2 },
          { q: 'Bolt PDP Verified', platform: 'Bolt', city: 'Cape Town', province: 'Western Cape', count: 12, res: 3 }
        ];

        const ownerUser = this.data.users.find(u => u.role === 'fleet_owner');
        const ownerId = ownerUser ? ownerUser.id : 'usr_owner_1';
        const ownerName = ownerUser ? ownerUser.name : 'Fleet Operator';

        const nowMs = Date.now();
        const logsToInsert: SearchLog[] = [];

        seedQueries.forEach((item, itemIdx) => {
          for (let k = 0; k < item.count; k++) {
            const daysAgo = (itemIdx * 2 + k * 3) % 28;
            const hoursAgo = (k * 7) % 24;
            const logTime = new Date(nowMs - (daysAgo * 24 * 3600 * 1000) - (hoursAgo * 3600 * 1000)).toISOString();
            logsToInsert.push({
              id: `seed_slog_${itemIdx}_${k}`,
              user_id: ownerId,
              user_name: ownerName,
              search_query: item.q,
              search_type: 'FLEET_OWNER_SEARCH',
              result_count: item.res,
              ip_address: '197.89.44.12',
              platform: item.platform,
              city: item.city,
              province: item.province,
              created_at: logTime
            });
          }
        });

        // Sort latest first
        logsToInsert.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        this.data.searchLogs = logsToInsert;
        console.log(`[Firebase Engine] Seeded ${logsToInsert.length} realistic driver search tracking telemetry logs.`);
      }

      // Setup live listeners for sub-second synchronization
      this.setupListeners();
      this.markReady();
    } catch (err) {
      console.error('[Firebase Engine] Startup failed:', err);
      // Fail open: let the server start on the local-first seed data rather than
      // hang forever if Firestore is unreachable at boot.
      this.markReady();
    }
  }

  private setupListeners() {
    const collections = [
      { name: 'users', key: 'users' },
      { name: 'profiles', key: 'fleetOwnerProfiles' },
      { name: 'documents', key: 'fleetOwnerDocuments' },
      { name: 'drivers', key: 'drivers' },
      { name: 'driverProfiles', key: 'driverProfiles' },
      { name: 'complaints', key: 'complaints' },
      { name: 'evidence', key: 'complaintEvidence' },
      { name: 'disputes', key: 'driverDisputes' },
      { name: 'riskScores', key: 'riskScores' },
      { name: 'auditLogs', key: 'auditLogs' },
      { name: 'searchLogs', key: 'searchLogs' },
      { name: 'driverLinkRequests', key: 'driverLinkRequests' },
      { name: 'simulatedEmails', key: 'simulatedEmails' },
      { name: 'driverReviews', key: 'driverReviews' },
      { name: 'notifications', key: 'notifications' },
      { name: 'incidentChatMessages', key: 'incidentChatMessages' },
      { name: 'driverDocuments', key: 'driverDocuments' },
      { name: 'vehicleListings', key: 'vehicleListings' }
    ];

    collections.forEach(({ name, key }) => {
      firestoreDb.collection(name).onSnapshot(
        snapshot => {
          const list: any[] = [];
          snapshot.forEach(docSnap => {
            list.push({ id: docSnap.id, ...docSnap.data() });
          });
          (this.data as any)[key] = list;
          console.log(`[Firebase Engine] Live Sync: '${name}' -> ${list.length} records.`);
        },
        error => {
          console.error(`[Firebase Engine] Live Sync error on '${name}':`, error);
        }
      );
    });
  }

  // Backward compatibility save method
  public save() {
    // No-op. Firestore handles auto-saving of writes instantly.
  }

  public getDriverProfiles() { return this.data.driverProfiles || []; }

  public getDriverReviews(driverId?: string): DriverReview[] {
    const list = this.data.driverReviews || [];
    if (!driverId) return list;
    return list.filter(r => r.driver_id === driverId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addDriverReview(review: DriverReview) {
    if (!this.data.driverReviews) this.data.driverReviews = [];
    this.data.driverReviews.push(review);
    safeSetDoc('driverReviews', review.id, review);
  }

  public getDriverReviewSummary(driverId: string): DriverReviewSummary {
    const reviews = this.getDriverReviews(driverId);
    if (reviews.length === 0) {
      return {
        average_overall: 0,
        total_reviews: 0,
        average_driving_behavior: 0,
        average_vehicle_care: 0,
        average_punctuality_payment: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const dist: { 1: number; 2: number; 3: number; 4: number; 5: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumOverall = 0;
    let sumDriving = 0;
    let countDriving = 0;
    let sumVehicle = 0;
    let countVehicle = 0;
    let sumPunctuality = 0;
    let countPunctuality = 0;

    reviews.forEach(r => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.overall_rating))) as 1|2|3|4|5;
      dist[rounded] = (dist[rounded] || 0) + 1;
      sumOverall += r.overall_rating;
      if (r.driving_behavior) {
        sumDriving += r.driving_behavior;
        countDriving++;
      }
      if (r.vehicle_care) {
        sumVehicle += r.vehicle_care;
        countVehicle++;
      }
      if (r.punctuality_payment) {
        sumPunctuality += r.punctuality_payment;
        countPunctuality++;
      }
    });

    return {
      average_overall: Number((sumOverall / reviews.length).toFixed(1)),
      total_reviews: reviews.length,
      average_driving_behavior: countDriving > 0 ? Number((sumDriving / countDriving).toFixed(1)) : 0,
      average_vehicle_care: countVehicle > 0 ? Number((sumVehicle / countVehicle).toFixed(1)) : 0,
      average_punctuality_payment: countPunctuality > 0 ? Number((sumPunctuality / countPunctuality).toFixed(1)) : 0,
      rating_distribution: dist
    };
  }

  public getNotifications(userId?: string): UserNotification[] {
    const list = this.data.notifications || [];
    if (!userId) return list;
    return list.filter(n => n.user_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public addNotification(notif: UserNotification) {
    if (!this.data.notifications) this.data.notifications = [];
    this.data.notifications.push(notif);
    safeSetDoc('notifications', notif.id, notif);
  }

  public markNotificationAsRead(id: string, userId: string) {
    if (!this.data.notifications) this.data.notifications = [];
    const notif = this.data.notifications.find(n => n.id === id && n.user_id === userId);
    if (notif) {
      notif.read = true;
      safeSetDoc('notifications', id, notif, { merge: true });
    }
  }

  public markAllNotificationsAsRead(userId: string) {
    if (!this.data.notifications) this.data.notifications = [];
    this.data.notifications.forEach(n => {
      if (n.user_id === userId && !n.read) {
        n.read = true;
        safeSetDoc('notifications', n.id, n, { merge: true });
      }
    });
  }

  public getIncidentChatMessages(complaintId?: string): IncidentChatMessage[] {
    const list = this.data.incidentChatMessages || [];
    if (!complaintId) return list;
    return list
      .filter(m => m.complaint_id === complaintId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  public addIncidentChatMessage(msg: IncidentChatMessage) {
    if (!this.data.incidentChatMessages) this.data.incidentChatMessages = [];
    this.data.incidentChatMessages.push(msg);
    safeSetDoc('incidentChatMessages', msg.id, msg);
  }

  public markIncidentChatMessagesAsRead(complaintId: string, userId: string) {
    if (!this.data.incidentChatMessages) this.data.incidentChatMessages = [];
    this.data.incidentChatMessages.forEach(m => {
      if (m.complaint_id === complaintId && !m.read_by.includes(userId)) {
        m.read_by.push(userId);
        safeSetDoc('incidentChatMessages', m.id, m, { merge: true });
      }
    });
  }

  public getFleetOwnerProfiles() { return this.data.fleetOwnerProfiles || []; }

  public getDriverLinkRequests() { return this.data.driverLinkRequests || []; }

  public addDriverLinkRequest(req: DriverLinkRequest) {
    if (!this.data.driverLinkRequests) this.data.driverLinkRequests = [];
    this.data.driverLinkRequests.push(req);
    safeSetDoc('driverLinkRequests', req.id, req);
  }

  public updateDriverLinkRequest(id: string, updates: Partial<DriverLinkRequest>) {
    if (!this.data.driverLinkRequests) this.data.driverLinkRequests = [];
    const idx = this.data.driverLinkRequests.findIndex(r => r.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.driverLinkRequests[idx], ...updates };
      this.data.driverLinkRequests[idx] = updated;
      safeSetDoc('driverLinkRequests', id, updated, { merge: true });
    }
  }

  public searchFleetOwners(query: string) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const ownerUsers = (this.data.users || []).filter(u => u.role === 'fleet_owner');
    const ownerProfiles = this.data.fleetOwnerProfiles || [];

    const results: Array<{
      id: string;
      user_id: string;
      name: string;
      email: string;
      phone: string;
      company_name: string;
      business_address: string;
      verification_status: string;
    }> = [];

    for (const user of ownerUsers) {
      const profile = ownerProfiles.find(p => p.user_id === user.id);
      const company = profile?.company_name || '';
      const email = user.email || '';
      const name = user.name || '';
      const phone = user.phone || '';
      const address = profile?.business_address || '';

      if (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        phone.includes(q) ||
        company.toLowerCase().includes(q)
      ) {
        results.push({
          id: profile?.id || user.id,
          user_id: user.id,
          name,
          email,
          phone,
          company_name: company || 'Fleet Operator',
          business_address: address,
          verification_status: profile?.verification_status || 'pending'
        });
      }
    }
    return results;
  }

  public addDriverProfile(profile: DriverProfile) {
    if (!this.data.driverProfiles) this.data.driverProfiles = [];
    this.data.driverProfiles.push(profile);
    safeSetDoc('driverProfiles', profile.id, profile);
  }

  public updateDriverProfile(id: string, updates: Partial<DriverProfile>) {
    if (!this.data.driverProfiles) this.data.driverProfiles = [];
    const idx = this.data.driverProfiles.findIndex(dp => dp.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.driverProfiles[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.driverProfiles[idx] = updated;
      safeSetDoc('driverProfiles', id, updated, { merge: true });
    }
  }

  // Verifies if a given reference is a registered & verified Fleet Owner on FleetCheck
  public verifyDriverReference(ref: DriverReference): DriverReference {
    const verifiedOwners = this.data.fleetOwnerProfiles.filter(p => p.verification_status === 'verified');
    const users = this.data.users;

    const matchedProfile = verifiedOwners.find(p => {
      const ownerUser = users.find(u => u.id === p.user_id);
      if (!ownerUser) return false;

      const refEmail = (ref.email || '').trim().toLowerCase();
      const refPhone = (ref.phone || '').trim().replace(/[\s\-\(\)]/g, '');
      const refCompany = (ref.company_name || '').trim().toLowerCase();

      const ownerEmail = ownerUser.email.trim().toLowerCase();
      const ownerPhone = ownerUser.phone.trim().replace(/[\s\-\(\)]/g, '');
      const ownerCompany = (p.company_name || '').trim().toLowerCase();

      const emailMatch = refEmail && ownerEmail && refEmail === ownerEmail;
      const phoneMatch = refPhone && ownerPhone && refPhone.length >= 7 && (refPhone.endsWith(ownerPhone.slice(-7)) || ownerPhone.endsWith(refPhone.slice(-7)));
      const companyMatch = refCompany && ownerCompany && (refCompany === ownerCompany || ownerCompany.includes(refCompany) || refCompany.includes(ownerCompany));

      return emailMatch || phoneMatch || companyMatch;
    });

    if (matchedProfile) {
      const ownerUser = users.find(u => u.id === matchedProfile.user_id);
      return {
        ...ref,
        is_verified_fleet_owner: true,
        verified_fleet_owner_id: matchedProfile.id,
        verified_fleet_owner_name: ownerUser?.name || 'Verified Fleet Operator',
        verified_fleet_owner_company: matchedProfile.company_name
      };
    }

    return {
      ...ref,
      is_verified_fleet_owner: false
    };
  }

  // Formats driver profiles for the Driver Marketplace, handling masking for public vs verified fleet owners
  public getMarketplaceDrivers(userRole: UserRole, isVerified: boolean): MaskedMarketplaceDriver[] {
    const profiles = this.getDriverProfiles();
    const canSeeFullDetails = userRole === 'admin' || (userRole === 'fleet_owner' && isVerified);

    return profiles.map(profile => {
      // Process and verify all references
      const verifiedRefs = (profile.references || []).map(r => this.verifyDriverReference(r));

      // Calculate risk/complaint summary for driver if any exists in complaints
      const driverEmail = (profile.email || '').toLowerCase();
      const driverPhone = (profile.phone || '').replace(/[\s\-\(\)]/g, '');
      const driverIdNo = (profile.id_number || '').trim();

      const matchedComplaints = this.data.complaints.filter(c => {
        if (c.status !== 'approved') return false;
        const d = this.data.drivers.find(drv => drv.id === c.driver_id);
        if (!d) return false;
        const dEmail = decrypt(d.email_encrypted).toLowerCase();
        const dPhone = decrypt(d.phone_encrypted).replace(/[\s\-\(\)]/g, '');
        const dId = decrypt(d.id_number_encrypted).trim();
        return (
          (driverEmail && dEmail && driverEmail === dEmail) ||
          (driverPhone && dPhone && driverPhone.slice(-7) === dPhone.slice(-7)) ||
          (driverIdNo && dId && driverIdNo === dId)
        );
      });

      let risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
      if (matchedComplaints.length === 1) risk_level = 'medium';
      else if (matchedComplaints.length >= 2) risk_level = 'high';

      const maskedReferences = verifiedRefs.map(ref => {
        if (canSeeFullDetails) {
          return {
            id: ref.id,
            name_masked: ref.name,
            name: ref.name,
            company_name: ref.company_name,
            phone_masked: ref.phone,
            phone: ref.phone,
            relationship: ref.relationship,
            is_verified_fleet_owner: !!ref.is_verified_fleet_owner,
            verified_fleet_owner_company: ref.verified_fleet_owner_company
          };
        } else {
          // Public / Unverified blur
          const namePart = ref.name ? ref.name.charAt(0) + '***' : 'Reference';
          const phonePart = ref.phone ? '+27 8* *** ' + ref.phone.slice(-4) : '+27 8* *** ****';
          return {
            id: ref.id,
            name_masked: namePart,
            company_name: ref.company_name,
            phone_masked: phonePart,
            relationship: ref.relationship,
            is_verified_fleet_owner: !!ref.is_verified_fleet_owner,
            verified_fleet_owner_company: ref.verified_fleet_owner_company
          };
        }
      });

      if (canSeeFullDetails) {
        return {
          id: profile.id,
          user_id: profile.user_id,
          first_name: profile.first_name,
          surname_masked: profile.surname,
          surname: profile.surname,
          phone_masked: profile.phone,
          phone: profile.phone,
          email_masked: profile.email,
          email: profile.email,
          id_number_masked: profile.id_number,
          id_number: profile.id_number,
          platforms: profile.platforms || ['Uber'],
          uber_rating: profile.uber_rating || 4.8,
          bolt_rating: profile.bolt_rating,
          experience_years: profile.experience_years || 1,
          city: profile.city || 'Cape Town',
          province: profile.province || 'Western Cape',
          status: profile.status || 'looking_for_vehicle',
          bio: profile.bio || '',
          license_type: profile.license_type || 'Code 8 PDP',
          references: maskedReferences,
          is_locked: false,
          risk_summary: {
            approved_complaints_count: matchedComplaints.length,
            risk_level
          }
        };
      } else {
        // Public/Unverified masked driver profile
        const surnameMasked = profile.surname ? profile.surname.charAt(0) + '***' : '***';
        const phoneMasked = profile.phone ? '+27 8* *** ' + profile.phone.slice(-4) : '+27 8* *** ****';
        const emailMasked = profile.email ? profile.email.charAt(0) + '***@' + (profile.email.split('@')[1] || 'email.co.za') : 'd***@driver.co.za';

        return {
          id: profile.id,
          user_id: profile.user_id,
          first_name: profile.first_name,
          surname_masked: surnameMasked,
          phone_masked: phoneMasked,
          email_masked: emailMasked,
          id_number_masked: '*******',
          platforms: profile.platforms || ['Uber'],
          uber_rating: profile.uber_rating || 4.8,
          bolt_rating: profile.bolt_rating,
          experience_years: profile.experience_years || 1,
          city: profile.city || 'Cape Town',
          province: profile.province || 'Western Cape',
          status: profile.status || 'looking_for_vehicle',
          bio: profile.bio || '',
          license_type: profile.license_type || 'Code 8 PDP',
          references: maskedReferences,
          is_locked: true,
          risk_summary: {
            approved_complaints_count: matchedComplaints.length,
            risk_level
          }
        };
      }
    });
  }

  // Getters (read directly from the synchronized local memory cache)
  public getUsers() { return this.data.users; }
  public getProfiles() { return this.data.fleetOwnerProfiles; }
  public getDriverProfileByUserId(userId: string) { return (this.data.driverProfiles || []).find(p => p.user_id === userId); }
  public getDocuments() { return this.data.fleetOwnerDocuments; }
  public getDrivers() { return this.data.drivers; }
  public getComplaints() { return this.data.complaints; }
  public getEvidence() { return this.data.complaintEvidence; }
  public getDisputes() { return this.data.driverDisputes; }
  public getRiskScores() { return this.data.riskScores; }
  public getAuditLogs() { return this.data.auditLogs; }
  public getSearchLogs() { return this.data.searchLogs; }
  public getSimulatedEmails() { return this.data.simulatedEmails || []; }

  // Setters/adders (Write directly to Firestore and let snapshot listeners update the cache)
  public addUser(user: User) {
    this.data.users.push(user);
    safeSetDoc('users', user.id, user);
  }

  public updateUser(id: string, updates: Partial<User>) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.users[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.users[idx] = updated;
      safeSetDoc('users', id, updated, { merge: true });
    }
  }

  public deleteUser(id: string) {
    this.data.users = this.data.users.filter(u => u.id !== id);
    firestoreDb.collection('users').doc(id).delete().catch(err => console.error('Firestore delete user failed:', err));
  }

  public deleteFleetOwnerProfile(id: string) {
    this.data.fleetOwnerProfiles = this.data.fleetOwnerProfiles.filter(p => p.id !== id);
    firestoreDb.collection('profiles').doc(id).delete().catch(err => console.error('Firestore delete profile failed:', err));
  }

  public deleteDriverProfile(id: string) {
    if (!this.data.driverProfiles) this.data.driverProfiles = [];
    this.data.driverProfiles = this.data.driverProfiles.filter(dp => dp.id !== id);
    firestoreDb.collection('driverProfiles').doc(id).delete().catch(err => console.error('Firestore delete driverProfile failed:', err));
  }

  public deleteDriver(id: string) {
    this.data.drivers = this.data.drivers.filter(d => d.id !== id);
    firestoreDb.collection('drivers').doc(id).delete().catch(err => console.error('Firestore delete driver failed:', err));
  }

  public addProfile(profile: FleetOwnerProfile) {
    this.data.fleetOwnerProfiles.push(profile);
    safeSetDoc('profiles', profile.id, profile);
  }

  public updateProfile(id: string, updates: Partial<FleetOwnerProfile>) {
    const idx = this.data.fleetOwnerProfiles.findIndex(p => p.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.fleetOwnerProfiles[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.fleetOwnerProfiles[idx] = updated;
      safeSetDoc('profiles', id, updated, { merge: true });
    }
  }

  public addDocument(docData: FleetOwnerDocument) {
    this.data.fleetOwnerDocuments.push(docData);
    safeSetDoc('documents', docData.id, docData);
  }

  public updateDocument(id: string, updates: Partial<FleetOwnerDocument>) {
    const idx = this.data.fleetOwnerDocuments.findIndex(d => d.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.fleetOwnerDocuments[idx], ...updates };
      this.data.fleetOwnerDocuments[idx] = updated;
      safeSetDoc('documents', id, updated, { merge: true });
    }
  }

  public addDriver(driver: Driver) {
    this.data.drivers.push(driver);
    safeSetDoc('drivers', driver.id, driver);
  }

  public updateDriver(id: string, updates: Partial<Driver>) {
    const idx = this.data.drivers.findIndex(d => d.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.drivers[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.drivers[idx] = updated;
      safeSetDoc('drivers', id, updated, { merge: true });
    }
  }

  public addComplaint(comp: Complaint) {
    this.data.complaints.push(comp);
    safeSetDoc('complaints', comp.id, comp);
  }

  public updateComplaint(id: string, updates: Partial<Complaint>) {
    const idx = this.data.complaints.findIndex(c => c.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.complaints[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.complaints[idx] = updated;
      safeSetDoc('complaints', id, updated, { merge: true });
    }
  }

  public addEvidence(ev: ComplaintEvidence) {
    this.data.complaintEvidence.push(ev);
    safeSetDoc('evidence', ev.id, ev);
  }

  public addDispute(disp: DriverDispute) {
    this.data.driverDisputes.push(disp);
    safeSetDoc('disputes', disp.id, disp);
  }

  public updateDispute(id: string, updates: Partial<DriverDispute>) {
    const idx = this.data.driverDisputes.findIndex(d => d.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.driverDisputes[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.driverDisputes[idx] = updated;
      safeSetDoc('disputes', id, updated, { merge: true });
    }
  }

  public addSimulatedEmail(email: any) {
    if (!this.data.simulatedEmails) this.data.simulatedEmails = [];
    this.data.simulatedEmails.unshift(email);
    safeSetDoc('simulatedEmails', email.id, email);
  }

  public logAudit(log: Omit<AuditLog, 'id' | 'created_at'>) {
    const newLog: AuditLog = {
      id: 'audit_' + Math.random().toString(36).substr(2, 9),
      ...log,
      created_at: new Date().toISOString()
    };
    if (!this.data.auditLogs) this.data.auditLogs = [];
    this.data.auditLogs.unshift(newLog);
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs.pop();
    }
    safeSetDoc('auditLogs', newLog.id, newLog);
  }

  public logSearch(log: Omit<SearchLog, 'id' | 'created_at'>) {
    const newLog: SearchLog = {
      id: 'search_' + Math.random().toString(36).substr(2, 9),
      ...log,
      created_at: new Date().toISOString()
    };
    if (!this.data.searchLogs) this.data.searchLogs = [];
    this.data.searchLogs.unshift(newLog);
    if (this.data.searchLogs.length > 1000) {
      this.data.searchLogs.pop();
    }
    safeSetDoc('searchLogs', newLog.id, newLog);
  }

  // Merging drivers (admin capability)
  public mergeDrivers(primaryId: string, duplicateId: string, adminUserId: string) {
    const primary = this.data.drivers.find(d => d.id === primaryId);
    const duplicate = this.data.drivers.find(d => d.id === duplicateId);
    if (!primary || !duplicate) return false;

    // Relink all complaints from duplicate to primary
    this.data.complaints.forEach((c) => {
      if (c.driver_id === duplicateId) {
        this.updateComplaint(c.id, { driver_id: primaryId, updated_at: new Date().toISOString() });
      }
    });

    // Delete duplicate driver record
    this.data.drivers = this.data.drivers.filter(d => d.id !== duplicateId);
    firestoreDb.collection('drivers').doc(duplicateId).delete().catch(err => console.error('Firestore delete driver failed:', err));

    // Recompute risk score for primary
    this.calculateDriverRiskScore(primaryId);

    // Audit log
    this.logAudit({
      user_id: adminUserId,
      action: 'MERGE_DRIVERS',
      entity_type: 'Driver',
      entity_id: primaryId,
      old_value: `Merged driver ${duplicate.first_name} ${duplicate.surname} (${duplicate.id})`,
      new_value: `Retained primary driver ${primary.first_name} ${primary.surname} (${primary.id})`,
      ip_address: '127.0.0.1',
      user_agent: 'Server Action'
    });

    return true;
  }

  // Calculate Risk Score based on user specs
  public calculateDriverRiskScore(driverId: string): RiskScore {
    const complaintsList = this.data.complaints || [];
    const driverComplaints = complaintsList.filter(c => c.driver_id === driverId && c.status === 'approved');
    
    let score = 100;
    let explanationParts: string[] = [];
    let penaltiesApplied = 0;
    
    // Severity deductions
    const lowCount = driverComplaints.filter(c => c.severity === 'low').length;
    const mediumCount = driverComplaints.filter(c => c.severity === 'medium').length;
    const highCount = driverComplaints.filter(c => c.severity === 'high').length;
    const criticalCount = driverComplaints.filter(c => c.severity === 'critical').length;

    // Process each complaint
    driverComplaints.forEach(c => {
      let deduction = 0;
      if (c.severity === 'low') deduction = 10;
      else if (c.severity === 'medium') deduction = 25;
      else if (c.severity === 'high') deduction = 50;
      else if (c.severity === 'critical') deduction = 70;

      // Adjustments
      let adjustments: string[] = [];
      // 1. Resolved complaint reduces negative impact by 50%
      if (c.resolution_status !== 'unresolved') {
        deduction = deduction * 0.5;
        adjustments.push('resolved status reduction');
      }

      // 2. Older complaints (older than 1 year, e.g. 365 days) reduce penalty by 50%
      const incidentDate = new Date(c.incident_date || Date.now());
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - incidentDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 365) {
        deduction = deduction * 0.5;
        adjustments.push('aged record reduction');
      }

      score -= deduction;
      penaltiesApplied += deduction;
    });

    // Score boundaries
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Risk level boundaries
    let risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none';
    if (score >= 95) risk_level = 'none';
    else if (score >= 80) risk_level = 'low';
    else if (score >= 50) risk_level = 'medium';
    else if (score >= 20) risk_level = 'high';
    else risk_level = 'critical';

    // Build clear explainable reason string
    if (driverComplaints.length === 0) {
      explanationParts.push('No incident records verified.');
    } else {
      explanationParts.push(`Driver has ${driverComplaints.length} approved record(s):`);
      if (criticalCount > 0) explanationParts.push(`${criticalCount} critical-severity incident(s)`);
      if (highCount > 0) explanationParts.push(`${highCount} high-severity incident(s)`);
      if (mediumCount > 0) explanationParts.push(`${mediumCount} medium-severity incident(s)`);
      if (lowCount > 0) explanationParts.push(`${lowCount} low-severity incident(s)`);

      const resolvedCount = driverComplaints.filter(c => c.resolution_status !== 'unresolved').length;
      if (resolvedCount > 0) {
        explanationParts.push(`(${resolvedCount} resolved record(s) with reduced risk impact)`);
      }
    }

    // Check if there are active disputes
    const hasDisputes = driverComplaints.some(c => c.status === 'disputed');
    if (hasDisputes) {
      explanationParts.push('[⚠️ Record under active driver dispute]');
    }

    const explanation = explanationParts.join(', ');

    if (!this.data.riskScores) this.data.riskScores = [];
    // Find or create risk score entry
    const idx = this.data.riskScores.findIndex(r => r.driver_id === driverId);
    const newRiskScore: RiskScore = {
      id: idx !== -1 ? this.data.riskScores[idx].id : 'risk_' + Math.random().toString(36).substr(2, 9),
      driver_id: driverId,
      score,
      risk_level,
      explanation,
      calculated_at: new Date().toISOString()
    };

    if (idx !== -1) {
      this.data.riskScores[idx] = newRiskScore;
    } else {
      this.data.riskScores.push(newRiskScore);
    }
    
    safeSetDoc('riskScores', newRiskScore.id, newRiskScore);
    return newRiskScore;
  }

  // Get masked or detailed driver profile depending on credentials
  public getMaskedDriver(driver: Driver, userRole: UserRole, isVerified: boolean): MaskedDriver {
    if (!driver) {
      return {
        id: 'unknown',
        first_name: 'Unknown',
        surname: 'Driver',
        phone_masked: '***',
        email_masked: '***',
        id_number_masked: '***',
        platform: 'All',
        city: 'Unknown',
        province: 'Unknown',
        risk_level: 'none',
        risk_score: 100,
        risk_explanation: 'No record found',
        approved_complaints_count: 0,
        last_incident_date: null,
        is_disputed: false
      };
    }

    const risk = this.calculateDriverRiskScore(driver.id);
    const complaintsList = this.data.complaints || [];
    const approvedComplaints = complaintsList.filter(c => c.driver_id === driver.id && c.status === 'approved');
    
    let lastIncidentDate: string | null = null;
    if (approvedComplaints.length > 0) {
      const dates = approvedComplaints
        .map(c => c.incident_date ? new Date(c.incident_date).getTime() : 0)
        .filter(d => !isNaN(d) && d > 0);
      if (dates.length > 0) {
        lastIncidentDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
      }
    }

    const disputesList = this.data.driverDisputes || [];
    const hasDisputed = approvedComplaints.some(c => c.status === 'disputed') || 
      disputesList.some(d => d.status === 'under_review' && complaintsList.find(c => c.id === d.complaint_id)?.driver_id === driver.id);

    // Decrypt fields if authorized (Admins see everything, Verified Owners see mostly unmasked but with specific privacy controls, Public visitors see fully masked)
    const rawPhone = decrypt(driver.phone_encrypted || '');
    const rawEmail = decrypt(driver.email_encrypted || '');
    const rawIdNumber = decrypt(driver.id_number_encrypted || '');

    let phone_masked = '';
    let email_masked = '';
    let id_number_masked = '***';

    if (userRole === 'admin') {
      phone_masked = rawPhone;
      email_masked = rawEmail;
      id_number_masked = rawIdNumber;
    } else if (userRole === 'fleet_owner' && isVerified) {
      // Fleet owners can see partially unmasked to verify matches, but hide some digits for safety
      phone_masked = rawPhone ? rawPhone.replace(/^(\+\d{1,3}|\d{1,4})?(\d{3})\d+(\d{4})$/, '$1 $2 *** $3') : '***';
      email_masked = rawEmail && rawEmail.includes('@') 
        ? rawEmail.replace(/^(.)(.*)(@.*)$/, (_, first, middle, rest) => first + '*'.repeat(Math.max(1, middle.length)) + rest) 
        : (rawEmail ? rawEmail.slice(0, 2) + '***' : '***');
      id_number_masked = rawIdNumber ? rawIdNumber.replace(/^(\d{4})\d+(\d{4})$/, '$1******$2') : '***';
    } else {
      // Public / Unverified / Driver role
      phone_masked = rawPhone ? '*** *** ' + (rawPhone.length > 4 ? rawPhone.slice(-4) : rawPhone) : '***';
      if (rawEmail && rawEmail.includes('@')) {
        const parts = rawEmail.split('@');
        email_masked = rawEmail.charAt(0) + '***@' + (parts[1] || '***');
      } else {
        email_masked = rawEmail ? rawEmail.slice(0, 2) + '***' : '***';
      }
      id_number_masked = '*********';
    }

    const surnameStr = driver.surname || '';
    const formattedSurname = surnameStr 
      ? (userRole === 'public' ? surnameStr.charAt(0) + '.' : surnameStr)
      : 'Driver';

    return {
      id: driver.id,
      first_name: driver.first_name || 'Driver',
      surname: formattedSurname,
      phone_masked: phone_masked || '***',
      email_masked: email_masked || '***',
      id_number_masked: id_number_masked || '***',
      platform: driver.platform || 'Uber',
      city: driver.city || 'Johannesburg',
      province: driver.province || 'Gauteng',
      risk_level: risk.risk_level,
      risk_score: risk.score,
      risk_explanation: risk.explanation,
      approved_complaints_count: approvedComplaints.length,
      last_incident_date: lastIncidentDate,
      is_disputed: hasDisputed
    };
  }

  // --- Driver Verification Documents ---

  public getDriverDocuments(driverProfileId?: string): DriverDocument[] {
    const list = this.data.driverDocuments || [];
    if (!driverProfileId) return list;
    return list.filter(d => d.driver_profile_id === driverProfileId).sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  }

  public addDriverDocument(docItem: DriverDocument) {
    if (!this.data.driverDocuments) this.data.driverDocuments = [];
    this.data.driverDocuments.push(docItem);
    safeSetDoc('driverDocuments', docItem.id, docItem);
  }

  public updateDriverDocument(id: string, updates: Partial<DriverDocument>) {
    if (!this.data.driverDocuments) this.data.driverDocuments = [];
    const idx = this.data.driverDocuments.findIndex(d => d.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.driverDocuments[idx], ...updates };
      this.data.driverDocuments[idx] = updated;
      safeSetDoc('driverDocuments', id, updated, { merge: true });
    }
  }

  // --- Vehicle Marketplace Listings ---

  public getVehicleListings(): VehicleListing[] {
    return this.data.vehicleListings || [];
  }

  public addVehicleListing(listing: VehicleListing) {
    if (!this.data.vehicleListings) this.data.vehicleListings = [];
    this.data.vehicleListings.push(listing);
    safeSetDoc('vehicleListings', listing.id, listing);
  }

  public updateVehicleListing(id: string, updates: Partial<VehicleListing>) {
    if (!this.data.vehicleListings) this.data.vehicleListings = [];
    const idx = this.data.vehicleListings.findIndex(v => v.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.vehicleListings[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.vehicleListings[idx] = updated;
      safeSetDoc('vehicleListings', id, updated, { merge: true });
    }
  }

  public deleteVehicleListing(id: string) {
    this.data.vehicleListings = (this.data.vehicleListings || []).filter(v => v.id !== id);
    firestoreDb.collection('vehicleListings').doc(id).delete().catch(err => console.error('Firestore delete vehicleListing failed:', err));
  }

  public getMaskedVehicleListing(listing: VehicleListing, viewerRole: UserRole | 'guest'): MaskedVehicleListing {
    const ownerProfile = this.getProfiles().find(p => p.id === listing.fleet_owner_id);
    const ownerUser = ownerProfile ? this.getUsers().find(u => u.id === ownerProfile.user_id) : null;
    const ownerName = ownerUser?.name || 'Fleet Operator';
    const ownerPhone = ownerUser?.phone || '';

    const isLocked = !(viewerRole === 'admin' || viewerRole === 'driver');

    return {
      id: listing.id,
      car_type: listing.car_type,
      category: listing.category,
      platforms: listing.platforms,
      weekly_target: listing.weekly_target,
      deposit: listing.deposit,
      description: listing.description,
      photos: listing.photos,
      status: listing.status,
      review_status: listing.review_status,
      owner_company: listing.fleet_owner_company,
      owner_name_masked: ownerName ? ownerName.charAt(0) + '***' : '***',
      owner_name: isLocked ? undefined : ownerName,
      owner_phone_masked: ownerPhone ? '*** *** ' + ownerPhone.slice(-4) : '***',
      owner_phone: isLocked ? undefined : ownerPhone,
      is_locked: isLocked,
      created_at: listing.created_at
    };
  }

  // Pre-seed mock data with excellent, rich data for FleetCheck demo
  private async seedInitialDataToFirestore() {
    console.log('[Firebase Engine] Seeding initial database to Cloud Firestore...');
    
    // Create standard users
    const adminUser: User = {
      id: 'usr_admin',
      role: 'admin',
      name: 'System Administrator',
      email: DEFAULT_ADMIN_EMAIL,
      phone: '+27 82 555 0199',
      password_hash: hashPassword(DEFAULT_ADMIN_PASS),
      email_verified_at: new Date().toISOString(),
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const users = [adminUser];
    for (const u of users) {
      await firestoreDb.collection('users').doc(u.id).set(u);
    }

    console.log('[Firebase Engine] Initial seed uploaded to Firestore successfully.');
  }
}
