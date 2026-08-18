import { Router, Request, Response, NextFunction } from 'express';
import { ProjectDatabase } from './projectDb';
import { LocalDatabase } from './db';
import { User, POPStatus } from '../src/types';

export function createProjectRouter(projectDb: ProjectDatabase, localDb: LocalDatabase, requireAuth: any) {
  const router = Router();

  // Helper middleware for admin or accountant access
  const requireAccountantOrAdmin = (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      const user = (req as any).user as User;
      if (user.role !== 'admin' && user.role !== 'accountant') {
        return res.status(403).json({ error: 'Access denied. Accountant or Administrator authorization required.' });
      }
      next();
    });
  };

  // Helper middleware for admin only
  const requireAdminOnly = (req: Request, res: Response, next: NextFunction) => {
    requireAuth(req, res, () => {
      const user = (req as any).user as User;
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Super Administrator authorization required.' });
      }
      next();
    });
  };

  // ==================== 1. PROJECTS ====================

  // List projects accessible to user
  router.get('/projects', requireAuth, (req: Request, res: Response) => {
    try {
      const user = (req as any).user as User;
      const projects = projectDb.getProjects(user);

      // Enhance with computed week metadata
      const enriched = projects.map(p => {
        const weekInfo = projectDb.calculateCurrentWeek(p.start_date, p.total_weeks);
        return {
          ...p,
          computed_current_week: weekInfo.currentWeek,
          computed_weeks_completed: weekInfo.weeksCompleted,
          computed_weeks_remaining: weekInfo.weeksRemaining,
          computed_is_started: weekInfo.isStarted,
          computed_is_completed: weekInfo.isCompleted
        };
      });

      res.json({ projects: enriched });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to list projects' });
    }
  });

  // Get project by ID
  router.get('/projects/:id', requireAuth, (req: Request, res: Response) => {
    try {
      const project = projectDb.getProjectById(req.params.id);
      if (!project) return res.status(404).json({ error: 'Project not found' });

      const weekInfo = projectDb.calculateCurrentWeek(project.start_date, project.total_weeks);
      const members = projectDb.getProjectMembers(project.id);
      const slots = projectDb.getProjectSlots(project.id);

      res.json({
        project: {
          ...project,
          computed_current_week: weekInfo.currentWeek,
          computed_weeks_completed: weekInfo.weeksCompleted,
          computed_weeks_remaining: weekInfo.weeksRemaining,
          computed_is_started: weekInfo.isStarted,
          computed_is_completed: weekInfo.isCompleted,
          member_count: members.length,
          slot_count: slots.length
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch project' });
    }
  });

  // Create project (Admin only)
  router.post('/projects', requireAdminOnly, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const newProj = projectDb.createProject(req.body, actorUser);
      res.status(201).json({ project: newProj, message: 'Project created successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create project' });
    }
  });

  // Update project (Admin only)
  router.put('/projects/:id', requireAdminOnly, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const updated = projectDb.updateProject(req.params.id, req.body, actorUser);
      if (!updated) return res.status(404).json({ error: 'Project not found' });
      res.json({ project: updated, message: 'Project updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update project' });
    }
  });

  // Activate project (Admin only)
  router.post('/projects/:id/activate', requireAdminOnly, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const result = projectDb.activateProject(req.params.id, actorUser);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to activate project' });
    }
  });

  // ==================== 2. MEMBERS ====================

  // Get project members
  router.get('/projects/:id/members', requireAuth, (req: Request, res: Response) => {
    try {
      const members = projectDb.getProjectMembers(req.params.id);
      res.json({ members });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get members' });
    }
  });

  // Assign member (Admin only)
  router.post('/projects/:id/members', requireAdminOnly, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const { user_id, member_type, next_of_kin_name, next_of_kin_phone, next_of_kin_relationship, notes } = req.body;
      
      const allUsers = localDb.getUsers();
      const targetUser = allUsers.find(u => u.id === user_id);
      if (!targetUser) return res.status(404).json({ error: 'Selected user does not exist' });

      // Check if user is already a member of this project
      const existing = projectDb.getProjectMembers(req.params.id).find(m => m.user_id === user_id);
      if (existing) return res.status(400).json({ error: 'User is already assigned to this project' });

      const newMember = projectDb.addProjectMember({
        project_id: req.params.id,
        user_id: targetUser.id,
        user_name: targetUser.name,
        user_email: targetUser.email,
        user_phone: targetUser.phone,
        member_type: member_type || (targetUser.role === 'driver' ? 'driver' : 'fleet_owner'),
        next_of_kin_name,
        next_of_kin_phone,
        next_of_kin_relationship,
        notes
      }, actorUser);

      res.status(201).json({ member: newMember, message: 'Member assigned successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to add member' });
    }
  });

  // Update member (self or Admin)
  router.put('/projects/:id/members/:memberId', requireAuth, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const updated = projectDb.updateProjectMember(req.params.memberId, req.body, actorUser);
      if (!updated) return res.status(404).json({ error: 'Member not found' });
      res.json({ member: updated, message: 'Member record updated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update member' });
    }
  });

  // ==================== 3. SLOTS & PAYOUT ORDER ====================

  // Get slots for project
  router.get('/projects/:id/slots', requireAuth, (req: Request, res: Response) => {
    try {
      const user = (req as any).user as User;
      let slots = projectDb.getProjectSlots(req.params.id);
      if (user.role !== 'admin' && user.role !== 'accountant') {
        // Members see their own slot with full details
        const ownSlots = slots.filter(s => s.user_id === user.id);
        // And an anonymized list for general project payout positions
        const sanitizedSlots = slots.map(s => {
          if (s.user_id === user.id) return s;
          return {
            id: s.id,
            project_id: s.project_id,
            slot_type_name: s.slot_type_name,
            payout_position: s.payout_position,
            status: s.status,
            benefit_received: s.benefit_received,
            user_name: s.user_name.split(' ')[0] + ' ' + (s.user_name.split(' ')[1]?.[0] || '') + '.'
          };
        });
        return res.json({ slots: sanitizedSlots, ownSlots });
      }
      res.json({ slots });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get slots' });
    }
  });

  // Allocate slot (Admin only)
  router.post('/projects/:id/slots', requireAdminOnly, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const slot = projectDb.addProjectMemberSlot({ ...req.body, project_id: req.params.id }, actorUser);
      res.status(201).json({ slot, message: 'Slot allocated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to allocate slot' });
    }
  });

  // Update slot (Admin only)
  router.put('/projects/:id/slots/:slotId', requireAdminOnly, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const updated = projectDb.updateProjectMemberSlot(req.params.slotId, req.body, actorUser);
      if (!updated) return res.status(404).json({ error: 'Slot not found' });
      res.json({ slot: updated, message: 'Slot updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update slot' });
    }
  });

  // Lock payout order (Admin only)
  router.post('/projects/:id/lock-payout-order', requireAdminOnly, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const ok = projectDb.lockPayoutOrder(req.params.id, actorUser);
      res.json({ success: ok, message: 'Payout order locked successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to lock payout order' });
    }
  });

  // Emergency override payout order (Admin only)
  router.post('/projects/:id/override-payout-order', requireAdminOnly, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const { newOrder, reason } = req.body;
      const result = projectDb.overridePayoutOrder(req.params.id, newOrder, reason, actorUser);
      if (!result.success) return res.status(400).json({ error: result.message });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to override payout order' });
    }
  });

  // ==================== 4. CONTRIBUTION SCHEDULES ====================

  router.get('/projects/:id/schedules', requireAuth, (req: Request, res: Response) => {
    try {
      const user = (req as any).user as User;
      const { slot_id } = req.query;
      
      let schedules = projectDb['data'].projectContributionSchedules.filter(s => s.project_id === req.params.id);
      if (user.role !== 'admin' && user.role !== 'accountant') {
        schedules = schedules.filter(s => s.user_id === user.id);
      } else if (slot_id) {
        schedules = schedules.filter(s => s.slot_id === String(slot_id));
      }

      schedules.sort((a, b) => a.week_number - b.week_number);
      res.json({ schedules });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get contribution schedules' });
    }
  });

  // ==================== 5. PAYMENTS & PROOF OF PAYMENT ====================

  // Get payments
  router.get('/projects/:id/payments', requireAuth, (req: Request, res: Response) => {
    try {
      const user = (req as any).user as User;
      const { slot_id } = req.query;
      const isPrivileged = user.role === 'admin' || user.role === 'accountant';
      const userIdFilter = isPrivileged ? undefined : user.id;

      const payments = projectDb.getPayments(req.params.id, slot_id ? String(slot_id) : undefined, userIdFilter);
      res.json({ payments });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get payments' });
    }
  });

  // Upload POP
  router.post('/projects/:id/payments/upload-pop', requireAuth, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const { slot_id, payment_type, amount, payment_date, bank_reference, file_name, file_data, file_type, member_notes } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid payment amount is required' });
      }

      const payment = projectDb.uploadPOP({
        project_id: req.params.id,
        slot_id,
        payment_type: payment_type || 'weekly_contribution',
        amount: Number(amount),
        payment_date,
        bank_reference,
        file_name,
        file_data,
        file_type,
        member_notes
      }, actorUser);

      res.status(201).json({ payment, message: 'Proof of Payment uploaded successfully and submitted for Accountant review.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to upload POP' });
    }
  });

  // Review POP (Accountant or Admin)
  router.post('/projects/:id/payments/:paymentId/review', requireAccountantOrAdmin, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const { status, rejection_reason, internal_notes, bank_statement_reference } = req.body;

      if (!status || !['approved', 'rejected', 'under_investigation'].includes(status)) {
        return res.status(400).json({ error: 'Valid POP review status is required (approved, rejected, under_investigation)' });
      }

      const result = projectDb.reviewPOP(req.params.paymentId, status as POPStatus, {
        rejection_reason,
        internal_notes,
        bank_statement_reference
      }, actorUser);

      if (!result.success) return res.status(400).json({ error: result.message });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to review POP' });
    }
  });

  // ==================== 6. GROUP SUMMARIES / PUBLISHER ====================

  router.get('/projects/:id/group-summary', requireAuth, (req: Request, res: Response) => {
    try {
      const user = (req as any).user as User;
      const isPrivileged = user.role === 'admin' || user.role === 'accountant';

      if (isPrivileged) {
        // Compute live calculation
        const liveSummary = projectDb.calculateGroupSummary(req.params.id);
        const publishedSummary = projectDb.getPublishedGroupSummary(req.params.id);
        return res.json({ summary: liveSummary, publishedSummary });
      }

      // Member gets only published summary
      const published = projectDb.getPublishedGroupSummary(req.params.id);
      res.json({ summary: published || null });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get group summary' });
    }
  });

  // Publish group summary (Accountant or Admin)
  router.post('/projects/:id/publish-group-summary', requireAccountantOrAdmin, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const { notes } = req.body;
      const summary = projectDb.publishGroupSummary(req.params.id, notes, actorUser);
      res.json({ summary, message: 'Group summary published to all project members successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to publish group summary' });
    }
  });

  // ==================== 7. PENALTIES ====================

  router.get('/projects/:id/penalties', requireAuth, (req: Request, res: Response) => {
    try {
      const user = (req as any).user as User;
      const isPrivileged = user.role === 'admin' || user.role === 'accountant';
      const userIdFilter = isPrivileged ? undefined : user.id;

      const penalties = projectDb.getPenalties(req.params.id, userIdFilter);
      res.json({ penalties });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get penalties' });
    }
  });

  // Apply penalty (Accountant or Admin)
  router.post('/projects/:id/penalties', requireAccountantOrAdmin, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const penalty = projectDb.applyPenalty({ ...req.body, project_id: req.params.id }, actorUser);
      res.status(201).json({ penalty, message: 'Penalty applied successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to apply penalty' });
    }
  });

  // Waive penalty (Admin only)
  router.post('/projects/:id/penalties/:penaltyId/waive', requireAdminOnly, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const { reason } = req.body;
      if (!reason) return res.status(400).json({ error: 'Waiver justification reason is required' });

      const ok = projectDb.waivePenalty(req.params.penaltyId, reason, actorUser);
      if (!ok) return res.status(404).json({ error: 'Penalty record not found' });
      res.json({ success: true, message: 'Penalty waived successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to waive penalty' });
    }
  });

  // ==================== 8. VEHICLE BENEFIT WORKFLOW ====================

  router.get('/projects/:id/vehicle-benefits', requireAuth, (req: Request, res: Response) => {
    try {
      const benefits = projectDb.getVehicleBenefits(req.params.id);
      res.json({ benefits });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get vehicle benefits' });
    }
  });

  router.post('/projects/:id/vehicle-benefits', requireAdminOnly, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const benefit = projectDb.createOrUpdateVehicleBenefit({ ...req.body, project_id: req.params.id }, actorUser);
      res.json({ benefit, message: 'Vehicle benefit record updated successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save vehicle benefit' });
    }
  });

  // ==================== 9. INSURANCE & MEETINGS ====================

  router.get('/projects/:id/insurance', requireAuth, (req: Request, res: Response) => {
    try {
      const insurance = projectDb.getInsuranceRecords(req.params.id);
      res.json({ insurance });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get insurance records' });
    }
  });

  router.post('/projects/:id/insurance', requireAccountantOrAdmin, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const record = projectDb.saveInsuranceRecord({ ...req.body, project_id: req.params.id }, actorUser);
      res.json({ record, message: 'Insurance record saved' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save insurance record' });
    }
  });

  router.get('/projects/:id/meetings', requireAuth, (req: Request, res: Response) => {
    try {
      const meetings = projectDb.getMeetings(req.params.id);
      res.json({ meetings });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get meetings' });
    }
  });

  router.post('/projects/:id/meetings', requireAdminOnly, (req: Request, res: Response) => {
    try {
      const actorUser = (req as any).user as User;
      const meeting = projectDb.saveMeeting({ ...req.body, project_id: req.params.id }, actorUser);
      res.json({ meeting, message: 'Meeting saved successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save meeting' });
    }
  });

  // ==================== 10. AUDIT LOGS ====================

  router.get('/projects/:id/audit-logs', requireAdminOnly, (req: Request, res: Response) => {
    try {
      const auditLogs = projectDb.getProjectAuditLogs(req.params.id);
      res.json({ auditLogs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get audit logs' });
    }
  });

  // ==================== 11. NOTIFICATIONS ====================

  router.get('/notifications', requireAuth, (req: Request, res: Response) => {
    try {
      const user = (req as any).user as User;
      const notifications = projectDb.getNotifications(user.id);
      const unreadCount = notifications.filter(n => !n.read).length;
      res.json({ notifications, unreadCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get notifications' });
    }
  });

  router.post('/notifications/:id/read', requireAuth, (req: Request, res: Response) => {
    try {
      projectDb.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to mark notification read' });
    }
  });

  return router;
}
