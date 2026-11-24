// Needs a local LiveKit server:  livekit-server --dev --bind 127.0.0.1 --node-ip 127.0.0.1
// and frontend deps installed (livekit-client UMD) + playwright. Run: npx ts-node --transpile-only scripts/video-guest.livekit.e2e.ts
import 'reflect-metadata';
process.env.LIVEKIT_URL = 'http://127.0.0.1:7880'; process.env.LIVEKIT_API_KEY = 'devkey'; process.env.LIVEKIT_API_SECRET = 'secret';
const { LiveKitProviderService } = require('../src/modules/video/providers/livekit-provider.service');
const { chromium } = require('playwright');
const fs = require('fs');
let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${m}`); };
(async () => {
  const lk = new LiveKitProviderService();
  const room = 'room-' + Date.now();
  await lk.createRoom({ roomName: room });
  const tok = (id: string, o: any) => lk.generateToken({ roomName: room, participantId: id, participantName: id, canSubscribe: true, ttlMinutes: 5, ...o });
  const T = {
    pandit: await tok('pandit', { isPublisher: true, metadata: { role: 'streamer' } }),
    priv: await tok('priv', { isPublisher: false, canPublish: true, publishSources: ['camera', 'microphone'], metadata: { role: 'private_viewer' } }),
    A: await tok('A', { isPublisher: false, metadata: { role: 'viewer' } }),
    B: await tok('B', { isPublisher: false, metadata: { role: 'viewer' } }),
  };
  const b = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessChecks,BlockInsecurePrivateNetworkRequests'] });
  const page = await (await b.newContext({ permissions: ['camera', 'microphone'] })).newPage();
  page.on('console', (m: any) => { if (/error/i.test(m.type())) console.log('  [page]', m.text()); });
  await page.route('http://127.0.0.1:9/', (r: any) => r.fulfill({ contentType: 'text/html', body: '<html><body>t</body></html>' }));
  await page.goto('http://127.0.0.1:9/');
  await page.addScriptTag({ content: fs.readFileSync(process.env.LIVEKIT_CLIENT_UMD || require.resolve('livekit-client/dist/livekit-client.umd.js', { paths: [process.cwd() + '/../frontend'] }), 'utf8') });
  await page.evaluate(() => {
    (window as any).C = {};
    (window as any).join = async (name: string, token: string) => {
      const r = new (window as any).LivekitClient.Room();
      await r.connect('ws://127.0.0.1:7880', token);
      (window as any).C[name] = r;
    };
    (window as any).tryPub = async (name: string, what: string) => {
      const r = (window as any).C[name];
      try {
        if (what === 'camera') await r.localParticipant.setCameraEnabled(true);
        if (what === 'mic') await r.localParticipant.setMicrophoneEnabled(true);
        if (what === 'screen') await r.localParticipant.setScreenShareEnabled(true);
        return 'ok';
      } catch (e: any) { return 'err:' + (e.message || e.name); }
    };
    (window as any).info = (observer: string, target: string) => {
      const r = (window as any).C[observer];
      const p = target === observer ? r.localParticipant : r.remoteParticipants.get(target);
      if (!p) return null;
      return { attrs: p.attributes, tracks: [...p.trackPublications.values()].map((t: any) => ({ s: t.source, muted: t.isMuted })), canPublish: p.permissions?.canPublish };
    };
  });
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const J = (n: string, t: string) => page.evaluate(([a, c]: string[]) => (window as any).join(a, c), [n, t]);
  const pub = (n: string, w: string) => page.evaluate(([a, c]: string[]) => (window as any).tryPub(a, c), [n, w]);
  const info = (o: string, t: string) => page.evaluate(([a, c]: string[]) => (window as any).info(a, c), [o, t]);
  const has = (i: any, src: string) => !!i?.tracks?.some((t: any) => t.s === src);

  const perms = (n: string) => page.evaluate((a: string) => { const p = (window as any).C[a].localParticipant.permissions; return p && { canPublish: p.canPublish, src: (p.canPublishSources || []).map(Number) }; }, n);
  const CAM = 1, MIC = 2, SCREEN = 3;

  // ── private room token
  await J('pandit', T.pandit); await J('priv', T.priv);
  let pr = await perms('priv');
  ok(pr?.canPublish === true && pr.src.includes(CAM) && pr.src.includes(MIC), 'private devotee token: may publish camera + microphone');
  ok(!pr.src.includes(SCREEN), 'private devotee token: screen share not allowed');
  const sc = await pub('priv', 'screen');
  ok(/insufficient|permission/i.test(sc), 'server rejects devotee screen share (' + sc.slice(0, 50) + ')');
  ok((await perms('pandit'))?.canPublish === true, 'pandit token can publish');

  // ── public room: viewers cannot publish until granted
  await J('A', T.A); await J('B', T.B);
  ok((await perms('A'))?.canPublish === false, 'public viewer token: cannot publish');
  const denied = await pub('A', 'camera');
  ok(/insufficient|permission/i.test(denied), 'server rejects public viewer camera before grant (' + denied.slice(0, 50) + ')');

  ok(await lk.updateParticipantPermissions(room, 'A', { canPublish: true, sources: ['camera', 'microphone'], attributes: { videoGuest: '1' } }), 'grant call succeeds on real LiveKit');
  await sleep(1200);
  pr = await perms('A');
  ok(pr?.canPublish === true && pr.src.includes(CAM) && pr.src.includes(MIC) && !pr.src.includes(SCREEN), 'guest client sees live permission: camera + mic only');
  ok((await info('pandit', 'A'))?.attrs?.videoGuest === '1', 'pandit sees the guest attribute');
  ok((await info('B', 'A'))?.attrs?.videoGuest === '1', 'other viewers see the guest attribute');
  ok((await perms('B'))?.canPublish === false, 'other viewer still cannot publish');
  const list = await lk.listParticipants(room);
  const g = list.find((p: any) => p.identity === 'A');
  ok(g.canPublish === true && g.attributes.videoGuest === '1', 'listParticipants reports canPublish + attribute (slot source of truth)');
  ok(list.filter((p: any) => p.attributes.videoGuest === '1' && p.canPublish).length === 1, 'exactly one guest');
  const scr = await pub('A', 'screen');
  ok(/insufficient|permission/i.test(scr), 'guest cannot screen share');

  ok(await lk.updateParticipantPermissions(room, 'A', { canPublish: false, attributes: { videoGuest: '' } }), 'revoke call succeeds');
  await sleep(1200);
  ok((await perms('A'))?.canPublish === false, 'guest client sees permission removed');
  ok(!(await info('pandit', 'A'))?.attrs?.videoGuest, 'guest attribute cleared');
  const again = await pub('A', 'camera');
  ok(/insufficient|permission/i.test(again), 'revoked viewer cannot publish again (' + again.slice(0, 50) + ')');
  const list2 = await lk.listParticipants(room);
  ok(list2.filter((p: any) => p.canPublish && p.attributes.videoGuest === '1').length === 0, 'slot is free after revoke');

  // reconnect with the original (viewer) token = no leftover guest rights
  await page.evaluate(() => (window as any).C.A.disconnect());
  await J('A', T.A);
  ok((await perms('A'))?.canPublish === false, 'rejoining resets to a plain viewer');
  ok(!(await info('pandit', 'A'))?.attrs?.videoGuest, 'no stale guest attribute after rejoin');

  await lk.endRoom(room);
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
