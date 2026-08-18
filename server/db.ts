import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  Firestore
} from 'firebase/firestore';
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
  DriverLinkRequest
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

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];

// Instantiate Firestore DB using applet configuration
const firestoreDb: Firestore = getFirestore(app, config.firestoreDatabaseId);

// AES-256-GCM authenticated encryption for driver sensitive PII
const SECRET_SEED = process.env.ENCRYPTION_KEY || process.env.GEMINI_API_KEY || 'fleetcheck-secure-master-encryption-key-v1-32b';
const ENCRYPTION_KEY = crypto.scryptSync(SECRET_SEED, 'fleetcheck-pii-salt-2026', 32);

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
    return text;
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
}

export class LocalDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.data = {
      users: [{
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
      }],
      fleetOwnerProfiles: [],
      fleetOwnerDocuments: [],
      drivers: [],
      driverProfiles: [],
      complaints: [],
      complaintEvidence: [],
      driverDisputes: [],
      riskScores: [],
      auditLogs: [],
      searchLogs: [],
      driverLinkRequests: [],
      simulatedEmails: []
    };
    this.initFirebase();
  }

  private async initFirebase() {
    try {
      console.log('[Firebase Engine] Connecting to Google Cloud Firestore...');
      
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
            await deleteDoc(doc(firestoreDb, col.name, id));
          } catch (e) {
            // ignore
          }
        }
      }

      const usersSnap = await getDocs(collection(firestoreDb, 'users'));
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
        { name: 'simulatedEmails', key: 'simulatedEmails' }
      ];
      
      for (const col of collections) {
        const snap = await getDocs(collection(firestoreDb, col.name));
        const list: any[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        (this.data as any)[col.key] = list;
      }
      
      console.log('[Firebase Engine] Initial sync completed successfully.');
      
      // Ensure configured admin exists as the system administrator
      const adminEmail = DEFAULT_ADMIN_EMAIL;
      let defaultAdmin = this.data.users.find(u => u.email.toLowerCase() === adminEmail);
      if (!defaultAdmin) {
        defaultAdmin = {
          id: 'usr_admin_default',
          role: 'admin',
          name: 'System Administrator',
          email: adminEmail,
          phone: '+27 82 555 0199',
          password_hash: hashPassword(DEFAULT_ADMIN_PASS),
          email_verified_at: new Date().toISOString(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.addUser(defaultAdmin);
        console.log(`[Firebase Engine] Created system administrator: ${adminEmail}`);
      } else {
        const updates: Partial<User> = {};
        if (defaultAdmin.role !== 'admin') updates.role = 'admin';
        if (!defaultAdmin.password_hash || !verifyPassword(DEFAULT_ADMIN_PASS, defaultAdmin.password_hash)) {
          updates.password_hash = hashPassword(DEFAULT_ADMIN_PASS);
        }
        if (Object.keys(updates).length > 0) {
          this.updateUser(defaultAdmin.id, updates);
        }
      }

      // Ensure default Accountant user exists for the Action Pack Project
      const accountantEmail = 'accountant@actionpack.co.za';
      let defaultAccountant = this.data.users.find(u => u.email.toLowerCase() === accountantEmail);
      if (!defaultAccountant) {
        defaultAccountant = {
          id: 'usr_accountant_01',
          role: 'accountant',
          name: 'Thandiwe Khumalo (Accountant)',
          email: accountantEmail,
          phone: '+27 83 400 1188',
          password_hash: hashPassword('AccountantPass2026!'),
          email_verified_at: new Date().toISOString(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        this.addUser(defaultAccountant);
        console.log(`[Firebase Engine] Created default accountant: ${accountantEmail}`);
      } else if (defaultAccountant.role !== 'accountant') {
        this.updateUser(defaultAccountant.id, { role: 'accountant' });
      }

      // Ensure demo members exist for Action Pack Project
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

      // Enforce sole admin policy: demote any other user with role 'admin'
      this.data.users.forEach(u => {
        if (u.role === 'admin' && u.email.toLowerCase() !== adminEmail) {
          console.log(`[Firebase Engine] Demoting extra admin user '${u.email}' to fleet_owner (sole admin policy).`);
          this.updateUser(u.id, { role: 'fleet_owner' });
        }
      });
      
      // Setup live listeners for sub-second synchronization
      this.setupListeners();
    } catch (err) {
      console.error('[Firebase Engine] Startup failed:', err);
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
      { name: 'simulatedEmails', key: 'simulatedEmails' }
    ];

    collections.forEach(({ name, key }) => {
      onSnapshot(
        collection(firestoreDb, name),
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

  public getFleetOwnerProfiles() { return this.data.fleetOwnerProfiles || []; }

  public getDriverLinkRequests() { return this.data.driverLinkRequests || []; }

  public addDriverLinkRequest(req: DriverLinkRequest) {
    if (!this.data.driverLinkRequests) this.data.driverLinkRequests = [];
    this.data.driverLinkRequests.push(req);
    setDoc(doc(firestoreDb, 'driverLinkRequests', req.id), req).catch(err => console.error('Firestore save link request failed:', err));
  }

  public updateDriverLinkRequest(id: string, updates: Partial<DriverLinkRequest>) {
    if (!this.data.driverLinkRequests) this.data.driverLinkRequests = [];
    const idx = this.data.driverLinkRequests.findIndex(r => r.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.driverLinkRequests[idx], ...updates };
      this.data.driverLinkRequests[idx] = updated;
      setDoc(doc(firestoreDb, 'driverLinkRequests', id), updated, { merge: true }).catch(err => console.error('Firestore update link request failed:', err));
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
    setDoc(doc(firestoreDb, 'driverProfiles', profile.id), profile).catch(err => console.error('Firestore save driverProfile failed:', err));
  }

  public updateDriverProfile(id: string, updates: Partial<DriverProfile>) {
    if (!this.data.driverProfiles) this.data.driverProfiles = [];
    const idx = this.data.driverProfiles.findIndex(dp => dp.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.driverProfiles[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.driverProfiles[idx] = updated;
      setDoc(doc(firestoreDb, 'driverProfiles', id), updated, { merge: true }).catch(err => console.error('Firestore update driverProfile failed:', err));
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
    setDoc(doc(firestoreDb, 'users', user.id), user).catch(err => console.error('Firestore save user failed:', err));
  }

  public updateUser(id: string, updates: Partial<User>) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.users[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.users[idx] = updated;
      setDoc(doc(firestoreDb, 'users', id), updated, { merge: true }).catch(err => console.error('Firestore update user failed:', err));
    }
  }

  public deleteUser(id: string) {
    this.data.users = this.data.users.filter(u => u.id !== id);
    deleteDoc(doc(firestoreDb, 'users', id)).catch(err => console.error('Firestore delete user failed:', err));
  }

  public deleteFleetOwnerProfile(id: string) {
    this.data.fleetOwnerProfiles = this.data.fleetOwnerProfiles.filter(p => p.id !== id);
    deleteDoc(doc(firestoreDb, 'profiles', id)).catch(err => console.error('Firestore delete profile failed:', err));
  }

  public deleteDriverProfile(id: string) {
    if (!this.data.driverProfiles) this.data.driverProfiles = [];
    this.data.driverProfiles = this.data.driverProfiles.filter(dp => dp.id !== id);
    deleteDoc(doc(firestoreDb, 'driverProfiles', id)).catch(err => console.error('Firestore delete driverProfile failed:', err));
  }

  public deleteDriver(id: string) {
    this.data.drivers = this.data.drivers.filter(d => d.id !== id);
    deleteDoc(doc(firestoreDb, 'drivers', id)).catch(err => console.error('Firestore delete driver failed:', err));
  }

  public addProfile(profile: FleetOwnerProfile) {
    this.data.fleetOwnerProfiles.push(profile);
    setDoc(doc(firestoreDb, 'profiles', profile.id), profile).catch(err => console.error('Firestore save profile failed:', err));
  }

  public updateProfile(id: string, updates: Partial<FleetOwnerProfile>) {
    const idx = this.data.fleetOwnerProfiles.findIndex(p => p.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.fleetOwnerProfiles[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.fleetOwnerProfiles[idx] = updated;
      setDoc(doc(firestoreDb, 'profiles', id), updated, { merge: true }).catch(err => console.error('Firestore update profile failed:', err));
    }
  }

  public addDocument(docData: FleetOwnerDocument) {
    this.data.fleetOwnerDocuments.push(docData);
    setDoc(doc(firestoreDb, 'documents', docData.id), docData).catch(err => console.error('Firestore save document failed:', err));
  }

  public updateDocument(id: string, updates: Partial<FleetOwnerDocument>) {
    const idx = this.data.fleetOwnerDocuments.findIndex(d => d.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.fleetOwnerDocuments[idx], ...updates };
      this.data.fleetOwnerDocuments[idx] = updated;
      setDoc(doc(firestoreDb, 'documents', id), updated, { merge: true }).catch(err => console.error('Firestore update document failed:', err));
    }
  }

  public addDriver(driver: Driver) {
    this.data.drivers.push(driver);
    setDoc(doc(firestoreDb, 'drivers', driver.id), driver).catch(err => console.error('Firestore save driver failed:', err));
  }

  public updateDriver(id: string, updates: Partial<Driver>) {
    const idx = this.data.drivers.findIndex(d => d.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.drivers[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.drivers[idx] = updated;
      setDoc(doc(firestoreDb, 'drivers', id), updated, { merge: true }).catch(err => console.error('Firestore update driver failed:', err));
    }
  }

  public addComplaint(comp: Complaint) {
    this.data.complaints.push(comp);
    setDoc(doc(firestoreDb, 'complaints', comp.id), comp).catch(err => console.error('Firestore save complaint failed:', err));
  }

  public updateComplaint(id: string, updates: Partial<Complaint>) {
    const idx = this.data.complaints.findIndex(c => c.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.complaints[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.complaints[idx] = updated;
      setDoc(doc(firestoreDb, 'complaints', id), updated, { merge: true }).catch(err => console.error('Firestore update complaint failed:', err));
    }
  }

  public addEvidence(ev: ComplaintEvidence) {
    this.data.complaintEvidence.push(ev);
    setDoc(doc(firestoreDb, 'evidence', ev.id), ev).catch(err => console.error('Firestore save evidence failed:', err));
  }

  public addDispute(disp: DriverDispute) {
    this.data.driverDisputes.push(disp);
    setDoc(doc(firestoreDb, 'disputes', disp.id), disp).catch(err => console.error('Firestore save dispute failed:', err));
  }

  public updateDispute(id: string, updates: Partial<DriverDispute>) {
    const idx = this.data.driverDisputes.findIndex(d => d.id === id);
    if (idx !== -1) {
      const updated = { ...this.data.driverDisputes[idx], ...updates, updated_at: new Date().toISOString() };
      this.data.driverDisputes[idx] = updated;
      setDoc(doc(firestoreDb, 'disputes', id), updated, { merge: true }).catch(err => console.error('Firestore update dispute failed:', err));
    }
  }

  public addSimulatedEmail(email: any) {
    if (!this.data.simulatedEmails) this.data.simulatedEmails = [];
    this.data.simulatedEmails.unshift(email);
    setDoc(doc(firestoreDb, 'simulatedEmails', email.id), email).catch(err => console.error('Firestore save simulatedEmail failed:', err));
  }

  public logAudit(log: Omit<AuditLog, 'id' | 'created_at'>) {
    const newLog: AuditLog = {
      id: 'audit_' + Math.random().toString(36).substr(2, 9),
      ...log,
      created_at: new Date().toISOString()
    };
    this.data.auditLogs.unshift(newLog);
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs.pop();
    }
    setDoc(doc(firestoreDb, 'auditLogs', newLog.id), newLog).catch(err => console.error('Firestore save auditLog failed:', err));
  }

  public logSearch(log: Omit<SearchLog, 'id' | 'created_at'>) {
    const newLog: SearchLog = {
      id: 'search_' + Math.random().toString(36).substr(2, 9),
      ...log,
      created_at: new Date().toISOString()
    };
    this.data.searchLogs.unshift(newLog);
    if (this.data.searchLogs.length > 1000) {
      this.data.searchLogs.pop();
    }
    setDoc(doc(firestoreDb, 'searchLogs', newLog.id), newLog).catch(err => console.error('Firestore save searchLog failed:', err));
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
    deleteDoc(doc(firestoreDb, 'drivers', duplicateId)).catch(err => console.error('Firestore delete driver failed:', err));

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
    const driverComplaints = this.data.complaints.filter(c => c.driver_id === driverId && c.status === 'approved');
    
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
      const incidentDate = new Date(c.incident_date);
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
    
    setDoc(doc(firestoreDb, 'riskScores', newRiskScore.id), newRiskScore).catch(err => console.error('Firestore save riskScore failed:', err));
    return newRiskScore;
  }

  // Get masked or detailed driver profile depending on credentials
  public getMaskedDriver(driver: Driver, userRole: UserRole, isVerified: boolean): MaskedDriver {
    const risk = this.calculateDriverRiskScore(driver.id);
    const approvedComplaints = this.data.complaints.filter(c => c.driver_id === driver.id && c.status === 'approved');
    
    let lastIncidentDate: string | null = null;
    if (approvedComplaints.length > 0) {
      const dates = approvedComplaints.map(c => new Date(c.incident_date).getTime());
      lastIncidentDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
    }

    const hasDisputed = approvedComplaints.some(c => c.status === 'disputed') || 
      this.data.driverDisputes.some(d => d.status === 'under_review' && this.data.complaints.find(c => c.id === d.complaint_id)?.driver_id === driver.id);

    // Decrypt fields if authorized (Admins see everything, Verified Owners see mostly unmasked but with specific privacy controls, Public visitors see fully masked)
    const rawPhone = decrypt(driver.phone_encrypted);
    const rawEmail = decrypt(driver.email_encrypted);
    const rawIdNumber = decrypt(driver.id_number_encrypted);

    let phone_masked = '';
    let email_masked = '';
    let id_number_masked = '***';

    if (userRole === 'admin') {
      phone_masked = rawPhone;
      email_masked = rawEmail;
      id_number_masked = rawIdNumber;
    } else if (userRole === 'fleet_owner' && isVerified) {
      // Fleet owners can see partially unmasked to verify matches, but hide some digits for safety
      phone_masked = rawPhone.replace(/^(\+\d{1,3}|\d{1,4})?(\d{3})\d+(\d{4})$/, '$1 $2 *** $3');
      email_masked = rawEmail.replace(/^(.)(.*)(@.*)$/, (_, first, middle, rest) => first + '*'.repeat(middle.length) + rest);
      id_number_masked = rawIdNumber ? rawIdNumber.replace(/^(\d{4})\d+(\d{4})$/, '$1******$2') : '';
    } else {
      // Public / Unverified
      phone_masked = rawPhone ? '*** *** ' + rawPhone.slice(-4) : '***';
      email_masked = rawEmail ? rawEmail.charAt(0) + '***@' + rawEmail.split('@')[1] : '***';
      id_number_masked = '*********';
    }

    return {
      id: driver.id,
      first_name: driver.first_name,
      surname: driver.surname.charAt(0) + (userRole === 'public' ? '.' : driver.surname.slice(1)),
      phone_masked,
      email_masked,
      id_number_masked,
      platform: driver.platform,
      city: driver.city,
      province: driver.province,
      risk_level: risk.risk_level,
      risk_score: risk.score,
      risk_explanation: risk.explanation,
      approved_complaints_count: approvedComplaints.length,
      last_incident_date: lastIncidentDate,
      is_disputed: hasDisputed
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
      await setDoc(doc(firestoreDb, 'users', u.id), u);
    }

    console.log('[Firebase Engine] Initial seed uploaded to Firestore successfully.');
  }
}
