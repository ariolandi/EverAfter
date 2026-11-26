import { Router, type Request, type Response } from 'express';
import { HttpStatus } from '../shared/httpStatus.js';
import type { GroupInvitation } from '../shared/types.js';
import { createGuestResponses, getGroupInvitation, getGuestInvitation, type InvitationRecord } from './db.js';
import { parseGuestAnswer } from './responses.js';

function toInvitation(found: InvitationRecord): GroupInvitation {
  return {
    form: found.form!.form,
    schedule: found.schedule,
    groupName: found.name,
    guests: found.guests,
    menus: found.menus,
  };
}

function personalLinkRouter(load: (token: string) => Promise<InvitationRecord | undefined>) {
  const router = Router();

  /** The link's invitation, or responds 404 and returns undefined while it is unknown or unpublished. */
  async function find(req: Request<{ token: string }>, res: Response) {
    const found = await load(req.params.token);
    if (!found) {
      res.status(HttpStatus.NOT_FOUND).json({ error: 'invitation not found' });
      return undefined;
    }
    if (!found.form) {
      res.status(HttpStatus.NOT_FOUND).json({ error: 'the invitation has not been published yet' });
      return undefined;
    }
    return found;
  }

  router.get('/:token', async (req, res) => {
    const found = await find(req, res);
    if (found) res.json(toInvitation(found));
  });

  router.post('/:token/responses', async (req, res) => {
    const found = await find(req, res);
    if (!found) return;
    const { form } = found.form!;
    const pending = found.guests.filter((g) => !g.response);
    if (pending.length === 0) {
      res.status(HttpStatus.CONFLICT).json({ error: 'this invitation has already been answered' });
      return;
    }
    const answers: unknown = req.body?.answers;
    if (!Array.isArray(answers)) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'answers are required' });
      return;
    }
    const byGuest = new Map<unknown, Record<string, unknown>>(answers.map((a) => [a?.guestId, a ?? {}]));
    // Exactly one answer per guest who has not answered yet, so nobody is skipped or answered for twice.
    if (
      byGuest.size !== answers.length ||
      answers.length !== pending.length ||
      !pending.every((g) => byGuest.has(g.id))
    ) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'answer for every guest who has not answered yet' });
      return;
    }
    const rows = [];
    for (const guest of pending) {
      const parsed = parseGuestAnswer(
        guest,
        { showAnswer: form.showAnswer, menus: found.menus },
        byGuest.get(guest.id)!,
      );
      if (!parsed.ok) {
        res.status(HttpStatus.BAD_REQUEST).json({ error: parsed.error });
        return;
      }
      rows.push({ guestId: guest.id, name: guest.name, ...parsed.values });
    }
    if (!(await createGuestResponses(found.form!.id, found.groupId, rows))) {
      res.status(HttpStatus.CONFLICT).json({ error: 'this invitation has already been answered' });
      return;
    }
    // The page carries on from what is now recorded.
    const updated = await load(req.params.token);
    res.status(HttpStatus.CREATED).json(toInvitation(updated!));
  });

  return router;
}

/**
 * Public routes behind a personal invitation link, a group's (/api/groups/:token) or a single guest's
 * (/api/guests/:token): anyone with the token can view the invitation and answer for the guests who have not
 * answered yet. A guest's answer can't be changed from the link afterwards.
 */
export const groupRouter = personalLinkRouter(getGroupInvitation);
export const guestRouter = personalLinkRouter(getGuestInvitation);
