import 'reflect-metadata';
import Module from 'module';
import { Logger } from '@nestjs/common';

// @prisma/client is generated at build time; the slot logic only needs its enum values.
const origLoad = (Module as any)._load;
(Module as any)._load = function (req: string, ...rest: any[]) {
  if (req === '@prisma/client') {
    const e = (...k: string[]) => Object.fromEntries(k.map((x) => [x, x]));
    return {
      StreamStatus: e('LIVE', 'ENDED', 'SCHEDULED', 'RECONNECTING_GRACE_PERIOD'),
      StreamVisibility: e('PUBLIC', 'PRIVATE'),
      UserRole: e('ADMIN', 'STREAMER', 'DEVOTEE'),
      UserStatus: e('ACTIVE'),
      ViewingSessionStatus: e('ACTIVE', 'EVICTED_BY_MODERATOR'),
      Prisma: {},
      PrismaClient: class {},
    };
  }
  return origLoad.call(this, req, ...rest);
};
for (const k of ['log', 'warn', 'error', 'debug', 'verbose'] as const) (Logger.prototype as any)[k] = () => {};

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };
const rejects = async (p: Promise<any>, name: string) => { try { await p; return false; } catch (e: any) { return e?.constructor?.name === name || e?.name === name; } };

const U = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const STREAMER = U(1), A = U(2), B = U(3), C = U(4);

