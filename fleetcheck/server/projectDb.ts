import * as fs from 'fs';
import * as path from 'path';
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
  Project,
  ProjectSlotTypeConfig,
  ProjectMember,
  ProjectMemberSlot,
  ProjectContributionSchedule,
  ProjectPayment,
  ProjectPaymentAllocation,
  ProjectGroupSummary,
  ProjectPenalty,
  ProjectVehicleBenefit,
  ProjectInsuranceRecord,
  ProjectSecurityIncident,
  ProjectMeeting,
  ProjectDocument,
  ProjectDispute,
  ProjectExitRecord,
  ProjectNotification,
  ProjectAuditLog,
  POPStatus,
  PenaltyType,
  SlotStatus,
  WeeklyObligationStatus,
  DepositStatus,
  SecurityIncidentStatus,
  DisputeStatus
} from '../src/types';
import type { LocalDatabase } from './db';

// Load Firebase configuration
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let config: any = {};
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Failed to parse firebase config in projectDb:', err);
  }
}

const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
const firestoreDb: Firestore = getFirestore(app, config.firestoreDatabaseId);

export interface ProjectDatabaseSchema {
  projects: Project[];
  projectSlotTypes: ProjectSlotTypeConfig[];
  projectMembers: ProjectMember[];
  projectMemberSlots: ProjectMemberSlot[];
  projectContributionSchedules: ProjectContributionSchedule[];
  projectPayments: ProjectPayment[];
  projectPaymentAllocations: ProjectPaymentAllocation[];
  projectGroupSummaries: ProjectGroupSummary[];
  projectPenalties: ProjectPenalty[];
  projectVehicleBenefits: ProjectVehicleBenefit[];
  projectInsuranceRecords: ProjectInsuranceRecord[];
  projectSecurityIncidents: ProjectSecurityIncident[];
  projectMeetings: ProjectMeeting[];
  projectDocuments: ProjectDocument[];
  projectDisputes: ProjectDispute[];
  projectExitRecords: ProjectExitRecord[];
  projectNotifications: ProjectNotification[];
  projectAuditLogs: ProjectAuditLog[];
}

export class ProjectDatabase {
  private data: ProjectDatabaseSchema;
  private coreDb?: LocalDatabase;

  constructor(coreDb?: LocalDatabase) {
    this.coreDb = coreDb;
    this.data = {
      projects: [],
      projectSlotTypes: [],
      projectMembers: [],
      projectMemberSlots: [],
      projectContributionSchedules: [],
      projectPayments: [],
      projectPaymentAllocations: [],
      projectGroupSummaries: [],
      projectPenalties: [],
      projectVehicleBenefits: [],
      projectInsuranceRecords: [],
      projectSecurityIncidents: [],
      projectMeetings: [],
      projectDocuments: [],
      projectDisputes: [],
      projectExitRecords: [],
      projectNotifications: [],
      projectAuditLogs: []
    };
    this.initFirebase();

    // Local-first seed: guarantee the demo Action Pack Project exists immediately,
    // even if Firestore's initial sync above (initFirebase's getDocs() loop) is slow
    // or never resolves (e.g. no network egress to Firestore). initFirebase() runs
    // async and only reaches its own getDocs()-driven "seed if empty" check after
    // every collection has synced, so without this, every dashboard that reads a
    // hardcoded project id would show "Project not found" until (or unless) that
    // completes. This call runs synchronously (seedActionPackProject no longer
    // awaits its Firestore writes - they're fire-and-forget, matching the rest of
    // this codebase's write pattern) and always finishes before initFirebase's own
    // first `await` can resolve, so when Firestore data does arrive it fully
    // overwrites this.data.projects with the authoritative list - no duplicate seed.
    if (this.data.projects.length === 0) {
      this.seedActionPackProject().catch(err => console.error('[Project Engine] Local seed failed:', err));
    }
  }

