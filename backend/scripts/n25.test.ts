import 'reflect-metadata';
import { Logger } from '@nestjs/common';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };

const logs: string[] = [];
for (const k of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
  (Logger.prototype as any)[k] = function (msg: any) { logs.push(String(msg)); };
}
const load = () => {
  for (const k of Object.keys(require.cache)) if (k.includes('mailer.service') || k.includes('runtime-mode')) delete require.cache[k];
  return require('../src/modules/notifications/mailer.service');
};
const clearEnv = () => { for (const k of ['BREVO_API_KEY', 'BREVO_SMTP_KEY', 'SMTP_PASS', 'EMAIL_FROM_ADDRESS', 'SMTP_HOST']) delete process.env[k]; };

(async () => {
  const SECRET = 'a'.repeat(64);

  // 1. Production-like (NODE_ENV unset), nothing configured
  clearEnv(); delete process.env.NODE_ENV; logs.length = 0;
  let { MailerService } = load();
  let m = new MailerService();
  let r = await m.sendPasswordResetEmail('u@example.com', 'Asha', SECRET);
  ok(r === false, 'unconfigured production returns false (was: true, "sent")');
  ok(!logs.join('\n').includes(SECRET), 'no reset token in the logs in production');

  // 2. Production, SMTP configured but unreachable
  clearEnv(); process.env.NODE_ENV = 'production'; process.env.SMTP_HOST = '127.0.0.1'; process.env.SMTP_PORT = '1';
  process.env.BREVO_SMTP_KEY = 'k'; process.env.BREVO_SMTP_USER = 'u'; process.env.EMAIL_FROM_ADDRESS = 'no-reply@example.org'; logs.length = 0;
  ({ MailerService } = load()); m = new MailerService();
  const t0 = Date.now();
  r = await m.sendVerificationEmail('u@example.com', 'Asha', SECRET);
  ok(r === false, 'delivery failure is reported as false');
  ok(!logs.join('\n').includes(SECRET), 'failed delivery does not write the verify link to the logs');
  ok(Date.now() - t0 < 15000, 'failure returns within the timeout');

  // 3. Development still shows the link for developers
  clearEnv(); process.env.NODE_ENV = 'development'; logs.length = 0;
  ({ MailerService } = load()); m = new MailerService();
  r = await m.sendVerificationEmail('u@example.com', 'Asha', SECRET);
  ok(r === true && logs.join('\n').includes(SECRET), 'development: returns true and prints the link');

  // 4. No personal default sender
  clearEnv(); process.env.NODE_ENV = 'test';
  ({ MailerService } = load()); m = new MailerService();
  ok(!JSON.stringify(m).includes('gmail.com'), 'no built-in personal sender address');

  // 5. Streamer-controlled text is escaped in the mail body
  let captured = '';
  m.sendEmail = async (o: any) => { captured = o.htmlContent; return true; };
  await m.send15MinuteReminder('a@b.c', '<b>Name</b>', '<a href="http://evil.test">Claim prize</a>', '<script>x</script>', 'sid');
  ok(!captured.includes('evil.test"') && !captured.includes('<script>') && captured.includes('&lt;a href=&quot;http://evil.test'), 'stream title / streamer / user name are HTML-escaped');

  // 6. Reminder loop: unsent stays due, one failure does not stop the rest
  process.env.NODE_ENV = 'test';
  const { RemindersService } = require('../src/modules/notifications/reminders.service');
  const updated: string[] = [];
  const mk = (id: string) => ({ id, user: { email: id + '@x.y', name: id }, stream: { id: 's', title: 't', streamer: { name: 'p' } } });
  const prisma: any = { streamReminder: { findMany: async () => [mk('fail'), mk('throw'), mk('good')], update: async ({ where }: any) => { updated.push(where.id); } } };
  const mailer: any = { send15MinuteReminder: async (to: string) => { if (to.startsWith('throw')) throw new Error('boom'); return !to.startsWith('fail'); } };
  const svc = new RemindersService(prisma, mailer);
  await svc.dispatch15MinuteReminders();
  ok(updated.length === 1 && updated[0] === 'good', 'only delivered reminders are marked sent; loop survives a throw');

  // 7. /auth/me exposes hasPassword, never the hash
  const { AuthController } = require('../src/modules/auth/auth.controller');
  const { AuthService } = require('../src/modules/auth/auth.service');
  const rows: any = { g: { passwordHash: null }, p: { passwordHash: '$2a$hash' } };
  const authSvc: any = Object.create(AuthService.prototype); authSvc.prisma = { user: { findUnique: async ({ where }: any) => rows[where.id] } };
  const ctl: any = Object.create(AuthController.prototype); ctl.authService = authSvc;
  const g = await ctl.getMe({ id: 'g', email: 'g@x.y' }); const pw = await ctl.getMe({ id: 'p', email: 'p@x.y' });
  ok(g.hasPassword === false && pw.hasPassword === true && !JSON.stringify([g, pw]).includes('hash'), '/auth/me reports hasPassword without exposing the hash');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