(async () => {
  const { StreamsService } = require('../src/modules/streams/streams.service');

  const room = new Map<string, any>();
  const addP = (identity: string) => room.set(identity, { identity, name: `n-${identity.slice(-1)}`, metadata: '{}', joinedAtMs: 0, isPublisher: false, hidden: false, attributes: {}, canPublish: false });
  [STREAMER, A, B].forEach(addP);
  let failUpdate = false, muted: any[] = [];
  const provider: any = {
    listParticipants: async () => [...room.values()],
    updateParticipantPermissions: async (_r: string, id: string, o: any) => {
      if (failUpdate) return false;
      const p = room.get(id); if (!p) return false;
      p.canPublish = o.canPublish;
      if (o.attributes) for (const [k, v] of Object.entries(o.attributes)) { if (v === '') delete p.attributes[k]; else p.attributes[k] = v; }
      return true;
    },
    muteParticipantSource: async (_r: string, id: string, s: string) => { muted.push([id, s]); return true; },
    kickParticipant: async (_r: string, id: string) => { room.delete(id); return true; },
  };
  const audit: any[] = [];
  let stream: any = { id: 's1', streamerId: STREAMER, visibility: 'PUBLIC', status: 'LIVE' };
  let blocked: string[] = [];
  const prisma: any = {
    stream: { findUnique: async () => stream },
    blockedViewer: { findFirst: async ({ where }: any) => (blocked.includes(where.userId) ? { id: 1 } : null) },
    streamViewingSession: { updateMany: async () => ({ count: 1 }) },
    viewerSession: { updateMany: async () => ({ count: 1 }), findFirst: async () => null },
    moderationAction: { create: async ({ data }: any) => { audit.push(data); return data; } },
  };
  const events: any[] = [];
  const gw: any = {
    emitVideoGuestChanged: (s: string, p: any) => events.push(['changed', p]),
    emitToIdentity: (s: string, id: string, ev: string) => events.push([ev, id]),
    clearVideoRequest: () => {},
    emitKick: () => {},
    evictChat: async () => {},
  };
  const svc = new StreamsService(prisma, provider, {} as any);
  svc.setDependencies(null, gw);

  const g = (id: string, opts?: any, actor = STREAMER, role = 'STREAMER') => svc.grantVideoGuest('s1', actor, role, id, opts);

  // happy path
  let r = await g(A);
  ok(r.success && room.get(A).canPublish && room.get(A).attributes.videoGuest === '1', 'grant gives publish permission + guest attribute');
  ok(audit.at(-1)?.actionType === 'VIDEO_GRANT' && audit.at(-1)?.targetUserId === A, 'grant is audited');
  ok(events.some((e) => e[0] === 'video:granted' && e[1] === A), 'devotee is notified of the grant');

  // idempotent
  r = await g(A);
  ok(r.alreadyActive === true && audit.length === 1, 'granting the same devotee twice is a no-op');

  // one at a time
  ok(await rejects(g(B), 'ConflictException'), 'second devotee is refused while the slot is taken');
  ok(!room.get(B).canPublish, 'refused devotee got no permission');

  // concurrent grants -> exactly one winner
  await svc.revokeVideoGuest('s1', STREAMER, 'STREAMER', A);
  ok(!room.get(A).canPublish && !room.get(A).attributes.videoGuest, 'revoke removes permission and attribute');
  ok(audit.at(-1)?.actionType === 'VIDEO_REVOKE', 'revoke is audited');
  ok(events.some((e) => e[0] === 'video:revoked' && e[1] === A), 'devotee is notified of the revoke');
  const settled = await Promise.allSettled([g(A), g(B)]);
  const wins = settled.filter((x) => x.status === 'fulfilled').length;
  const holders = [...room.values()].filter((p) => p.canPublish).length;
  ok(wins === 1 && holders === 1, 'two simultaneous grants: exactly one succeeds');

  // replace
  const holder = [...room.values()].find((p) => p.canPublish)!.identity;
  const other = holder === A ? B : A;
  await g(other, { replace: true });
  ok(room.get(other).canPublish && !room.get(holder).canPublish, 'replace moves the slot atomically');
  ok([...room.values()].filter((p) => p.canPublish).length === 1, 'still exactly one guest after replace');

  // guards
  ok(await rejects(g(C), 'BadRequestException'), 'devotee not in the room is rejected');
  ok(await rejects(g(STREAMER), 'BadRequestException'), 'cannot grant the broadcaster');
  ok(await rejects(g('priv_guest_x'), 'BadRequestException'), 'link guests / non-user identities rejected');
  ok(await rejects(g(A, {}, B, 'DEVOTEE'), 'ForbiddenException'), 'a devotee cannot grant');
  r = await g(A, {}, 'someone-else', 'ADMIN').catch((e: any) => e);
  ok(r instanceof Error === false || r?.constructor?.name === 'ConflictException', 'admin may moderate');
  stream = { ...stream, visibility: 'PRIVATE' };
  ok(await rejects(g(A), 'BadRequestException'), 'private streams do not use the guest slot');
  stream = { ...stream, visibility: 'PUBLIC', status: 'ENDED' };
  ok(await rejects(g(A), 'BadRequestException'), 'ended stream rejected');
  stream = { ...stream, status: 'LIVE' };

  // blocked + LiveKit failure
  for (const p of room.values()) { p.canPublish = false; delete p.attributes.videoGuest; }
  blocked = [B];
  ok(await rejects(g(B), 'ForbiddenException'), 'blocked devotee rejected');
  blocked = [];
  failUpdate = true;
  ok(await rejects(g(B), 'ServiceUnavailableException'), 'LiveKit failure surfaces as 503');
  ok(!room.get(B).canPublish, 'no half-granted state on failure');
  failUpdate = false;

  // lock released after a failure
  r = await g(B);
  ok(r.success, 'slot lock is not stuck after an error');

  // kick frees the slot
  events.length = 0;
  await svc.kickViewer('s1', STREAMER, 'STREAMER', B, { block: false });
  ok(![...room.values()].some((p) => p.canPublish), 'kicking the guest frees the slot');
  ok(events.some((e) => e[0] === 'changed' && e[1].identity === B && e[1].active === false), 'slot-free event emitted on kick');
  r = await g(A);
  ok(r.success, 'slot can be given again after the guest left');

  // reads + mute
  const cur = await svc.getVideoGuest('s1', STREAMER, 'STREAMER');
  ok(cur.guest?.identity === A, 'getVideoGuest reports the current guest');
  await svc.muteParticipantMedia('s1', STREAMER, 'STREAMER', A, { source: 'microphone' });
  ok(muted.length === 1 && muted[0][1] === 'microphone', 'host mute reaches the provider');
  ok(await rejects(svc.muteParticipantMedia('s1', STREAMER, 'STREAMER', STREAMER, { source: 'camera' }), 'BadRequestException'), 'cannot mute the broadcaster');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
