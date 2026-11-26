/* Offline unit tests for serverless Postgres idle gating & read caches.
   Run: npx ts-node --transpile-only scripts/serverless-idle.test.ts */
import Module from 'module';

const origLoad = (Module as any)._load;
(Module as any)._load = function (request: string, ...args: any[]) {
  if (request === '@prisma/client') {
    const mkEnum = (...keys: string[]) => Object.fromEntries(keys.map((k) => [k, k]));
    return {
      StreamStatus: mkEnum('DRAFT', 'SCHEDULED', 'LIVE', 'RECONNECTING_GRACE_PERIOD', 'ENDED', 'CANCELLED'),
      StreamVisibility: mkEnum('PUBLIC', 'PRIVATE'),
      ViewingSessionStatus: mkEnum('ACTIVE', 'COMPLETED_NATURAL', 'DISCONNECTED_TIMEOUT', 'EVICTED_BY_MODERATOR'),
      UserRole: mkEnum('ADMIN', 'STREAMER', 'VIEWER'),
      UserStatus: mkEnum('ACTIVE', 'BANNED', 'SUSPENDED', 'DELETION_REQUESTED'),
      KycStatus: mkEnum('PENDING', 'APPROVED', 'REJECTED'),
      Prisma: {},
      PrismaClient: class {},
    };
  }
  return origLoad.call(this, request, ...args);
};

