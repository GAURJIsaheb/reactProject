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
} from '../controllers/workspace.controller.js';

const router = Router();

// Every workspace route requires a valid JWT.
// We apply requireAuth here (not in index.js) so req.user is always populated
// before any controller runs.
router.use(requireAuth);

router.post('/',                                        createWorkspace);
router.get('/mine',                                     listMyWorkspaces);
router.delete('/:workspaceId',                          deleteWorkspace);
router.post('/invite',                                  workspaceInviteRateLimiter, inviteMember);
router.get('/invite/accept',                            acceptInvite);
router.get('/:workspaceId/members',                     getMembers);
router.delete('/:workspaceId/members/:memberId',        removeMember);
router.get('/:workspaceId/pending-invites',             getPendingInvites);
router.delete('/:workspaceId/invite/:inviteToken',      revokeInvite);

export default router;
