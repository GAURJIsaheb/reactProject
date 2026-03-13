import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth.js';
import { workspaceInviteRateLimiter } from '../middlewares/rateLimiter.js';
import {
  createWorkspace,
  listMyWorkspaces,
  deleteWorkspace,
  inviteMember,
  acceptInvite,
  getMembers,
  removeMember,
  getPendingInvites,
  revokeInvite,
  getWorkspaceSyncState,
} from '../controllers/workspace.controller.js';

const router = Router();

// Every workspace route requires a valid JWT.
router.use(requireAuth);

router.post('/',                                        createWorkspace);
router.get('/mine',                                     listMyWorkspaces);
router.delete('/:workspaceId',                          deleteWorkspace);
router.post('/invite',                                  workspaceInviteRateLimiter, inviteMember);
router.get('/invite/accept',                            acceptInvite);
router.get('/:workspaceId/sync-state',                  getWorkspaceSyncState);
router.get('/:workspaceId/members',                     getMembers);
router.delete('/:workspaceId/members/:memberId',        removeMember);
router.get('/:workspaceId/pending-invites',             getPendingInvites);
router.delete('/:workspaceId/invite/:inviteToken',      revokeInvite);

export default router;