  private async initFirebase() {
    try {
      console.log('[Project Engine] Initializing Stokvel Project collections in Firestore...');
      
      const collections = [
        { name: 'projects', key: 'projects' },
        { name: 'projectSlotTypes', key: 'projectSlotTypes' },
        { name: 'projectMembers', key: 'projectMembers' },
        { name: 'projectMemberSlots', key: 'projectMemberSlots' },
        { name: 'projectContributionSchedules', key: 'projectContributionSchedules' },
        { name: 'projectPayments', key: 'projectPayments' },
        { name: 'projectPaymentAllocations', key: 'projectPaymentAllocations' },
        { name: 'projectGroupSummaries', key: 'projectGroupSummaries' },
        { name: 'projectPenalties', key: 'projectPenalties' },
        { name: 'projectVehicleBenefits', key: 'projectVehicleBenefits' },
        { name: 'projectInsuranceRecords', key: 'projectInsuranceRecords' },
        { name: 'projectSecurityIncidents', key: 'projectSecurityIncidents' },
        { name: 'projectMeetings', key: 'projectMeetings' },
        { name: 'projectDocuments', key: 'projectDocuments' },
        { name: 'projectDisputes', key: 'projectDisputes' },
        { name: 'projectExitRecords', key: 'projectExitRecords' },
        { name: 'projectNotifications', key: 'projectNotifications' },
        { name: 'projectAuditLogs', key: 'projectAuditLogs' }
      ];

      for (const col of collections) {
        const snap = await getDocs(collection(firestoreDb, col.name));
        const list: any[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        (this.data as any)[col.key] = list;
      }

      // Check if Action Pack Project is seeded
      if (this.data.projects.length === 0) {
        await this.seedActionPackProject();
      }

      this.setupLiveListeners();
      console.log('[Project Engine] Project database sync ready.');
    } catch (err) {
      console.error('[Project Engine] Initialization error:', err);
    }
  }

  private setupLiveListeners() {
    const collections = [
      { name: 'projects', key: 'projects' },
      { name: 'projectSlotTypes', key: 'projectSlotTypes' },
      { name: 'projectMembers', key: 'projectMembers' },
      { name: 'projectMemberSlots', key: 'projectMemberSlots' },
      { name: 'projectContributionSchedules', key: 'projectContributionSchedules' },
      { name: 'projectPayments', key: 'projectPayments' },
      { name: 'projectPaymentAllocations', key: 'projectPaymentAllocations' },
      { name: 'projectGroupSummaries', key: 'projectGroupSummaries' },
      { name: 'projectPenalties', key: 'projectPenalties' },
      { name: 'projectVehicleBenefits', key: 'projectVehicleBenefits' },
      { name: 'projectInsuranceRecords', key: 'projectInsuranceRecords' },
      { name: 'projectSecurityIncidents', key: 'projectSecurityIncidents' },
      { name: 'projectMeetings', key: 'projectMeetings' },
      { name: 'projectDocuments', key: 'projectDocuments' },
      { name: 'projectDisputes', key: 'projectDisputes' },
      { name: 'projectExitRecords', key: 'projectExitRecords' },
      { name: 'projectNotifications', key: 'projectNotifications' },
      { name: 'projectAuditLogs', key: 'projectAuditLogs' }
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
        },
        error => {
          console.error(`[Project Engine] Live Sync error on '${name}':`, error);
        }
      );
    });
  }

  // ==================== DATE & WEEK CALCULATIONS ====================

  public calculateEndDate(startDateStr: string, months: number = 15): string {
    const d = new Date(startDateStr);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  }

  public calculateTotalWeeks(startDateStr: string, endDateStr: string): number {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.round(diffDays / 7));
  }

  public calculateCurrentWeek(startDateStr: string, totalWeeks: number): {
    currentWeek: number;
    weeksCompleted: number;
    weeksRemaining: number;
    isStarted: boolean;
    isCompleted: boolean;
  } {
    const start = new Date(startDateStr);
    const now = new Date();
    
    if (now < start) {
      return {
        currentWeek: 0,
        weeksCompleted: 0,
        weeksRemaining: totalWeeks,
        isStarted: false,
        isCompleted: false
      };
    }

    const diffMs = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const weekNum = Math.min(totalWeeks, Math.floor(diffDays / 7) + 1);
    const completed = Math.min(totalWeeks, weekNum - 1);
    const remaining = Math.max(0, totalWeeks - completed);

    return {
      currentWeek: weekNum,
      weeksCompleted: completed,
      weeksRemaining: remaining,
      isStarted: true,
      isCompleted: completed >= totalWeeks
    };
  }

  // ==================== PROJECTS CRUD ====================

  public getProjects(user?: User): Project[] {
    const all = this.data.projects || [];
    if (!user || user.role === 'admin' || user.role === 'accountant') {
      return all;
    }
    // For members (driver / fleet owner), filter projects where they are assigned
    const memberProjectIds = new Set(
      (this.data.projectMembers || [])
        .filter(m => m.user_id === user.id)
        .map(m => m.project_id)
    );
    return all.filter(p => memberProjectIds.has(p.id));
  }

  public getProjectById(id: string): Project | undefined {
    const proj = (this.data.projects || []).find(p => p.id === id);
    if (!proj) return undefined;
    const slotTypes = (this.data.projectSlotTypes || []).filter(st => st.project_id === id);
    return { ...proj, slot_types: slotTypes };
  }

  public createProject(projectInput: Partial<Project>, actorUser: User): Project {
    const id = 'proj_' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const startDate = projectInput.start_date || now.split('T')[0];
    const durationMonths = projectInput.duration_months || 15;
    const endDate = projectInput.end_date || this.calculateEndDate(startDate, durationMonths);
    const totalWeeks = this.calculateTotalWeeks(startDate, endDate);

    const newProject: Project = {
      id,
      name: projectInput.name || 'Action Pack Project',
      description: projectInput.description || 'Vehicle Acquisition Stokvel Project',
      duration_months: durationMonths,
      start_date: startDate,
      end_date: endDate,
      deposit_deadline: projectInput.deposit_deadline || startDate,
      contribution_cycle: 'weekly',
      week_start_day: projectInput.week_start_day || 'Monday',
      total_weeks: totalWeeks,
      number_of_members: projectInput.number_of_members || 10,
      number_of_full_slots: projectInput.number_of_full_slots || 5,
      number_of_half_slots: projectInput.number_of_half_slots || 5,
      bank_name: projectInput.bank_name || 'Standard Bank',
      bank_account_name: projectInput.bank_account_name || 'Action Pack Stokvel Group',
      bank_account_number: projectInput.bank_account_number || '2718940192',
      branch_code: projectInput.branch_code || '051001',
      account_type: projectInput.account_type || 'Cheque/Current Account',
      payment_reference_instructions: projectInput.payment_reference_instructions || 'Use: [MEMBER_NAME]-[SLOT_NO]',
      status: projectInput.status || 'draft',
      notes: projectInput.notes || '',
      constitution_document_name: projectInput.constitution_document_name ?? null,
      constitution_document_data: projectInput.constitution_document_data ?? null,
      payout_order_locked: false,
      payout_order_locked_at: null,
      created_by: actorUser.id,
      created_at: now,
      updated_at: now
    };

    this.data.projects.push(newProject);
    setDoc(doc(firestoreDb, 'projects', id), newProject).catch(err => console.error('Firestore create project failed:', err));

    // Create default Slot Types: Full Slot & Half Slot
    const fullSlotType: ProjectSlotTypeConfig = {
      id: 'st_' + Math.random().toString(36).substr(2, 9),
      project_id: id,
      name: 'Full Slot',
      weekly_contribution: 3000,
      deposit_required: 10000,
      deposit_non_refundable: true,
      payout_amount: 300000,
      post_benefit_increase: 1000,
      default_threshold: 7000,
      active: true
    };

    const halfSlotType: ProjectSlotTypeConfig = {
      id: 'st_' + Math.random().toString(36).substr(2, 9),
      project_id: id,
      name: 'Half Slot',
      weekly_contribution: 1500,
      deposit_required: 5000,
      deposit_non_refundable: true,
      payout_amount: 150000,
      post_benefit_increase: 700,
      default_threshold: 3500,
      active: true
    };

    this.data.projectSlotTypes.push(fullSlotType, halfSlotType);
    setDoc(doc(firestoreDb, 'projectSlotTypes', fullSlotType.id), fullSlotType).catch(e => {});
    setDoc(doc(firestoreDb, 'projectSlotTypes', halfSlotType.id), halfSlotType).catch(e => {});

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: id,
      action: 'PROJECT_CREATED',
      entity_type: 'Project',
      entity_id: id,
      old_value: '',
      new_value: JSON.stringify({ name: newProject.name, status: newProject.status, duration: durationMonths }),
      ip_address: '127.0.0.1'
    });

    return { ...newProject, slot_types: [fullSlotType, halfSlotType] };
  }

  public updateProject(id: string, updates: Partial<Project>, actorUser: User): Project | null {
    const idx = this.data.projects.findIndex(p => p.id === id);
    if (idx === -1) return null;

    const old = this.data.projects[idx];
    const updated: Project = {
      ...old,
      ...updates,
      updated_at: new Date().toISOString()
    };

    // Recompute weeks if start or end date changed
    if (updates.start_date || updates.duration_months || updates.end_date) {
      const dur = updated.duration_months || 15;
      const start = updated.start_date;
      const end = updates.end_date || this.calculateEndDate(start, dur);
      updated.end_date = end;
      updated.total_weeks = this.calculateTotalWeeks(start, end);
    }

    this.data.projects[idx] = updated;
    setDoc(doc(firestoreDb, 'projects', id), updated, { merge: true }).catch(e => console.error('Firestore update project failed:', e));

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: id,
      action: 'PROJECT_UPDATED',
      entity_type: 'Project',
      entity_id: id,
      old_value: JSON.stringify({ status: old.status, name: old.name }),
      new_value: JSON.stringify({ status: updated.status, name: updated.name }),
      ip_address: '127.0.0.1'
    });

    return updated;
  }

  // ==================== PROJECT ACTIVATION & SCHEDULE GENERATION ====================

  public activateProject(projectId: string, actorUser: User): { success: boolean; message: string; project?: Project } {
    const project = this.getProjectById(projectId);
    if (!project) return { success: false, message: 'Project not found' };

    if (!project.start_date) return { success: false, message: 'Project start date is required' };
    if (!project.deposit_deadline) return { success: false, message: 'Deposit deadline is required' };
    if (!project.bank_account_number) return { success: false, message: 'Bank details must be configured' };

    const members = this.getProjectMembers(projectId);
    if (members.length === 0) return { success: false, message: 'Cannot activate project with no assigned members' };

    const slots = this.getProjectSlots(projectId);
    if (slots.length === 0) return { success: false, message: 'Cannot activate project with no allocated member slots' };

    // Check payout positions
    const unpositionedSlots = slots.filter(s => !s.payout_position || s.payout_position <= 0);
    if (unpositionedSlots.length > 0) {
      return { success: false, message: 'All slots must have an assigned payout position before activation' };
    }

    // Lock payout order
    this.lockPayoutOrder(projectId, actorUser);

    // Update project status to active
    project.status = 'active';
    project.payout_order_locked = true;
    project.payout_order_locked_at = new Date().toISOString();
    project.updated_at = new Date().toISOString();

    const idx = this.data.projects.findIndex(p => p.id === projectId);
    if (idx !== -1) {
      this.data.projects[idx] = project;
      setDoc(doc(firestoreDb, 'projects', projectId), project, { merge: true }).catch(e => {});
    }

    // Generate full weekly contribution obligations for every slot
    this.generateContributionSchedulesForProject(project);

    // Update all slot statuses to 'active' if deposit paid or pending
    slots.forEach(slot => {
      const newStatus: SlotStatus = slot.deposit_paid >= slot.deposit_required ? 'active' : 'pending_deposit';
      this.updateProjectMemberSlot(slot.id, { status: newStatus }, actorUser);
    });

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: projectId,
      action: 'PROJECT_ACTIVATED',
      entity_type: 'Project',
      entity_id: projectId,
      old_value: 'draft/pending_deposits',
      new_value: 'active',
      ip_address: '127.0.0.1',
      notes: `Activated project with ${members.length} members and ${slots.length} slots for ${project.total_weeks} weeks.`
    });

    // Notify all members
    members.forEach(m => {
      this.sendProjectNotification(
        m.user_id,
        `Project Activated: ${project.name}`,
        `The project "${project.name}" has officially been activated. Your weekly contribution schedule is now active.`,
        'success',
        projectId
      );
    });

    return { success: true, message: `Project activated successfully with ${project.total_weeks} weekly cycles.`, project };
  }

  public generateContributionSchedulesForProject(project: Project) {
    const slots = this.getProjectSlots(project.id);
    const totalWeeks = project.total_weeks;
    const startDate = new Date(project.start_date);

    // Remove old generated obligations if any
    this.data.projectContributionSchedules = this.data.projectContributionSchedules.filter(
      s => s.project_id !== project.id
    );

    const newSchedules: ProjectContributionSchedule[] = [];

    slots.forEach(slot => {
      for (let w = 1; w <= totalWeeks; w++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + (w - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const dueDate = new Date(weekEnd); // default due at end of week cycle

        const scheduleId = `sched_${slot.id}_w${w}`;
        const schedule: ProjectContributionSchedule = {
          id: scheduleId,
          project_id: project.id,
          slot_id: slot.id,
          user_id: slot.user_id,
          week_number: w,
          week_start_date: weekStart.toISOString().split('T')[0],
          week_end_date: weekEnd.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          expected_amount: slot.weekly_contribution,
          amount_paid: 0,
          outstanding_amount: slot.weekly_contribution,
          advance_credit_applied: 0,
          status: w === 1 ? 'due' : 'upcoming',
          penalty_applied: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        newSchedules.push(schedule);
        setDoc(doc(firestoreDb, 'projectContributionSchedules', scheduleId), schedule).catch(e => {});
      }
    });

    this.data.projectContributionSchedules.push(...newSchedules);
  }

  // ==================== MEMBERS & SLOTS ====================

  public getProjectMembers(projectId: string): ProjectMember[] {
    return (this.data.projectMembers || []).filter(m => m.project_id === projectId);
  }

  public addProjectMember(memberInput: Partial<ProjectMember>, actorUser: User): ProjectMember {
    const id = 'pmem_' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    const newMember: ProjectMember = {
      id,
      project_id: memberInput.project_id!,
      user_id: memberInput.user_id!,
      user_name: memberInput.user_name || 'Member',
      user_email: memberInput.user_email ?? null,
      user_phone: memberInput.user_phone ?? null,
      member_type: memberInput.member_type || 'driver',
      status: memberInput.status || 'pending_deposit',
      constitution_accepted: !!memberInput.constitution_accepted,
      constitution_accepted_at: memberInput.constitution_accepted ? now : null,
      signed_constitution_file: memberInput.signed_constitution_file || null,
      signed_constitution_file_name: memberInput.signed_constitution_file_name || null,
      id_document_file: memberInput.id_document_file || null,
      id_document_file_name: memberInput.id_document_file_name || null,
      next_of_kin_name: memberInput.next_of_kin_name || '',
      next_of_kin_phone: memberInput.next_of_kin_phone || '',
      next_of_kin_relationship: memberInput.next_of_kin_relationship || 'Spouse',
      notes: memberInput.notes || '',
      member_start_date: memberInput.member_start_date || now.split('T')[0],
      created_at: now,
      updated_at: now
    };

    this.data.projectMembers.push(newMember);
    setDoc(doc(firestoreDb, 'projectMembers', id), newMember).catch(e => console.error('Firestore save member error:', e));

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: memberInput.project_id,
      action: 'MEMBER_ASSIGNED',
      entity_type: 'ProjectMember',
      entity_id: id,
      old_value: '',
      new_value: JSON.stringify({ user: newMember.user_name, type: newMember.member_type }),
      ip_address: '127.0.0.1'
    });

    this.sendProjectNotification(
      newMember.user_id,
      'Assigned to Vehicle Stokvel Project',
      `You have been assigned as a member to the project. Please sign the constitution and complete your deposit.`,
      'info',
      memberInput.project_id
    );

    return newMember;
  }

  public updateProjectMember(id: string, updates: Partial<ProjectMember>, actorUser: User): ProjectMember | null {
    const idx = this.data.projectMembers.findIndex(m => m.id === id);
    if (idx === -1) return null;

    const old = this.data.projectMembers[idx];
    const updated: ProjectMember = {
      ...old,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.data.projectMembers[idx] = updated;
    setDoc(doc(firestoreDb, 'projectMembers', id), updated, { merge: true }).catch(e => {});

    return updated;
  }

  public getProjectSlots(projectId?: string, userId?: string): ProjectMemberSlot[] {
    let list = this.data.projectMemberSlots || [];
    if (projectId) list = list.filter(s => s.project_id === projectId);
    if (userId) list = list.filter(s => s.user_id === userId);
    return list;
  }

  public addProjectMemberSlot(slotInput: Partial<ProjectMemberSlot>, actorUser: User): ProjectMemberSlot {
    const id = 'pslot_' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    const isFullSlot = (slotInput.slot_type_name || '').toLowerCase().includes('full');
    const weeklyAmount = slotInput.weekly_contribution || (isFullSlot ? 3000 : 1500);
    const depositRequired = slotInput.deposit_required || (isFullSlot ? 10000 : 5000);
    const payoutAmount = slotInput.payout_amount || (isFullSlot ? 300000 : 150000);
    const postIncrease = slotInput.post_benefit_increase || (isFullSlot ? 1000 : 700);
    const defThreshold = slotInput.default_threshold || (isFullSlot ? 7000 : 3500);

    const newSlot: ProjectMemberSlot = {
      id,
      project_id: slotInput.project_id!,
      project_member_id: slotInput.project_member_id!,
      user_id: slotInput.user_id!,
      user_name: slotInput.user_name || 'Member',
      slot_type_id: slotInput.slot_type_id || (isFullSlot ? 'st_full' : 'st_half'),
      slot_type_name: slotInput.slot_type_name || (isFullSlot ? 'Full Slot' : 'Half Slot'),
      slot_number: slotInput.slot_number || 1,
      payout_position: slotInput.payout_position || 1,
      payout_order_locked: false,
      weekly_contribution: weeklyAmount,
      deposit_required: depositRequired,
      deposit_paid: slotInput.deposit_paid || 0,
      deposit_status: slotInput.deposit_paid && slotInput.deposit_paid >= depositRequired ? 'paid' : (slotInput.deposit_paid && slotInput.deposit_paid > 0 ? 'partially_paid' : 'not_paid'),
      payout_amount: payoutAmount,
      post_benefit_increase: postIncrease,
      default_threshold: defThreshold,
      benefit_received: false,
      benefit_received_date: null,
      grace_period_end_date: null,
      first_arrears_date: null,
      default_grace_period_end_date: null,
      current_weekly_contribution: weeklyAmount,
      status: 'pending_deposit',
      total_paid: slotInput.deposit_paid || 0,
      total_expected_to_date: 0,
      outstanding_amount: 0,
      advance_credit: 0,
      paid_ahead_weeks: 0,
      penalties_total: 0,
      penalties_unpaid: 0,
      created_at: now,
      updated_at: now
    };

    this.data.projectMemberSlots.push(newSlot);
    setDoc(doc(firestoreDb, 'projectMemberSlots', id), newSlot).catch(e => console.error('Firestore save slot error:', e));

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: slotInput.project_id,
      action: 'SLOT_ALLOCATED',
      entity_type: 'ProjectMemberSlot',
      entity_id: id,
      old_value: '',
      new_value: JSON.stringify({ type: newSlot.slot_type_name, position: newSlot.payout_position }),
      ip_address: '127.0.0.1'
    });

    return newSlot;
  }

  public updateProjectMemberSlot(id: string, updates: Partial<ProjectMemberSlot>, actorUser: User): ProjectMemberSlot | null {
    const idx = this.data.projectMemberSlots.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const old = this.data.projectMemberSlots[idx];
    const updated: ProjectMemberSlot = {
      ...old,
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.data.projectMemberSlots[idx] = updated;
    setDoc(doc(firestoreDb, 'projectMemberSlots', id), updated, { merge: true }).catch(e => {});

    return updated;
  }

  // ==================== PAYOUT ORDER LOCKING & OVERRIDES ====================

  public lockPayoutOrder(projectId: string, actorUser: User): boolean {
    const slots = this.getProjectSlots(projectId);
    slots.forEach(s => {
      s.payout_order_locked = true;
      s.updated_at = new Date().toISOString();
      setDoc(doc(firestoreDb, 'projectMemberSlots', s.id), s, { merge: true }).catch(e => {});
    });

    const project = this.getProjectById(projectId);
    if (project) {
      project.payout_order_locked = true;
      project.payout_order_locked_at = new Date().toISOString();
      setDoc(doc(firestoreDb, 'projects', projectId), project, { merge: true }).catch(e => {});
    }

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: projectId,
      action: 'PAYOUT_ORDER_LOCKED',
      entity_type: 'Project',
      entity_id: projectId,
      old_value: 'unlocked',
      new_value: 'locked',
      ip_address: '127.0.0.1',
      notes: 'Payout order successfully locked across all project member slots.'
    });

    return true;
  }

  public overridePayoutOrder(
    projectId: string,
    newOrder: { slot_id: string; payout_position: number }[],
    reason: string,
    actorUser: User
  ): { success: boolean; message: string } {
    if (actorUser.role !== 'admin') {
      return { success: false, message: 'Only Super Administrator can override locked payout order.' };
    }
    if (!reason || reason.trim().length < 5) {
      return { success: false, message: 'A mandatory, clear override justification reason is required.' };
    }

    newOrder.forEach(item => {
      const slot = this.data.projectMemberSlots.find(s => s.id === item.slot_id);
      if (slot) {
        const oldPos = slot.payout_position;
        slot.payout_position = item.payout_position;
        slot.updated_at = new Date().toISOString();
        setDoc(doc(firestoreDb, 'projectMemberSlots', slot.id), slot, { merge: true }).catch(e => {});

        this.logProjectAudit({
          user_id: actorUser.id,
          user_name: actorUser.name,
          user_role: actorUser.role,
          project_id: projectId,
          action: 'PAYOUT_ORDER_EMERGENCY_OVERRIDE',
          entity_type: 'ProjectMemberSlot',
          entity_id: slot.id,
          old_value: `Position: ${oldPos}`,
          new_value: `Position: ${item.payout_position}`,
          reason,
          ip_address: '127.0.0.1',
          notes: `Emergency payout order alteration by Admin. Reason: ${reason}`
        });
      }
    });

    return { success: true, message: 'Payout order emergency override applied and audited.' };
  }

  // ==================== PAYMENTS & PROOF OF PAYMENT REVIEW ====================

  public getPayments(projectId?: string, slotId?: string, userId?: string): ProjectPayment[] {
    let list = this.data.projectPayments || [];
    if (projectId) list = list.filter(p => p.project_id === projectId);
    if (slotId) list = list.filter(p => p.slot_id === slotId);
    if (userId) list = list.filter(p => p.user_id === userId);
    return list.sort((a, b) => new Date(b.payment_date || b.created_at).getTime() - new Date(a.payment_date || a.created_at).getTime());
  }

  public uploadPOP(paymentInput: Partial<ProjectPayment>, actorUser: User): ProjectPayment {
    const id = 'pay_' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();

    const newPayment: ProjectPayment = {
      id,
      project_id: paymentInput.project_id!,
      project_member_id: paymentInput.project_member_id ?? null,
      slot_id: paymentInput.slot_id ?? null,
      user_id: actorUser.id,
      user_name: actorUser.name,
      payment_type: paymentInput.payment_type || 'weekly_contribution',
      amount: Number(paymentInput.amount) || 0,
      payment_date: paymentInput.payment_date || now.split('T')[0],
      bank_reference: paymentInput.bank_reference || `POP-${now.slice(0, 10)}`,
      file_name: paymentInput.file_name ?? null,
      file_data: paymentInput.file_data ?? null,
      file_type: paymentInput.file_type ?? null,
      member_notes: paymentInput.member_notes || '',
      internal_notes: '',
      bank_statement_reference: '',
      status: 'pending_review',
      approved_by: null,
      approved_at: null,
      rejected_by: null,
      rejected_at: null,
      rejection_reason: null,
      created_at: now,
      updated_at: now
    };

    this.data.projectPayments.push(newPayment);
    setDoc(doc(firestoreDb, 'projectPayments', id), newPayment).catch(e => console.error('Firestore save POP error:', e));

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: paymentInput.project_id,
      action: 'POP_UPLOADED',
      entity_type: 'ProjectPayment',
      entity_id: id,
      old_value: '',
      new_value: JSON.stringify({ amount: newPayment.amount, type: newPayment.payment_type, ref: newPayment.bank_reference }),
      ip_address: '127.0.0.1'
    });

    return newPayment;
  }

  public reviewPOP(
    paymentId: string,
    status: POPStatus,
    reviewData: {
      rejection_reason?: string;
      internal_notes?: string;
      bank_statement_reference?: string;
      custom_allocations?: { type: string; amount: number; week_number?: number }[];
      override_reason?: string;
    },
    reviewerUser: User
  ): { success: boolean; message: string; payment?: ProjectPayment } {
    const payment = this.data.projectPayments.find(p => p.id === paymentId);
    if (!payment) return { success: false, message: 'Payment POP record not found' };

    const hasCustomAllocation = status === 'approved' && Array.isArray(reviewData.custom_allocations) && reviewData.custom_allocations.length > 0;

    // Validate the manual override up-front, before mutating anything, so a bad
    // request never leaves the payment in a half-updated state.
    if (hasCustomAllocation) {
      const allowedTypes = ['penalty', 'deposit', 'weekly_obligation', 'advance_credit', 'insurance', 'other'];
      const allocations = reviewData.custom_allocations!;

      if (!reviewData.override_reason || !reviewData.override_reason.trim()) {
        return { success: false, message: 'A reason is required to manually override the automatic payment allocation.' };
      }
      const invalidType = allocations.find(a => !allowedTypes.includes(a.type));
      if (invalidType) {
        return { success: false, message: `Invalid allocation type "${invalidType.type}".` };
      }
      const allocatedTotal = allocations.reduce((acc, a) => acc + (Number(a.amount) || 0), 0);
      if (Math.abs(allocatedTotal - payment.amount) > 0.01) {
        return {
          success: false,
          message: `Manual allocation total (R${allocatedTotal.toLocaleString()}) must equal the payment amount (R${payment.amount.toLocaleString()}).`
        };
      }
    }

    const oldStatus = payment.status;
    const now = new Date().toISOString();

    if (status === 'approved') {
      payment.status = 'approved';
      payment.approved_by = reviewerUser.name;
      payment.approved_at = now;
      payment.internal_notes = reviewData.internal_notes || payment.internal_notes;
      payment.bank_statement_reference = reviewData.bank_statement_reference || payment.bank_statement_reference;
      payment.updated_at = now;

      if (hasCustomAllocation) {
        this.applyCustomAllocation(payment, reviewData.custom_allocations!, reviewData.override_reason!.trim(), reviewerUser);

        this.logProjectAudit({
          user_id: reviewerUser.id,
          user_name: reviewerUser.name,
          user_role: reviewerUser.role,
          project_id: payment.project_id,
          action: 'POP_MANUAL_ALLOCATION_OVERRIDE',
          entity_type: 'ProjectPayment',
          entity_id: payment.id,
          old_value: 'automatic_waterfall',
          new_value: JSON.stringify(reviewData.custom_allocations),
          ip_address: '127.0.0.1',
          notes: `Reason: ${reviewData.override_reason!.trim()}`
        });
      } else {
        // Allocate payment using strict priority order
        this.allocateApprovedPayment(payment, reviewerUser);
      }

      // Recalculate member slot balances
      if (payment.slot_id) {
        this.recalculateSlotBalances(payment.slot_id);
      }

      this.sendProjectNotification(
        payment.user_id,
        'Proof of Payment Approved',
        `Your payment of R${payment.amount.toLocaleString()} (${payment.payment_type}) has been approved and allocated to your account.`,
        'success',
        payment.project_id
      );
    } else if (status === 'rejected') {
      payment.status = 'rejected';
      payment.rejected_by = reviewerUser.name;
      payment.rejected_at = now;
      payment.rejection_reason = reviewData.rejection_reason || 'Insufficient or unverified documentation';
      payment.internal_notes = reviewData.internal_notes || payment.internal_notes;
      payment.updated_at = now;

      this.sendProjectNotification(
        payment.user_id,
        'Proof of Payment Rejected',
        `Your POP of R${payment.amount.toLocaleString()} was rejected: ${payment.rejection_reason}. Please re-upload verified proof.`,
        'error',
        payment.project_id
      );
    } else {
      payment.status = status;
      payment.internal_notes = reviewData.internal_notes || payment.internal_notes;
      payment.updated_at = now;
    }

    setDoc(doc(firestoreDb, 'projectPayments', payment.id), payment, { merge: true }).catch(e => {});

    this.logProjectAudit({
      user_id: reviewerUser.id,
      user_name: reviewerUser.name,
      user_role: reviewerUser.role,
      project_id: payment.project_id,
      action: `POP_${status.toUpperCase()}`,
      entity_type: 'ProjectPayment',
      entity_id: payment.id,
      old_value: oldStatus,
      new_value: status,
      ip_address: '127.0.0.1',
      notes: reviewData.rejection_reason ? `Reason: ${reviewData.rejection_reason}` : undefined
    });

    return { success: true, message: `Payment POP status updated to ${status}`, payment };
  }

  // Strict Payment Allocation Priority:
  // 1. Outstanding penalties
  // 2. Outstanding deposit if project has not started or deposit is not fully paid
  // 3. Oldest unpaid weekly contribution
  // 4. Current weekly contribution
  // 5. Future weekly contributions as advance credit
  private allocateApprovedPayment(payment: ProjectPayment, actorUser: User) {
    let remainingAmount = payment.amount;
    const allocationSummaryParts: string[] = [];
    const slotId = payment.slot_id;

    if (!slotId) {
      payment.allocation_summary = `General Project Payment: R${payment.amount}`;
      return;
    }

    const slot = this.data.projectMemberSlots.find(s => s.id === slotId);
    if (!slot) return;

    // 1. Penalties
    const penalties = (this.data.projectPenalties || []).filter(
      p => p.slot_id === slotId && (p.status === 'applied' || p.status === 'partially_paid')
    );
    for (const penalty of penalties) {
      if (remainingAmount <= 0) break;
      const amountDue = penalty.penalty_amount;
      const allocate = Math.min(remainingAmount, amountDue);
      remainingAmount -= allocate;

      penalty.status = allocate >= amountDue ? 'paid' : 'partially_paid';
      penalty.updated_at = new Date().toISOString();
      setDoc(doc(firestoreDb, 'projectPenalties', penalty.id), penalty, { merge: true }).catch(e => {});

      this.recordAllocation(payment, slot, 'penalty', penalty.id, allocate);
      allocationSummaryParts.push(`Penalty (${penalty.penalty_type}): R${allocate}`);
    }

    // 2. Deposit (if payment is marked as deposit or deposit is not fully paid)
    if (payment.payment_type === 'deposit' || slot.deposit_paid < slot.deposit_required) {
      const depositDue = Math.max(0, slot.deposit_required - slot.deposit_paid);
      if (depositDue > 0 && remainingAmount > 0) {
        const allocate = Math.min(remainingAmount, depositDue);
        slot.deposit_paid += allocate;
        remainingAmount -= allocate;
        slot.deposit_status = slot.deposit_paid >= slot.deposit_required ? 'paid' : 'partially_paid';
        this.recordAllocation(payment, slot, 'deposit', undefined, allocate);
        allocationSummaryParts.push(`Deposit: R${allocate}`);
      }
    }

    // 3. Oldest Unpaid Weekly Contribution & Current Weekly Obligations
    const schedules = (this.data.projectContributionSchedules || [])
      .filter(s => s.slot_id === slotId && s.status !== 'paid')
      .sort((a, b) => a.week_number - b.week_number);

    for (const obligation of schedules) {
      if (remainingAmount <= 0) break;
      const needed = obligation.outstanding_amount;
      const allocate = Math.min(remainingAmount, needed);
      obligation.amount_paid += allocate;
      obligation.outstanding_amount -= allocate;
      remainingAmount -= allocate;

      if (obligation.outstanding_amount <= 0) {
        obligation.status = 'paid';
        allocationSummaryParts.push(`Week ${obligation.week_number} (Fully Paid): R${allocate}`);
      } else {
        obligation.status = 'partially_paid';
        allocationSummaryParts.push(`Week ${obligation.week_number} (Partial): R${allocate}`);
      }
      obligation.updated_at = new Date().toISOString();
      setDoc(doc(firestoreDb, 'projectContributionSchedules', obligation.id), obligation, { merge: true }).catch(e => {});
      this.recordAllocation(payment, slot, 'weekly_obligation', obligation.id, allocate, obligation.week_number);
    }

    // 4. Any leftover amount goes to Advance Credit
    if (remainingAmount > 0) {
      slot.advance_credit = (slot.advance_credit || 0) + remainingAmount;
      this.recordAllocation(payment, slot, 'advance_credit', undefined, remainingAmount);
      allocationSummaryParts.push(`Advance Credit: R${remainingAmount}`);
    }

    payment.allocation_summary = allocationSummaryParts.join(', ');
  }

  private recordAllocation(
    payment: ProjectPayment,
    slot: ProjectMemberSlot,
    allocationType: 'penalty' | 'deposit' | 'weekly_obligation' | 'advance_credit' | 'insurance' | 'other',
    targetId: string | undefined,
    amount: number,
    weekNumber?: number
  ) {
    if (!amount || amount <= 0) return;
    const id = 'palloc_' + Math.random().toString(36).substr(2, 9);
    const record: ProjectPaymentAllocation = {
      id,
      payment_id: payment.id,
      project_id: payment.project_id,
      slot_id: slot.id,
      allocation_type: allocationType,
      target_id: targetId ?? null,
      week_number: weekNumber ?? null,
      amount_allocated: amount,
      created_at: new Date().toISOString()
    };
    this.data.projectPaymentAllocations.push(record);
    setDoc(doc(firestoreDb, 'projectPaymentAllocations', id), record).catch(e => {});
  }

  public getPaymentAllocations(paymentId?: string, projectId?: string): ProjectPaymentAllocation[] {
    let list = this.data.projectPaymentAllocations || [];
    if (paymentId) list = list.filter(a => a.payment_id === paymentId);
    if (projectId) list = list.filter(a => a.project_id === projectId);
    return list;
  }

  // Manual allocation override: an accountant/admin can redirect an approved
  // payment's funds to specific buckets instead of the strict automatic waterfall
  // (e.g. a member explicitly paid a lump sum toward a future week rather than
  // clearing arrears first). A reason and a total matching the payment amount are
  // enforced by the caller (reviewPOP) before this runs.
  private applyCustomAllocation(
    payment: ProjectPayment,
    allocations: { type: string; amount: number; week_number?: number }[],
    overrideReason: string,
    actorUser: User
  ) {
    const slotId = payment.slot_id;
    const now = new Date().toISOString();

    if (!slotId) {
      payment.allocation_summary = `[MANUAL OVERRIDE - ${overrideReason}] General Project Payment: R${payment.amount}`;
      return;
    }

    const slot = this.data.projectMemberSlots.find(s => s.id === slotId);
    if (!slot) return;

    const allocationSummaryParts: string[] = [];

    for (const alloc of allocations) {
      let remaining = Number(alloc.amount) || 0;
      if (remaining <= 0) continue;

      if (alloc.type === 'penalty') {
        const penalties = (this.data.projectPenalties || []).filter(
          p => p.slot_id === slotId && (p.status === 'applied' || p.status === 'partially_paid')
        );
        for (const penalty of penalties) {
          if (remaining <= 0) break;
          const amountDue = penalty.penalty_amount;
          const applyAmt = Math.min(remaining, amountDue);
          remaining -= applyAmt;
          penalty.status = applyAmt >= amountDue ? 'paid' : 'partially_paid';
          penalty.updated_at = now;
          setDoc(doc(firestoreDb, 'projectPenalties', penalty.id), penalty, { merge: true }).catch(e => {});
          this.recordAllocation(payment, slot, 'penalty', penalty.id, applyAmt);
          allocationSummaryParts.push(`[Manual] Penalty (${penalty.penalty_type}): R${applyAmt}`);
        }
        if (remaining > 0) {
          slot.advance_credit = (slot.advance_credit || 0) + remaining;
          this.recordAllocation(payment, slot, 'advance_credit', undefined, remaining);
          allocationSummaryParts.push(`[Manual] Penalty allocation excess -> Advance Credit: R${remaining}`);
          remaining = 0;
        }
      } else if (alloc.type === 'deposit') {
        slot.deposit_paid += remaining;
        slot.deposit_status = slot.deposit_paid >= slot.deposit_required ? 'paid' : 'partially_paid';
        this.recordAllocation(payment, slot, 'deposit', undefined, remaining);
        allocationSummaryParts.push(`[Manual] Deposit: R${remaining}`);
        remaining = 0;
      } else if (alloc.type === 'weekly_obligation') {
        let schedules = (this.data.projectContributionSchedules || []).filter(
          s => s.slot_id === slotId && s.status !== 'paid'
        );
        if (alloc.week_number) {
          schedules = schedules.filter(s => s.week_number === alloc.week_number);
        }
        schedules = schedules.sort((a, b) => a.week_number - b.week_number);

        for (const obligation of schedules) {
          if (remaining <= 0) break;
          const needed = obligation.outstanding_amount;
          const applyAmt = Math.min(remaining, needed);
          obligation.amount_paid += applyAmt;
          obligation.outstanding_amount -= applyAmt;
          remaining -= applyAmt;
          obligation.status = obligation.outstanding_amount <= 0 ? 'paid' : 'partially_paid';
          obligation.updated_at = now;
          setDoc(doc(firestoreDb, 'projectContributionSchedules', obligation.id), obligation, { merge: true }).catch(e => {});
          this.recordAllocation(payment, slot, 'weekly_obligation', obligation.id, applyAmt, obligation.week_number);
          allocationSummaryParts.push(`[Manual] Week ${obligation.week_number}: R${applyAmt}`);
        }
        if (remaining > 0) {
          // Specified week already covered or no matching schedule found - park excess as advance credit
          // rather than silently discarding it.
          slot.advance_credit = (slot.advance_credit || 0) + remaining;
          this.recordAllocation(payment, slot, 'advance_credit', undefined, remaining);
          allocationSummaryParts.push(`[Manual] Weekly allocation excess -> Advance Credit: R${remaining}`);
          remaining = 0;
        }
      } else if (alloc.type === 'advance_credit') {
        slot.advance_credit = (slot.advance_credit || 0) + remaining;
        this.recordAllocation(payment, slot, 'advance_credit', undefined, remaining);
        allocationSummaryParts.push(`[Manual] Advance Credit: R${remaining}`);
        remaining = 0;
      } else {
        // insurance / other - tracked in the allocation ledger but does not mutate slot balances directly.
        this.recordAllocation(payment, slot, alloc.type === 'insurance' ? 'insurance' : 'other', undefined, remaining);
        allocationSummaryParts.push(`[Manual] ${alloc.type}: R${remaining}`);
        remaining = 0;
      }
    }

    slot.updated_at = now;
    setDoc(doc(firestoreDb, 'projectMemberSlots', slot.id), slot, { merge: true }).catch(e => {});

    payment.allocation_summary = `[MANUAL OVERRIDE - ${overrideReason}] ` + allocationSummaryParts.join(', ');
  }

  // ==================== RECALCULATE MEMBER BALANCES ====================

  public recalculateSlotBalances(slotId: string) {
    const slot = this.data.projectMemberSlots.find(s => s.id === slotId);
    if (!slot) return;

    const schedules = (this.data.projectContributionSchedules || []).filter(s => s.slot_id === slotId);
    const approvedPayments = (this.data.projectPayments || []).filter(p => p.slot_id === slotId && p.status === 'approved');
    const penalties = (this.data.projectPenalties || []).filter(p => p.slot_id === slotId);

    const totalPaid = approvedPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    
    // Total expected to date based on passed weeks
    const project = this.getProjectById(slot.project_id);
    let totalExpectedToDate = 0;
    let weeksPassed = 0;
    if (project && project.start_date) {
      const { currentWeek } = this.calculateCurrentWeek(project.start_date, project.total_weeks);
      weeksPassed = currentWeek;
      const passedSchedules = schedules.filter(s => s.week_number <= weeksPassed);
      totalExpectedToDate = passedSchedules.reduce((acc, s) => acc + s.expected_amount, 0);
    }

    const totalOutstanding = schedules.reduce((acc, s) => acc + (s.outstanding_amount || 0), 0);
    const penaltiesTotal = penalties.reduce((acc, p) => acc + p.penalty_amount, 0);
    const penaltiesUnpaid = penalties.filter(p => p.status !== 'paid' && p.status !== 'waived').reduce((acc, p) => acc + p.penalty_amount, 0);

    // Paid ahead weeks calculation
    const fullyPaidWeeksCount = schedules.filter(s => s.status === 'paid').length;
    const paidAheadWeeks = Math.max(0, fullyPaidWeeksCount - weeksPassed);

    slot.total_paid = totalPaid;
    slot.total_expected_to_date = totalExpectedToDate;
    slot.outstanding_amount = totalOutstanding;
    slot.paid_ahead_weeks = paidAheadWeeks;
    slot.penalties_total = penaltiesTotal;
    slot.penalties_unpaid = penaltiesUnpaid;

    // Arrears & default-threshold logic. A slot that breaches its default_threshold
    // is never immediately escalated to dismissal_review - it first enters a
    // 'default_risk' status with a 7-day grace period during which the member,
    // accountant and admin are all notified so the member can settle the balance.
    // Only if the balance is still above the threshold once the grace period has
    // expired does the slot escalate to 'dismissal_review' (a manual-review status
    // requiring an admin decision - the system never auto-dismisses a member).
    const previousStatus = slot.status;
    const DEFAULT_GRACE_PERIOD_DAYS = 7;
    const nowIso = new Date().toISOString();

    if (totalOutstanding > slot.default_threshold) {
      if (!slot.default_grace_period_end_date) {
        // First time this arrears episode has crossed the threshold - start the grace period.
        const graceEnd = new Date();
        graceEnd.setDate(graceEnd.getDate() + DEFAULT_GRACE_PERIOD_DAYS);
        slot.first_arrears_date = nowIso.split('T')[0];
        slot.default_grace_period_end_date = graceEnd.toISOString().split('T')[0];
        slot.status = 'default_risk';

        this.sendProjectNotification(
          slot.user_id,
          'Account In Default Risk',
          `Your outstanding balance of R${totalOutstanding.toLocaleString()} exceeds the default threshold of R${slot.default_threshold.toLocaleString()}. You have ${DEFAULT_GRACE_PERIOD_DAYS} days (until ${slot.default_grace_period_end_date}) to settle this balance before your account is escalated for dismissal review.`,
          'warning',
          slot.project_id
        );
        this.notifyStaff(
          'Member Entered Default Risk',
          `${slot.user_name || 'A member'} (slot ${slot.id}) is now in default risk with an outstanding balance of R${totalOutstanding.toLocaleString()}. Grace period ends ${slot.default_grace_period_end_date}.`,
          'warning',
          slot.project_id
        );
      } else if (new Date() > new Date(slot.default_grace_period_end_date)) {
        // Grace period has expired and the balance is still unsettled - escalate for manual admin review.
        slot.status = 'dismissal_review';
        if (previousStatus !== 'dismissal_review') {
          this.sendProjectNotification(
            slot.user_id,
            'Account Escalated For Dismissal Review',
            `Your grace period to settle the outstanding balance of R${totalOutstanding.toLocaleString()} has expired. Your account has been escalated for admin review.`,
            'error',
            slot.project_id
          );
          this.notifyStaff(
            'Member Escalated To Dismissal Review',
            `${slot.user_name || 'A member'} (slot ${slot.id}) has an unresolved default of R${totalOutstanding.toLocaleString()} after their grace period expired on ${slot.default_grace_period_end_date}. Admin review required.`,
            'error',
            slot.project_id
          );
        }
      } else {
        // Still within the grace period - remain in default_risk without re-notifying every recalculation.
        slot.status = 'default_risk';
      }
    } else if (totalOutstanding > 0) {
      // Outstanding but below the default threshold - simple arrears, clear any grace-period tracking.
      slot.first_arrears_date = null;
      slot.default_grace_period_end_date = null;
      slot.status = 'in_arrears';
    } else if (paidAheadWeeks > 0) {
      slot.first_arrears_date = null;
      slot.default_grace_period_end_date = null;
      slot.status = 'paid_ahead';
    } else {
      slot.first_arrears_date = null;
      slot.default_grace_period_end_date = null;
      slot.status = slot.deposit_paid >= slot.deposit_required ? 'active' : 'pending_deposit';
    }

    slot.updated_at = new Date().toISOString();
    setDoc(doc(firestoreDb, 'projectMemberSlots', slot.id), slot, { merge: true }).catch(e => {});
  }

  // ==================== GROUP TOTALS / PUBLISHER ====================

  public calculateGroupSummary(projectId: string): ProjectGroupSummary {
    const project = this.getProjectById(projectId);
    const members = this.getProjectMembers(projectId);
    const slots = this.getProjectSlots(projectId);
    const payments = this.getPayments(projectId).filter(p => p.status === 'approved');
    const penalties = (this.data.projectPenalties || []).filter(p => p.project_id === projectId);

    const fullSlots = slots.filter(s => s.slot_type_name.toLowerCase().includes('full'));
    const halfSlots = slots.filter(s => s.slot_type_name.toLowerCase().includes('half'));

    const totalTarget = slots.reduce((acc, s) => acc + s.payout_amount, 0);
    const totalDepositsCollected = slots.reduce((acc, s) => acc + s.deposit_paid, 0);
    const totalPenaltiesCollected = penalties.filter(p => p.status === 'paid').reduce((acc, p) => acc + p.penalty_amount, 0);
    const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalExpectedToDate = slots.reduce((acc, s) => acc + (s.total_expected_to_date || 0), 0);
    const totalOutstanding = slots.reduce((acc, s) => acc + (s.outstanding_amount || 0), 0);

    const upToDateCount = slots.filter(s => s.outstanding_amount === 0).length;
    const inArrearsCount = slots.filter(s => s.outstanding_amount > 0).length;
    const paidAheadCount = slots.filter(s => s.paid_ahead_weeks > 0).length;

    // Next payout position
    const sortedPositions = slots.map(s => s.payout_position).filter(Boolean).sort((a, b) => a - b);
    const nextPayout = sortedPositions.length > 0 ? sortedPositions[0] : 1;

    const completionPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalCollected / totalTarget) * 100)) : 0;

    return {
      id: 'gsum_' + projectId,
      project_id: projectId,
      total_project_target: totalTarget,
      total_expected_to_date: totalExpectedToDate,
      total_collected: totalCollected,
      total_outstanding: totalOutstanding,
      total_deposits_collected: totalDepositsCollected,
      total_penalties_collected: totalPenaltiesCollected,
      number_of_members: members.length,
      number_of_slots: slots.length,
      full_slots_count: fullSlots.length,
      half_slots_count: halfSlots.length,
      members_up_to_date_count: upToDateCount,
      members_in_arrears_count: inArrearsCount,
      members_paid_ahead_count: paidAheadCount,
      next_payout_position: nextPayout,
      project_completion_percentage: completionPercentage,
      notes_to_members: 'Latest group summary validated and published by finance administration.',
      published: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  public publishGroupSummary(projectId: string, notes: string, actorUser: User): ProjectGroupSummary {
    const summary = this.calculateGroupSummary(projectId);
    summary.published = true;
    summary.published_by = actorUser.name;
    summary.published_at = new Date().toISOString();
    summary.notes_to_members = notes || summary.notes_to_members;

    const idx = this.data.projectGroupSummaries.findIndex(g => g.project_id === projectId);
    if (idx !== -1) {
      this.data.projectGroupSummaries[idx] = summary;
    } else {
      this.data.projectGroupSummaries.push(summary);
    }

    setDoc(doc(firestoreDb, 'projectGroupSummaries', summary.id), summary).catch(e => {});

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: projectId,
      action: 'GROUP_SUMMARY_PUBLISHED',
      entity_type: 'ProjectGroupSummary',
      entity_id: summary.id,
      old_value: 'unpublished',
      new_value: `Collected: R${summary.total_collected}, Target: R${summary.total_project_target}`,
      ip_address: '127.0.0.1',
      notes: summary.notes_to_members
    });

    // Send broadcast notification to members
    const members = this.getProjectMembers(projectId);
    members.forEach(m => {
      this.sendProjectNotification(
        m.user_id,
        'Group Financial Summary Updated',
        `Finance Administration has published the latest project financial summary. Total collected: R${summary.total_collected.toLocaleString()}`,
        'info',
        projectId
      );
    });

    return summary;
  }

  public getPublishedGroupSummary(projectId: string): ProjectGroupSummary | undefined {
    return (this.data.projectGroupSummaries || []).find(g => g.project_id === projectId && g.published);
  }

  // ==================== VEHICLE BENEFIT WORKFLOW ====================

  public getVehicleBenefits(projectId?: string): ProjectVehicleBenefit[] {
    let list = this.data.projectVehicleBenefits || [];
    if (projectId) list = list.filter(v => v.project_id === projectId);
    return list;
  }

  public createOrUpdateVehicleBenefit(benefitInput: Partial<ProjectVehicleBenefit>, actorUser: User): ProjectVehicleBenefit {
    const now = new Date().toISOString();
    let benefit: ProjectVehicleBenefit;

    if (benefitInput.id) {
      const idx = this.data.projectVehicleBenefits.findIndex(b => b.id === benefitInput.id);
      benefit = {
        ...this.data.projectVehicleBenefits[idx],
        ...benefitInput,
        updated_at: now
      };
      this.data.projectVehicleBenefits[idx] = benefit;
    } else {
      const id = 'vben_' + Math.random().toString(36).substr(2, 9);
      benefit = {
        id,
        project_id: benefitInput.project_id!,
        slot_id: benefitInput.slot_id!,
        user_id: benefitInput.user_id!,
        user_name: benefitInput.user_name || 'Member',
        payout_position: benefitInput.payout_position || 1,
        payout_amount: benefitInput.payout_amount || 300000,
        benefit_due_date: benefitInput.benefit_due_date || now.split('T')[0],
        vehicle_make: benefitInput.vehicle_make || '',
        vehicle_model: benefitInput.vehicle_model || '',
        vehicle_year: benefitInput.vehicle_year || '2023',
        vin: benefitInput.vin || '',
        registration_number: benefitInput.registration_number || '',
        purchase_price: benefitInput.purchase_price || 0,
        seller_dealer_name: benefitInput.seller_dealer_name || '',
        tracker_installed: !!benefitInput.tracker_installed,
        tracker_provider: benefitInput.tracker_provider || 'Cartrack',
        tracker_reference: benefitInput.tracker_reference || '',
        insurance_confirmed: !!benefitInput.insurance_confirmed,
        member_approved_costs: !!benefitInput.member_approved_costs,
        member_present_during_purchase: !!benefitInput.member_present_during_purchase,
        admin_notes: benefitInput.admin_notes || '',
        status: benefitInput.status || 'in_progress',
        created_at: now,
        updated_at: now
      };
      this.data.projectVehicleBenefits.push(benefit);
    }

    setDoc(doc(firestoreDb, 'projectVehicleBenefits', benefit.id), benefit, { merge: true }).catch(e => {});

    // If benefit is assigned / completed, trigger grace period and post-benefit increase
    if (benefit.status === 'completed' || benefit.status === 'assigned') {
      this.handleBenefitReceivedTrigger(benefit, actorUser);
    }

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: benefit.project_id,
      action: 'VEHICLE_BENEFIT_UPDATED',
      entity_type: 'ProjectVehicleBenefit',
      entity_id: benefit.id,
      old_value: '',
      new_value: JSON.stringify({ vehicle: `${benefit.vehicle_make} ${benefit.vehicle_model}`, status: benefit.status }),
      ip_address: '127.0.0.1'
    });

    return benefit;
  }

  private handleBenefitReceivedTrigger(benefit: ProjectVehicleBenefit, actorUser: User, gracePeriodDays: number = 7) {
    const slot = this.data.projectMemberSlots.find(s => s.id === benefit.slot_id);
    if (!slot) return;

    const now = new Date();
    const graceEnd = new Date(now);
    graceEnd.setDate(now.getDate() + gracePeriodDays); // grace period before post-benefit rate enforcement

    slot.benefit_received = true;
    slot.benefit_received_date = now.toISOString().split('T')[0];
    slot.grace_period_end_date = graceEnd.toISOString().split('T')[0];
    slot.status = 'benefit_received';
    
    // Post-benefit weekly increase calculation:
    // Full Slot: R3,000 + R1,000 = R4,000
    // Half Slot: R1,500 + R700 = R2,200
    const newWeekly = slot.weekly_contribution + slot.post_benefit_increase;
    slot.current_weekly_contribution = newWeekly;
    slot.updated_at = new Date().toISOString();

    setDoc(doc(firestoreDb, 'projectMemberSlots', slot.id), slot, { merge: true }).catch(e => {});

    // Update all future unpaid obligations
    const futureSchedules = (this.data.projectContributionSchedules || []).filter(
      s => s.slot_id === slot.id && s.status !== 'paid'
    );

    futureSchedules.forEach(s => {
      s.expected_amount = newWeekly;
      s.outstanding_amount = Math.max(0, newWeekly - s.amount_paid);
      s.notes = `Post-benefit rate applied (+R${slot.post_benefit_increase}/wk)`;
      s.updated_at = new Date().toISOString();
      setDoc(doc(firestoreDb, 'projectContributionSchedules', s.id), s, { merge: true }).catch(e => {});
    });

    this.sendProjectNotification(
      slot.user_id,
      'Vehicle Handover Complete',
      `Congratulations! Vehicle handover is complete. A ${gracePeriodDays}-day grace period has begun. Starting next cycle, your weekly contribution updates to R${newWeekly.toLocaleString()}.`,
      'success',
      slot.project_id
    );
  }

  /**
   * Executes a formal vehicle handover for a benefit record that has already been
   * created/updated via createOrUpdateVehicleBenefit. Distinct from that generic
   * update path so the admin can supply a custom grace period and handover notes,
   * and so the handover event itself is separately audit-logged.
   */
  public executeVehicleHandover(
    benefitId: string,
    actorUser: User,
    gracePeriodDays: number = 7,
    handoverNotes?: string
  ): ProjectVehicleBenefit {
    const idx = this.data.projectVehicleBenefits.findIndex(b => b.id === benefitId);
    if (idx === -1) throw new Error('Vehicle benefit record not found');

    const now = new Date().toISOString();
    const benefit = this.data.projectVehicleBenefits[idx];
    const combinedNotes = handoverNotes
      ? `${benefit.admin_notes ? benefit.admin_notes + '\n' : ''}${now}: ${handoverNotes}`
      : benefit.admin_notes;

    const updated: ProjectVehicleBenefit = {
      ...benefit,
      status: 'completed',
      admin_notes: combinedNotes,
      updated_at: now
    };
    this.data.projectVehicleBenefits[idx] = updated;

    setDoc(doc(firestoreDb, 'projectVehicleBenefits', updated.id), updated, { merge: true }).catch(e => {});

    this.handleBenefitReceivedTrigger(updated, actorUser, gracePeriodDays);

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: updated.project_id,
      action: 'VEHICLE_HANDOVER_EXECUTED',
      entity_type: 'ProjectVehicleBenefit',
      entity_id: updated.id,
      old_value: '',
      new_value: JSON.stringify({ grace_period_days: gracePeriodDays, handover_notes: handoverNotes || '' }),
      ip_address: '127.0.0.1'
    });

    return updated;
  }

  // ==================== PENALTIES ====================

  public getPenalties(projectId?: string, userId?: string): ProjectPenalty[] {
    let list = this.data.projectPenalties || [];
    if (projectId) list = list.filter(p => p.project_id === projectId);
    if (userId) list = list.filter(p => p.user_id === userId);
    return list;
  }

  public applyPenalty(penaltyInput: Partial<ProjectPenalty>, actorUser: User): ProjectPenalty {
    const id = 'pen_' + Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const newPenalty: ProjectPenalty = {
      id,
      project_id: penaltyInput.project_id!,
      user_id: penaltyInput.user_id!,
      user_name: penaltyInput.user_name || 'Member',
      slot_id: penaltyInput.slot_id ?? null,
      penalty_type: penaltyInput.penalty_type || 'late_weekly_payment',
      penalty_amount: Number(penaltyInput.penalty_amount) || 900,
      penalty_percentage: penaltyInput.penalty_percentage || 30,
      reason: penaltyInput.reason || 'Late weekly payment fee (30%)',
      linked_week_number: penaltyInput.linked_week_number ?? null,
      applied_by: actorUser.name,
      applied_date: now.split('T')[0],
      due_date: penaltyInput.due_date || dueDate.toISOString().split('T')[0],
      status: 'applied',
      created_at: now,
      updated_at: now
    };

    this.data.projectPenalties.push(newPenalty);
    setDoc(doc(firestoreDb, 'projectPenalties', id), newPenalty).catch(e => {});

    if (newPenalty.slot_id) {
      this.recalculateSlotBalances(newPenalty.slot_id);
    }

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: newPenalty.project_id,
      action: 'PENALTY_APPLIED',
      entity_type: 'ProjectPenalty',
      entity_id: id,
      old_value: '',
      new_value: `R${newPenalty.penalty_amount} (${newPenalty.penalty_type})`,
      ip_address: '127.0.0.1',
      reason: newPenalty.reason
    });

    this.sendProjectNotification(
      newPenalty.user_id,
      'Penalty Applied to Account',
      `A penalty of R${newPenalty.penalty_amount.toLocaleString()} was applied: ${newPenalty.reason}. Due date: ${newPenalty.due_date}`,
      'warning',
      newPenalty.project_id
    );

    return newPenalty;
  }

  public waivePenalty(penaltyId: string, waiverReason: string, actorUser: User): boolean {
    const penalty = this.data.projectPenalties.find(p => p.id === penaltyId);
    if (!penalty) return false;

    penalty.status = 'waived';
    penalty.waived_by = actorUser.name;
    penalty.waiver_reason = waiverReason;
    penalty.updated_at = new Date().toISOString();

    setDoc(doc(firestoreDb, 'projectPenalties', penalty.id), penalty, { merge: true }).catch(e => {});

    if (penalty.slot_id) {
      this.recalculateSlotBalances(penalty.slot_id);
    }

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: penalty.project_id,
      action: 'PENALTY_WAIVED',
      entity_type: 'ProjectPenalty',
      entity_id: penaltyId,
      old_value: 'applied',
      new_value: 'waived',
      reason: waiverReason,
      ip_address: '127.0.0.1'
    });

    return true;
  }

  // ==================== INSURANCE, SECURITY & MEETINGS ====================

  public getInsuranceRecords(projectId?: string): ProjectInsuranceRecord[] {
    let list = this.data.projectInsuranceRecords || [];
    if (projectId) list = list.filter(i => i.project_id === projectId);
    return list;
  }

  public saveInsuranceRecord(record: Partial<ProjectInsuranceRecord>, actorUser: User): ProjectInsuranceRecord {
    const now = new Date().toISOString();
    const id = record.id || 'ins_' + Math.random().toString(36).substr(2, 9);
    const newRecord: ProjectInsuranceRecord = {
      id,
      project_id: record.project_id!,
      vehicle_benefit_id: record.vehicle_benefit_id ?? null,
      slot_id: record.slot_id ?? null,
      user_id: record.user_id!,
      user_name: record.user_name || 'Member',
      vehicle_reg: record.vehicle_reg || '',
      policy_provider: record.policy_provider || 'Santam Fleet Insurance',
      policy_number: record.policy_number || `POL-${Math.floor(100000 + Math.random() * 900000)}`,
      monthly_premium: record.monthly_premium || 1850,
      premium_due_day: record.premium_due_day || 15,
      premium_amount: record.premium_amount || 1850,
      payment_status: record.payment_status || 'active',
      late_penalty_applied: !!record.late_penalty_applied,
      claim_status: record.claim_status || 'none',
      notes: record.notes || '',
      created_at: now,
      updated_at: now
    };

    const idx = this.data.projectInsuranceRecords.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.data.projectInsuranceRecords[idx] = newRecord;
    } else {
      this.data.projectInsuranceRecords.push(newRecord);
    }

    setDoc(doc(firestoreDb, 'projectInsuranceRecords', id), newRecord).catch(e => {});
    return newRecord;
  }

  public getMeetings(projectId?: string): ProjectMeeting[] {
    let list = this.data.projectMeetings || [];
    if (projectId) list = list.filter(m => m.project_id === projectId);
    return list.sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());
  }

  public saveMeeting(meeting: Partial<ProjectMeeting>, actorUser: User): ProjectMeeting {
    const now = new Date().toISOString();
    const id = meeting.id || 'meet_' + Math.random().toString(36).substr(2, 9);
    const newMeeting: ProjectMeeting = {
      id,
      project_id: meeting.project_id!,
      title: meeting.title || 'Compulsory Project Assembly',
      meeting_date: meeting.meeting_date || now,
      location_or_link: meeting.location_or_link || 'Action Pack HQ / Google Meet',
      agenda: meeting.agenda || 'Weekly project status review & payout order validation',
      minutes: meeting.minutes || '',
      created_by: actorUser.name,
      attendance_required: true,
      created_at: now,
      updated_at: now,
      attendees: meeting.attendees || []
    };

    const idx = this.data.projectMeetings.findIndex(m => m.id === id);
    if (idx !== -1) {
      this.data.projectMeetings[idx] = newMeeting;
    } else {
      this.data.projectMeetings.push(newMeeting);
    }

    setDoc(doc(firestoreDb, 'projectMeetings', id), newMeeting).catch(e => {});
    return newMeeting;
  }

  // ==================== SECURITY INCIDENTS ====================

  public getSecurityIncidents(projectId?: string): ProjectSecurityIncident[] {
    let list = this.data.projectSecurityIncidents || [];
    if (projectId) list = list.filter(i => i.project_id === projectId);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public reportSecurityIncident(input: Partial<ProjectSecurityIncident>, actorUser: User): ProjectSecurityIncident {
    const now = new Date().toISOString();
    const id = 'sec_' + Math.random().toString(36).substr(2, 9);
    const incident: ProjectSecurityIncident = {
      id,
      project_id: input.project_id!,
      vehicle_benefit_id: input.vehicle_benefit_id ?? null,
      user_id: input.user_id!,
      user_name: input.user_name || 'Member',
      vehicle_reg: input.vehicle_reg || '',
      incident_type: input.incident_type || 'other',
      description: input.description || '',
      evidence_file: input.evidence_file || null,
      reported_by: actorUser.name,
      status: 'reported',
      penalty_applied: false,
      last_inspection_date: input.last_inspection_date || null,
      next_inspection_due_date: input.next_inspection_due_date || null,
      tracker_provider: input.tracker_provider ?? null,
      tracker_reference: input.tracker_reference ?? null,
      created_at: now,
      updated_at: now
    };

    this.data.projectSecurityIncidents.push(incident);
    setDoc(doc(firestoreDb, 'projectSecurityIncidents', id), incident).catch(e => {});

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: incident.project_id,
      action: 'SECURITY_INCIDENT_REPORTED',
      entity_type: 'ProjectSecurityIncident',
      entity_id: id,
      old_value: '',
      new_value: `${incident.incident_type}: ${incident.description}`,
      ip_address: '127.0.0.1'
    });

    this.notifyStaff(
      'Security/Vehicle Incident Reported',
      `${incident.user_name} reported a "${incident.incident_type.replace(/_/g, ' ')}" incident on vehicle ${incident.vehicle_reg || 'N/A'}.`,
      'warning',
      incident.project_id
    );

    return incident;
  }

  public updateSecurityIncident(
    incidentId: string,
    updates: {
      status?: SecurityIncidentStatus;
      outcome?: string;
      apply_penalty?: boolean;
      penalty_amount?: number;
      slot_id?: string;
      last_inspection_date?: string;
      next_inspection_due_date?: string;
    },
    actorUser: User
  ): ProjectSecurityIncident | null {
    const idx = this.data.projectSecurityIncidents.findIndex(i => i.id === incidentId);
    if (idx === -1) return null;

    const incident = this.data.projectSecurityIncidents[idx];
    const oldStatus = incident.status;

    if (updates.status) incident.status = updates.status;
    if (updates.outcome !== undefined) incident.outcome = updates.outcome;
    if (updates.last_inspection_date !== undefined) incident.last_inspection_date = updates.last_inspection_date;
    if (updates.next_inspection_due_date !== undefined) incident.next_inspection_due_date = updates.next_inspection_due_date;
    incident.updated_at = new Date().toISOString();

    // Optionally apply a penalty tied to this incident (e.g. suspected misuse, failed inspection).
    if (updates.apply_penalty && !incident.penalty_applied && updates.penalty_amount && updates.penalty_amount > 0) {
      const penalty = this.applyPenalty({
        project_id: incident.project_id,
        user_id: incident.user_id,
        user_name: incident.user_name,
        slot_id: updates.slot_id,
        penalty_type: 'inspection_failure',
        penalty_amount: updates.penalty_amount,
        reason: `Security incident (${incident.incident_type}): ${incident.description}`
      }, actorUser);
      incident.penalty_applied = true;
      incident.penalty_amount = penalty.penalty_amount;
      incident.status = 'penalty_applied';
    }

    this.data.projectSecurityIncidents[idx] = incident;
    setDoc(doc(firestoreDb, 'projectSecurityIncidents', incident.id), incident, { merge: true }).catch(e => {});

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: incident.project_id,
      action: 'SECURITY_INCIDENT_UPDATED',
      entity_type: 'ProjectSecurityIncident',
      entity_id: incident.id,
      old_value: oldStatus,
      new_value: incident.status,
      ip_address: '127.0.0.1',
      notes: updates.outcome
    });

    this.sendProjectNotification(
      incident.user_id,
      'Security Incident Update',
      `Your reported incident (${incident.incident_type.replace(/_/g, ' ')}) status is now "${incident.status.replace(/_/g, ' ')}".`,
      incident.status === 'resolved' || incident.status === 'closed' ? 'info' : 'warning',
      incident.project_id
    );

    return incident;
  }

  // ==================== DOCUMENTS ====================

  public getProjectDocuments(projectId?: string, userId?: string): ProjectDocument[] {
    let list = this.data.projectDocuments || [];
    if (projectId) list = list.filter(d => d.project_id === projectId);
    if (userId) list = list.filter(d => d.user_id === userId);
    return list.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
  }

  public uploadProjectDocument(input: Partial<ProjectDocument>, actorUser: User): ProjectDocument {
    const now = new Date().toISOString();
    const id = 'pdoc_' + Math.random().toString(36).substr(2, 9);
    const document: ProjectDocument = {
      id,
      project_id: input.project_id!,
      user_id: input.user_id || actorUser.id,
      user_name: input.user_name || actorUser.name,
      document_type: input.document_type || 'other',
      file_name: input.file_name || 'document',
      file_data: input.file_data || '',
      file_type: input.file_type || 'application/octet-stream',
      uploaded_by: actorUser.name,
      uploaded_at: now,
      status: 'pending',
      notes: input.notes ?? null
    };

    this.data.projectDocuments.push(document);
    setDoc(doc(firestoreDb, 'projectDocuments', id), document).catch(e => {});

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: document.project_id,
      action: 'DOCUMENT_UPLOADED',
      entity_type: 'ProjectDocument',
      entity_id: id,
      old_value: '',
      new_value: `${document.document_type}: ${document.file_name}`,
      ip_address: '127.0.0.1'
    });

    return document;
  }

  public reviewProjectDocument(
    documentId: string,
    status: 'approved' | 'rejected',
    notes: string | undefined,
    reviewerUser: User
  ): ProjectDocument | null {
    const idx = this.data.projectDocuments.findIndex(d => d.id === documentId);
    if (idx === -1) return null;

    const document = this.data.projectDocuments[idx];
    document.status = status;
    document.reviewed_by = reviewerUser.name;
    document.reviewed_at = new Date().toISOString();
    if (notes) document.notes = notes;

    this.data.projectDocuments[idx] = document;
    setDoc(doc(firestoreDb, 'projectDocuments', document.id), document, { merge: true }).catch(e => {});

    this.logProjectAudit({
      user_id: reviewerUser.id,
      user_name: reviewerUser.name,
      user_role: reviewerUser.role,
      project_id: document.project_id,
      action: `DOCUMENT_${status.toUpperCase()}`,
      entity_type: 'ProjectDocument',
      entity_id: document.id,
      old_value: 'pending',
      new_value: status,
      ip_address: '127.0.0.1',
      notes
    });

    this.sendProjectNotification(
      document.user_id,
      'Document Review Update',
      `Your uploaded document "${document.file_name}" was ${status}.${notes ? ` Note: ${notes}` : ''}`,
      status === 'approved' ? 'success' : 'error',
      document.project_id
    );

    return document;
  }

  // ==================== DISPUTES ====================

  public getDisputes(projectId?: string, userId?: string): ProjectDispute[] {
    let list = this.data.projectDisputes || [];
    if (projectId) list = list.filter(d => d.project_id === projectId);
    if (userId) list = list.filter(d => d.reported_by_user_id === userId || d.against_user_id === userId);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createDispute(input: Partial<ProjectDispute>, actorUser: User): ProjectDispute {
    const now = new Date().toISOString();
    const id = 'disp_' + Math.random().toString(36).substr(2, 9);
    const dispute: ProjectDispute = {
      id,
      project_id: input.project_id!,
      reported_by_user_id: actorUser.id,
      reported_by_name: actorUser.name,
      against_type: input.against_type || 'project',
      against_user_id: input.against_user_id ?? null,
      against_name: input.against_name ?? null,
      dispute_type: input.dispute_type || 'general',
      description: input.description || '',
      evidence_file: input.evidence_file || null,
      assigned_to: input.assigned_to || 'Admin',
      status: 'submitted',
      created_at: now,
      updated_at: now
    };

    this.data.projectDisputes.push(dispute);
    setDoc(doc(firestoreDb, 'projectDisputes', id), dispute).catch(e => {});

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: dispute.project_id,
      action: 'DISPUTE_FILED',
      entity_type: 'ProjectDispute',
      entity_id: id,
      old_value: '',
      new_value: `${dispute.dispute_type}: ${dispute.description}`,
      ip_address: '127.0.0.1'
    });

    this.notifyStaff(
      'New Dispute Filed',
      `${dispute.reported_by_name} filed a dispute (${dispute.dispute_type}) against ${dispute.against_name || dispute.against_type}.`,
      'warning',
      dispute.project_id
    );

    return dispute;
  }

  public updateDispute(
    disputeId: string,
    updates: { status?: DisputeStatus; outcome?: string; notes?: string; assigned_to?: string },
    actorUser: User
  ): ProjectDispute | null {
    const idx = this.data.projectDisputes.findIndex(d => d.id === disputeId);
    if (idx === -1) return null;

    const dispute = this.data.projectDisputes[idx];
    const oldStatus = dispute.status;

    if (updates.status) dispute.status = updates.status;
    if (updates.outcome !== undefined) dispute.outcome = updates.outcome;
    if (updates.notes !== undefined) dispute.notes = updates.notes;
    if (updates.assigned_to !== undefined) dispute.assigned_to = updates.assigned_to;
    dispute.updated_at = new Date().toISOString();

    this.data.projectDisputes[idx] = dispute;
    setDoc(doc(firestoreDb, 'projectDisputes', dispute.id), dispute, { merge: true }).catch(e => {});

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: dispute.project_id,
      action: 'DISPUTE_UPDATED',
      entity_type: 'ProjectDispute',
      entity_id: dispute.id,
      old_value: oldStatus,
      new_value: dispute.status,
      ip_address: '127.0.0.1',
      notes: updates.outcome
    });

    this.sendProjectNotification(
      dispute.reported_by_user_id,
      'Dispute Update',
      `Your dispute (${dispute.dispute_type}) status is now "${dispute.status.replace(/_/g, ' ')}".${dispute.outcome ? ` Outcome: ${dispute.outcome}` : ''}`,
      dispute.status === 'resolved_internally' ? 'success' : 'info',
      dispute.project_id
    );

    return dispute;
  }

  // ==================== EXIT / WITHDRAWAL RECORDS ====================

  public getExitRecords(projectId?: string): ProjectExitRecord[] {
    let list = this.data.projectExitRecords || [];
    if (projectId) list = list.filter(e => e.project_id === projectId);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public createExitRecord(input: Partial<ProjectExitRecord>, actorUser: User): ProjectExitRecord {
    const now = new Date().toISOString();
    const id = 'exit_' + Math.random().toString(36).substr(2, 9);

    const slot = input.slot_id ? this.data.projectMemberSlots.find(s => s.id === input.slot_id) : undefined;

    const exitRecord: ProjectExitRecord = {
      id,
      project_id: input.project_id!,
      user_id: input.user_id!,
      user_name: input.user_name || slot?.user_name || 'Member',
      slot_id: input.slot_id!,
      exit_type: input.exit_type || 'voluntary_withdrawal',
      benefit_received: slot ? !!slot.benefit_received : !!input.benefit_received,
      total_contributions: slot ? slot.total_paid : (input.total_contributions || 0),
      deposit_amount: slot ? slot.deposit_paid : (input.deposit_amount || 0),
      penalty_amount: input.penalty_amount || 0,
      refund_amount: input.refund_amount || 0,
      vehicle_transfer_required: slot ? !!slot.benefit_received : !!input.vehicle_transfer_required,
      next_of_kin_details: input.next_of_kin_details || '',
      admin_approval: 'pending',
      settlement_notes: input.settlement_notes || '',
      created_at: now
    };

    this.data.projectExitRecords.push(exitRecord);
    setDoc(doc(firestoreDb, 'projectExitRecords', id), exitRecord).catch(e => {});

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: exitRecord.project_id,
      action: 'EXIT_RECORD_CREATED',
      entity_type: 'ProjectExitRecord',
      entity_id: id,
      old_value: '',
      new_value: exitRecord.exit_type,
      ip_address: '127.0.0.1'
    });

    this.sendProjectNotification(
      exitRecord.user_id,
      'Exit / Withdrawal Process Started',
      `An exit process (${exitRecord.exit_type.replace(/_/g, ' ')}) has been initiated for your membership. It is pending admin approval.`,
      'warning',
      exitRecord.project_id
    );

    return exitRecord;
  }

  public decideExitRecord(
    exitId: string,
    approve: boolean,
    settlementNotes: string | undefined,
    actorUser: User
  ): ProjectExitRecord | null {
    const idx = this.data.projectExitRecords.findIndex(e => e.id === exitId);
    if (idx === -1) return null;

    const exitRecord = this.data.projectExitRecords[idx];
    exitRecord.admin_approval = approve ? 'approved' : 'rejected';
    if (settlementNotes) exitRecord.settlement_notes = settlementNotes;

    this.data.projectExitRecords[idx] = exitRecord;
    setDoc(doc(firestoreDb, 'projectExitRecords', exitRecord.id), exitRecord, { merge: true }).catch(e => {});

    if (approve) {
      const slot = this.data.projectMemberSlots.find(s => s.id === exitRecord.slot_id);
      if (slot) {
        slot.status = exitRecord.exit_type === 'dismissal' ? 'dismissed' : 'withdrawn';
        slot.updated_at = new Date().toISOString();
        setDoc(doc(firestoreDb, 'projectMemberSlots', slot.id), slot, { merge: true }).catch(e => {});
      }
      const member = this.data.projectMembers.find(m => m.user_id === exitRecord.user_id && m.project_id === exitRecord.project_id);
      if (member) {
        member.status = exitRecord.exit_type === 'dismissal' ? 'dismissed' : 'withdrawn';
        member.updated_at = new Date().toISOString();
        setDoc(doc(firestoreDb, 'projectMembers', member.id), member, { merge: true }).catch(e => {});
      }
    }

    this.logProjectAudit({
      user_id: actorUser.id,
      user_name: actorUser.name,
      user_role: actorUser.role,
      project_id: exitRecord.project_id,
      action: approve ? 'EXIT_RECORD_APPROVED' : 'EXIT_RECORD_REJECTED',
      entity_type: 'ProjectExitRecord',
      entity_id: exitRecord.id,
      old_value: 'pending',
      new_value: exitRecord.admin_approval,
      ip_address: '127.0.0.1',
      notes: settlementNotes
    });

    this.sendProjectNotification(
      exitRecord.user_id,
      approve ? 'Exit Process Approved' : 'Exit Process Rejected',
      approve
        ? `Your exit (${exitRecord.exit_type.replace(/_/g, ' ')}) has been approved. Refund amount: R${exitRecord.refund_amount.toLocaleString()}.`
        : `Your exit request was rejected.${settlementNotes ? ` Note: ${settlementNotes}` : ''}`,
      approve ? 'info' : 'warning',
      exitRecord.project_id
    );

    return exitRecord;
  }

  // ==================== NOTIFICATIONS & AUDIT LOGS ====================

  public sendProjectNotification(
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'payment',
    projectId?: string
  ) {
    const id = 'pnotif_' + Math.random().toString(36).substr(2, 9);
    const notif: ProjectNotification = {
      id,
      user_id: userId,
      project_id: projectId,
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString()
    };
    this.data.projectNotifications.push(notif);
    setDoc(doc(firestoreDb, 'projectNotifications', id), notif).catch(e => {});
  }

  /**
   * Broadcasts a notification to all admin and accountant users (staff who
   * oversee project finances). Relies on the core LocalDatabase reference
   * being injected via the constructor; silently no-ops if unavailable so
   * this module never hard-fails the rest of the app if that wiring changes.
   */
  private notifyStaff(
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'payment',
    projectId?: string
  ) {
    if (!this.coreDb) return;
    try {
      const staff = this.coreDb.getUsers().filter(u => u.role === 'admin' || u.role === 'accountant');
      staff.forEach(u => this.sendProjectNotification(u.id, title, message, type, projectId));
    } catch (e) {
      console.error('[Project Engine] Failed to notify staff:', e);
    }
  }

  public getNotifications(userId: string): ProjectNotification[] {
    return (this.data.projectNotifications || [])
      .filter(n => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public markNotificationRead(id: string) {
    const notif = (this.data.projectNotifications || []).find(n => n.id === id);
    if (notif) {
      notif.read = true;
      setDoc(doc(firestoreDb, 'projectNotifications', id), notif, { merge: true }).catch(e => {});
    }
  }

  public logProjectAudit(logInput: Partial<ProjectAuditLog>) {
    const id = 'paud_' + Math.random().toString(36).substr(2, 9);
    const audit: ProjectAuditLog = {
      id,
      user_id: logInput.user_id || 'system',
      user_name: logInput.user_name || 'System',
      user_role: logInput.user_role || 'admin',
      // project_id/reason/notes are optional on the type, but Firestore's setDoc()
      // rejects an explicit `undefined` value (as opposed to an absent key), so any
      // caller that omits these must get `null` here, not a bare pass-through.
      project_id: logInput.project_id ?? null,
      action: logInput.action || 'ACTION',
      entity_type: logInput.entity_type || 'System',
      entity_id: logInput.entity_id || '',
      old_value: logInput.old_value || '',
      new_value: logInput.new_value || '',
      ip_address: logInput.ip_address || '127.0.0.1',
      reason: logInput.reason ?? null,
      notes: logInput.notes ?? null,
      created_at: new Date().toISOString()
    };

    this.data.projectAuditLogs.push(audit);
    setDoc(doc(firestoreDb, 'projectAuditLogs', id), audit).catch(e => {});
  }

  public getProjectAuditLogs(projectId?: string): ProjectAuditLog[] {
    let list = this.data.projectAuditLogs || [];
    if (projectId) list = list.filter(l => l.project_id === projectId);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ==================== DEFAULT ACTION PACK PROJECT SEEDING ====================

  private async seedActionPackProject() {
    console.log('[Project Engine] Seeding Action Pack Project with Constitution defaults...');

    const projId = 'proj_action_pack_01';
    const startDate = '2026-09-01';
    const durationMonths = 15;
    const endDate = this.calculateEndDate(startDate, durationMonths);
    const totalWeeks = this.calculateTotalWeeks(startDate, endDate);

    const actionPackProject: Project = {
      id: projId,
      name: 'Action Pack Project',
      description: 'Vehicle Acquisition Stokvel Project governed by the Action Pack Constitution. 15-month structured weekly contribution cycle toward shared vehicle purchase and handover.',
      duration_months: durationMonths,
      start_date: startDate,
      end_date: endDate,
      deposit_deadline: '2026-08-25',
      contribution_cycle: 'weekly',
      week_start_day: 'Monday',
      total_weeks: totalWeeks,
      number_of_members: 4,
      number_of_full_slots: 2,
      number_of_half_slots: 2,
      bank_name: 'Standard Bank',
      bank_account_name: 'Action Pack Vehicle Stokvel Group',
      bank_account_number: '2718940192',
      branch_code: '051001',
      account_type: 'Business Cheque Account',
      payment_reference_instructions: 'Format: AP-[MEMBER_SURNAME]-[SLOT_NO]',
      status: 'active',
      notes: 'Constitution adopted. Payout order locked and approved by governing chairperson and finance committee.',
      constitution_document_name: 'Action_Pack_Stokvel_Constitution_2026.pdf',
      constitution_document_data: 'data:application/pdf;base64,JVBERi0xLjQK...',
      payout_order_locked: true,
      payout_order_locked_at: new Date().toISOString(),
      created_by: 'usr_admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.data.projects.push(actionPackProject);
    setDoc(doc(firestoreDb, 'projects', projId), actionPackProject).catch(err => console.error("[Project Engine] Firestore save failed:", err));

    // Slot Types
    const fullSlot: ProjectSlotTypeConfig = {
      id: 'st_action_full',
      project_id: projId,
      name: 'Full Slot',
      weekly_contribution: 3000,
      deposit_required: 10000,
      deposit_non_refundable: true,
      payout_amount: 300000,
      post_benefit_increase: 1000,
      default_threshold: 7000,
      active: true
    };

    const halfSlot: ProjectSlotTypeConfig = {
      id: 'st_action_half',
      project_id: projId,
      name: 'Half Slot',
      weekly_contribution: 1500,
      deposit_required: 5000,
      deposit_non_refundable: true,
      payout_amount: 150000,
      post_benefit_increase: 700,
      default_threshold: 3500,
      active: true
    };

    this.data.projectSlotTypes.push(fullSlot, halfSlot);
    setDoc(doc(firestoreDb, 'projectSlotTypes', fullSlot.id), fullSlot).catch(err => console.error("[Project Engine] Firestore save failed:", err));
    setDoc(doc(firestoreDb, 'projectSlotTypes', halfSlot.id), halfSlot).catch(err => console.error("[Project Engine] Firestore save failed:", err));

    // Seed 4 members (2 Drivers, 2 Fleet Owners)
    const membersData = [
      {
        id: 'pmem_sipho',
        user_id: 'usr_member_sipho',
        user_name: 'Sipho Sithole',
        user_email: 'sipho.driver@actionpack.co.za',
        user_phone: '+27 82 910 4422',
        member_type: 'driver' as const,
        slot_type_name: 'Full Slot',
        weekly: 3000,
        deposit: 10000,
        payout: 300000,
        position: 1,
        postIncrease: 1000,
        defThreshold: 7000,
        nok_name: 'Zanele Sithole',
        nok_phone: '+27 82 910 4499',
        nok_rel: 'Spouse'
      },
      {
        id: 'pmem_thabo',
        user_id: 'usr_member_thabo',
        user_name: 'Thabo Nkosi',
        user_email: 'thabo.driver@actionpack.co.za',
        user_phone: '+27 84 771 9901',
        member_type: 'driver' as const,
        slot_type_name: 'Half Slot',
        weekly: 1500,
        deposit: 5000,
        payout: 150000,
        position: 2,
        postIncrease: 700,
        defThreshold: 3500,
        nok_name: 'Nomsa Nkosi',
        nok_phone: '+27 84 771 9988',
        nok_rel: 'Sister'
      },
      {
        id: 'pmem_james',
        user_id: 'usr_member_james',
        user_name: 'James Mthembu',
        user_email: 'james.fleet@actionpack.co.za',
        user_phone: '+27 81 332 5599',
        member_type: 'fleet_owner' as const,
        slot_type_name: 'Full Slot',
        weekly: 3000,
        deposit: 10000,
        payout: 300000,
        position: 3,
        postIncrease: 1000,
        defThreshold: 7000,
        nok_name: 'Precious Mthembu',
        nok_phone: '+27 81 332 5500',
        nok_rel: 'Spouse'
      },
      {
        id: 'pmem_sarah',
        user_id: 'usr_member_sarah',
        user_name: 'Sarah Dlamini',
        user_email: 'sarah.fleet@actionpack.co.za',
        user_phone: '+27 79 554 1122',
        member_type: 'fleet_owner' as const,
        slot_type_name: 'Half Slot',
        weekly: 1500,
        deposit: 5000,
        payout: 150000,
        position: 4,
        postIncrease: 700,
        defThreshold: 3500,
        nok_name: 'Bheki Dlamini',
        nok_phone: '+27 79 554 1199',
        nok_rel: 'Brother'
      }
    ];

    const nowStr = new Date().toISOString();

    for (const m of membersData) {
      const pMember: ProjectMember = {
        id: m.id,
        project_id: projId,
        user_id: m.user_id,
        user_name: m.user_name,
        user_email: m.user_email,
        user_phone: m.user_phone,
        member_type: m.member_type,
        status: 'active',
        constitution_accepted: true,
        constitution_accepted_at: nowStr,
        constitution_accepted_ip: '197.89.24.12',
        signed_constitution_file: 'signed_action_pack_constitution.pdf',
        signed_constitution_file_name: `${m.user_name.replace(/\s+/g, '_')}_Signed_Constitution.pdf`,
        id_document_file: 'id_doc_verified.pdf',
        id_document_file_name: `${m.user_name.replace(/\s+/g, '_')}_ID.pdf`,
        next_of_kin_name: m.nok_name,
        next_of_kin_phone: m.nok_phone,
        next_of_kin_relationship: m.nok_rel,
        member_start_date: startDate,
        created_at: nowStr,
        updated_at: nowStr
      };

      this.data.projectMembers.push(pMember);
      setDoc(doc(firestoreDb, 'projectMembers', pMember.id), pMember).catch(err => console.error("[Project Engine] Firestore save failed:", err));

      const slotId = `pslot_${m.id}`;
      const pSlot: ProjectMemberSlot = {
        id: slotId,
        project_id: projId,
        project_member_id: m.id,
        user_id: m.user_id,
        user_name: m.user_name,
        slot_type_id: m.slot_type_name === 'Full Slot' ? fullSlot.id : halfSlot.id,
        slot_type_name: m.slot_type_name,
        slot_number: 1,
        payout_position: m.position,
        payout_order_locked: true,
        weekly_contribution: m.weekly,
        deposit_required: m.deposit,
        deposit_paid: m.deposit,
        deposit_status: 'paid',
        payout_amount: m.payout,
        post_benefit_increase: m.postIncrease,
        default_threshold: m.defThreshold,
        benefit_received: false,
        benefit_received_date: null,
        grace_period_end_date: null,
        first_arrears_date: null,
        default_grace_period_end_date: null,
        current_weekly_contribution: m.weekly,
        status: 'active',
        total_paid: m.deposit + m.weekly * 2,
        total_expected_to_date: m.weekly * 2,
        outstanding_amount: 0,
        advance_credit: 0,
        paid_ahead_weeks: 0,
        penalties_total: 0,
        penalties_unpaid: 0,
        created_at: nowStr,
        updated_at: nowStr
      };

      this.data.projectMemberSlots.push(pSlot);
      setDoc(doc(firestoreDb, 'projectMemberSlots', slotId), pSlot).catch(err => console.error("[Project Engine] Firestore save failed:", err));

      // Seed contribution obligations for weeks 1 to totalWeeks
      for (let w = 1; w <= totalWeeks; w++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + (w - 1) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const isPaid = w <= 2; // Weeks 1 & 2 pre-paid
        const schedId = `sched_${slotId}_w${w}`;
        const schedule: ProjectContributionSchedule = {
          id: schedId,
          project_id: projId,
          slot_id: slotId,
          user_id: m.user_id,
          week_number: w,
          week_start_date: weekStart.toISOString().split('T')[0],
          week_end_date: weekEnd.toISOString().split('T')[0],
          due_date: weekEnd.toISOString().split('T')[0],
          expected_amount: m.weekly,
          amount_paid: isPaid ? m.weekly : 0,
          outstanding_amount: isPaid ? 0 : m.weekly,
          advance_credit_applied: 0,
          status: isPaid ? 'paid' : (w === 3 ? 'due' : 'upcoming'),
          penalty_applied: false,
          created_at: nowStr,
          updated_at: nowStr
        };

        this.data.projectContributionSchedules.push(schedule);
        setDoc(doc(firestoreDb, 'projectContributionSchedules', schedId), schedule).catch(err => console.error("[Project Engine] Firestore save failed:", err));
      }

      // Seed Deposit POP
      const depositPayment: ProjectPayment = {
        id: `pay_dep_${m.id}`,
        project_id: projId,
        project_member_id: m.id,
        slot_id: slotId,
        user_id: m.user_id,
        user_name: m.user_name,
        payment_type: 'deposit',
        amount: m.deposit,
        payment_date: '2026-08-24',
        bank_reference: `AP-DEP-${m.user_name.split(' ')[1].toUpperCase()}-01`,
        file_name: `Deposit_Slip_${m.user_name.replace(/\s+/g, '_')}.pdf`,
        file_data: 'data:application/pdf;base64,JVBERi0xLjQK...',
        file_type: 'application/pdf',
        member_notes: 'Full non-refundable project deposit as per Action Pack Constitution clause 4.1.',
        internal_notes: 'Verified against Standard Bank statement batch #2026-08',
        bank_statement_reference: `STMT-AUG-26-LINE-${m.position}`,
        status: 'approved',
        approved_by: 'Thandiwe Khumalo (Accountant)',
        approved_at: '2026-08-25T10:00:00Z',
        allocation_summary: `Deposit: R${m.deposit}`,
        created_at: nowStr,
        updated_at: nowStr
      };

      this.data.projectPayments.push(depositPayment);
      setDoc(doc(firestoreDb, 'projectPayments', depositPayment.id), depositPayment).catch(err => console.error("[Project Engine] Firestore save failed:", err));

      // Seed Week 1 & 2 Payments
      const weekPayment: ProjectPayment = {
        id: `pay_wk_${m.id}`,
        project_id: projId,
        project_member_id: m.id,
        slot_id: slotId,
        user_id: m.user_id,
        user_name: m.user_name,
        payment_type: 'weekly_contribution',
        amount: m.weekly * 2,
        payment_date: '2026-09-08',
        bank_reference: `AP-WK12-${m.user_name.split(' ')[1].toUpperCase()}-01`,
        file_name: `Weekly_Contrib_${m.user_name.replace(/\s+/g, '_')}.pdf`,
        file_data: 'data:application/pdf;base64,JVBERi0xLjQK...',
        file_type: 'application/pdf',
        member_notes: 'Weekly contribution payment for weeks 1 and 2.',
        internal_notes: 'Standard Bank EFT instant clearance confirmed',
        bank_statement_reference: `STMT-SEP-08-LINE-${m.position}`,
        status: 'approved',
        approved_by: 'Thandiwe Khumalo (Accountant)',
        approved_at: '2026-09-09T09:30:00Z',
        allocation_summary: `Week 1: R${m.weekly}, Week 2: R${m.weekly}`,
        created_at: nowStr,
        updated_at: nowStr
      };

      this.data.projectPayments.push(weekPayment);
      setDoc(doc(firestoreDb, 'projectPayments', weekPayment.id), weekPayment).catch(err => console.error("[Project Engine] Firestore save failed:", err));
    }

    // Seed Published Group Summary
    const initialSummary: ProjectGroupSummary = {
      id: 'gsum_' + projId,
      project_id: projId,
      total_project_target: 900000, // 2x Full (300k) + 2x Half (150k) = 900k
      total_expected_to_date: 18000,
      total_collected: 48000, // 30k deposits + 18k weekly contributions
      total_outstanding: 0,
      total_deposits_collected: 30000,
      total_penalties_collected: 0,
      number_of_members: 4,
      number_of_slots: 4,
      full_slots_count: 2,
      half_slots_count: 2,
      members_up_to_date_count: 4,
      members_in_arrears_count: 0,
      members_paid_ahead_count: 0,
      next_payout_position: 1,
      project_completion_percentage: 5,
      notes_to_members: 'Action Pack Project launched successfully! All 4 slots confirmed and active. Weeks 1 & 2 contributions and deposits verified by Finance.',
      published: true,
      published_by: 'Thandiwe Khumalo (Senior Accountant)',
      published_at: nowStr,
      created_at: nowStr,
      updated_at: nowStr
    };

    this.data.projectGroupSummaries.push(initialSummary);
    setDoc(doc(firestoreDb, 'projectGroupSummaries', initialSummary.id), initialSummary).catch(err => console.error("[Project Engine] Firestore save failed:", err));

    // Seed 1 upcoming compulsory meeting
    const sampleMeeting: ProjectMeeting = {
      id: 'meet_ap_01',
      project_id: projId,
      title: 'Action Pack Monthly General Assembly & Position 1 Review',
      meeting_date: '2026-09-20T17:00:00Z',
      location_or_link: 'Action Pack Office / Google Meet: https://meet.google.com/ap-stokvel',
      agenda: '1. Financial review & reconciliation statement. 2. Position 1 vehicle acquisition progress for Sipho Sithole. 3. Security, tracker check & insurance validation.',
      minutes: '',
      created_by: 'System Administrator',
      attendance_required: true,
      created_at: nowStr,
      updated_at: nowStr,
      attendees: [
        { user_id: 'usr_member_sipho', user_name: 'Sipho Sithole', status: 'present' },
        { user_id: 'usr_member_thabo', user_name: 'Thabo Nkosi', status: 'present' },
        { user_id: 'usr_member_james', user_name: 'James Mthembu', status: 'present' },
        { user_id: 'usr_member_sarah', user_name: 'Sarah Dlamini', status: 'present' }
      ]
    };

    this.data.projectMeetings.push(sampleMeeting);
    setDoc(doc(firestoreDb, 'projectMeetings', sampleMeeting.id), sampleMeeting).catch(err => console.error("[Project Engine] Firestore save failed:", err));

    console.log('[Project Engine] Action Pack Project seeded with members, slots, and published summary.');
  }
}