let pass = 0;
let fail = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${msg}`);
};

(async () => {
  process.env.RUN_CRONS = 'true';
  delete process.env.WORKER_PROCESS;
  delete process.env.REDIS_URL;

  const { DbActivityCoordinator, dbActivity } = require('../src/common/db-activity.coordinator');
  const { CronTasksService } = require('../src/jobs/cron-tasks.service');
  const { StreamsService } = require('../src/modules/streams/streams.service');
  const { AdminService } = require('../src/modules/admin/admin.service');
  const { PresenceService } = require('../src/modules/chat/presence.service');

  // 1. Coordinator unit invariants
  {
    const coord = new DbActivityCoordinator();
    const t0 = 1_700_000_000_000;
    ok(coord.shouldRunBroadcastWatchdogs(t0), 'coordinator: starts dirty so boot syncs once');
    ok(coord.shouldRunReminders(t0), 'coordinator: starts reminder-dirty so boot syncs once');

    coord.completeBroadcastSweep(false, t0);
    ok(!coord.shouldRunBroadcastWatchdogs(t0 + 30_000), 'coordinator: sleeps after idle sweep');
    ok(!coord.isBroadcastActive(), 'coordinator: isBroadcastActive=false after idle sweep');
    ok(
      coord.shouldRunBroadcastWatchdogs(t0 + coord.getIdleSweepMs() + 1),
      'coordinator: wakes after idle sweep timeout for safety check',
    );

    coord.wakeBroadcasts();
    ok(coord.isBroadcastActive(), 'coordinator: wakeBroadcasts wakes immediately');
    ok(coord.shouldRunBroadcastWatchdogs(t0 + 1000), 'coordinator: active watchdogs stay awake');

    coord.completeBroadcastSweep(false, t0 + 2000);
    ok(!coord.shouldRunBroadcastWatchdogs(t0 + 3000), 'coordinator: returns to sleep when empty');

    // Reminder lookahead
    const futureStream = new Date(t0 + 5 * 60 * 60_000); // 5h away
    coord.completeReminderSweep(futureStream, t0);
    ok(!coord.shouldRunReminders(t0 + 60_000), 'coordinator: skips reminder queries hours before stream');
    ok(
      coord.shouldRunReminders(futureStream.getTime() - 16 * 60_000),
      'coordinator: wakes within 17m lookahead window before scheduled stream',
    );

    // Sticky dirty flag preserved if already dirty when notifyScheduledReminder fires
    coord.markRemindersDirty();
    coord.notifyScheduledReminder(futureStream);
    ok(coord.shouldRunReminders(t0 + 60_000), 'coordinator: keeps remindersDirty sticky until swept');
  }

  // 2. CronTasksService integration with idle gating & hourly stale cleanup
  {
    dbActivity.resetForTest();
    let queries = 0;
    let liveCount = 0;
    let activeSessions = 0;
    let staleCleanupCalls = 0;
    let reminderDispatches = 0;
    let nextReminderDate: Date | null = null;

    const prismaMock: any = {
      stream: {
        findMany: async () => {
          queries++;
          return [];
        },
        updateMany: async () => {
          queries++;
          staleCleanupCalls++;
          return { count: 0 };
        },
        count: async () => {
          queries++;
          return liveCount;
        },
      },
      streamViewingSession: {
        updateMany: async () => {
          queries++;
          return { count: 0 };
        },
        findMany: async () => {
          queries++;
          return [];
        },
        count: async () => {
          queries++;
          return activeSessions;
        },
      },
      streamReminder: {
        findFirst: async () => {
          queries++;
          return nextReminderDate ? { stream: { scheduledAt: nextReminderDate } } : null;
        },
      },
    };
    const remindersMock: any = {
      dispatch15MinuteReminders: async () => {
        reminderDispatches++;
        queries++;
      },
    };
    const videoMock: any = {
      listActiveRooms: async () => [],
      endRoom: async () => true,
      kickParticipant: async () => true,
    };

    const crons = new CronTasksService(prismaMock, remindersMock, videoMock);

    // Boot sweep runs once and settles into idle
    await crons.reconcileLiveRooms();
    await crons.dispatchReminders();
    const afterBootQueries = queries;
    ok(afterBootQueries > 0 && staleCleanupCalls === 1 && reminderDispatches === 1, 'crons: boot sweep executes cleanly');

    // Second idle pass hits 0 queries across all 4 periodic methods
    await crons.handleStreamDisconnectWatchdog();
    await crons.reconcileLiveRooms();
    await crons.handleCoinMeterWatchdog();
    await crons.dispatchReminders();
    ok(queries === afterBootQueries, `crons: idle pass makes 0 DB queries (delta=${queries - afterBootQueries})`);

    // Going live immediately wakes watchdogs; hourly gate skips redundant 48h cleanup
    liveCount = 1;
    dbActivity.wakeBroadcasts();
    await crons.reconcileLiveRooms();
    ok(queries > afterBootQueries, 'crons: wakeBroadcasts resumes DB reconciliation immediately');
    ok(staleCleanupCalls === 1, 'crons: stale 48h cleanup skipped within 1-hour window even when live');

    // Ending stream cleanly returns crons to idle on next sweep
    liveCount = 0;
    dbActivity.markBroadcastDirty();
    await crons.reconcileLiveRooms();
    const settledQueries = queries;
    await crons.handleStreamDisconnectWatchdog();
    await crons.handleCoinMeterWatchdog();
    await crons.reconcileLiveRooms();
    ok(queries === settledQueries, 'crons: returns to 0-query idle state once broadcasts end');

    // Adding near-term reminder wakes dispatchReminders immediately
    nextReminderDate = new Date(Date.now() + 10 * 60_000);
    dbActivity.notifyScheduledReminder(nextReminderDate);
    const beforeNearReminder = reminderDispatches;
    await crons.dispatchReminders();
    ok(reminderDispatches === beforeNearReminder + 1, 'crons: wakes immediately for near-term reminder');

    // Overdue unstarted reminder filtered out (findFirst returns null) returns reminder cron to sleep
    nextReminderDate = null;
    await crons.dispatchReminders();
    const afterReminderClear = reminderDispatches;
    await crons.dispatchReminders();
    ok(reminderDispatches === afterReminderClear, 'crons: returns reminder cron to sleep once none upcoming');
    dbActivity.resetForTest();
  }

  // 3. StreamsService public cache & version invalidation
  {
    dbActivity.resetForTest();
    let streamFindCalls = 0;
    const sample = [
      { id: 's2', status: 'SCHEDULED', title: 'Later' },
      { id: 's1', status: 'LIVE', title: 'Live Now' },
    ];
    const prismaMock: any = {
      stream: {
        findMany: async () => {
          streamFindCalls++;
          return [...sample];
        },
        create: async ({ data }: any) => ({ id: 'new-1', ...data }),
        findUnique: async () => ({ id: 'new-1', streamerId: 'u1', status: 'DRAFT' }),
        update: async ({ data }: any) => ({ id: 'new-1', ...data }),
      },
      streamCategory: {
        findUnique: async () => ({ id: 'c1', name: 'Pooja' }),
      },
    };
    const streamsSvc = new StreamsService(prismaMock, {} as any, {} as any);
    const first = await streamsSvc.getPublicStreams();
    const second = await streamsSvc.getPublicStreams();
    ok(streamFindCalls === 1 && first[0].status === 'LIVE' && second.length === 2, 'streams cache: serves unfiltered calls without extra DB hit');

    // Filtered calls bypass unfiltered cache
    await streamsSvc.getPublicStreams('c1', undefined);
    ok(streamFindCalls === 2, 'streams cache: filtered query runs against DB');

    // Version bump invalidates unfiltered cache immediately
    await streamsSvc.createStream('u1', { categoryId: 'c1', title: 'New', visibility: 'PUBLIC' } as any);
    await streamsSvc.getPublicStreams();
    ok(streamFindCalls === 3, 'streams cache: createStream invalidates public cache immediately');
  }

  // 4. AdminService category cache & invalidation
  {
    let catFindCalls = 0;
    const prismaMock: any = {
      streamCategory: {
        findMany: async () => {
          catFindCalls++;
          return [{ id: 'c1', name: 'Aarti', slug: 'aarti', displayOrder: 1 }];
        },
        create: async ({ data }: any) => ({ id: 'c2', ...data }),
        update: async ({ where, data }: any) => ({ id: where.id, ...data }),
        delete: async ({ where }: any) => ({ id: where.id, name: 'Aarti' }),
      },
      stream: {
        count: async () => 0,
      },
    };
    const adminSvc = new AdminService(prismaMock, {} as any, {} as any);
    await adminSvc.getCategories();
    await adminSvc.getCategories();
    ok(catFindCalls === 1, 'admin categories: caches repeated reads');

    await adminSvc.createCategory('Havan', 'havan', 2);
    await adminSvc.getCategories();
    ok(catFindCalls === 2, 'admin categories: invalidates cache on createCategory');

    await adminSvc.updateCategory('c2', 'Hawan');
    await adminSvc.getCategories();
    ok(catFindCalls === 3, 'admin categories: invalidates cache on updateCategory');

    await adminSvc.deleteCategory('c2');
    await adminSvc.getCategories();
    ok(catFindCalls === 4, 'admin categories: invalidates cache on deleteCategory');
  }

  // 5. PresenceService idle threshold stays long unless active or broadcast active
  {
    dbActivity.resetForTest();
    dbActivity.completeBroadcastSweep(false);
    let reconcileQueries = 0;
    const prismaMock: any = {
      stream: {
        findMany: async () => {
          reconcileQueries++;
          return [];
        },
      },
    };
    const origSetInterval = global.setInterval;
    let tickFn: any = null;
    (global as any).setInterval = ((fn: any) => {
      tickFn = fn;
      return { unref: () => {} };
    }) as any;

    const presenceSvc = new PresenceService(prismaMock, {} as any);
    presenceSvc.setGateway({ server: { engine: { clientsCount: 0 } } });
    (global as any).setInterval = origSetInterval;

    // First tick runs boot check; second immediate tick skips due to 3h idle backoff
    await tickFn();
    await Promise.resolve();
    const afterBootReconcile = reconcileQueries;
    await tickFn();
    await Promise.resolve();
    ok(afterBootReconcile === 1 && reconcileQueries === 1, 'presence: skips 30s DB reconcile while idle');

    // Waking broadcasts makes next tick reconcile immediately
    dbActivity.wakeBroadcasts();
    await tickFn();
    await Promise.resolve();
    ok(reconcileQueries === 2, 'presence: wakes 30s reconciler immediately when broadcast active');
    dbActivity.resetForTest();
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
