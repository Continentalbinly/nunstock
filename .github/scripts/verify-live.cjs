// Read-only deployment checks. Credentials and customer response bodies never enter logs.
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const requireApp = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = requireApp('@prisma/client');
const jwt = requireApp('jsonwebtoken');
const prisma = new PrismaClient();
let checks = 0;
async function check(base, path, cookie, expected = 200, html = false, label = path) {
    const response = await fetch(base + path, {
        headers: cookie ? { Cookie: cookie } : {},
        redirect: 'manual', signal: AbortSignal.timeout(15000),
    });
    assert.equal(response.status, expected, label + ': unexpected status');
    if (expected === 200) {
        if (html) {
            const body = await response.text();
            assert(body.includes('<html') && !body.includes('NEXT_HTTP_ERROR_FALLBACK;404'), label + ': invalid HTML');
        } else {
            const body = await response.json();
            assert(body.success !== false && !body.error, label + ': API error');
        }
    } else await response.arrayBuffer();
    checks++;
    console.log('PASS ' + label + ' (' + expected + ')');
}
(async () => {
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, username: true, name: true, role: true } });
    assert(user, 'An existing ADMIN is required for read checks');
    assert(process.env.JWT_SECRET, 'Missing signing secret');
    const cookie = 'nunstock_token=' + jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '5m' });
    const api = process.env.SMOKE_API_URL || 'http://127.0.0.1:1100';
    const web = process.env.SMOKE_CLIENT_URL || 'http://127.0.0.1:9090';
    await check(api, '/', undefined);
    await check(api, '/api/auth/me', undefined, 401);
    for (const path of ['/api/auth/me', '/api/auth/users', '/api/parts?limit=10', '/api/categories', '/api/stock/summary', '/api/stock/daily-summary', '/api/stock/weekly-summary', '/api/stock/monthly-summary', '/api/movements?limit=10', '/api/jobs?limit=10', '/api/jobs/summary', '/api/shop-stock/summary', '/api/lookup-options', '/api/car-types', '/api/notifications']) {
        await check(api, path, cookie);
    }
    for (const path of ['', '/consumables', '/insurance', '/paints', '/shop-stock', '/jobs', '/jobs/new', '/reports', '/notifications', '/line', '/printer-settings', '/settings/users']) await check(web, path, cookie, 200, true);
    await check(web, '/api/auth/me', cookie);
    await check(web, '/api/parts?pageSize=1', cookie);
    await check(web, '/login', undefined, 200, true);
    await check(web, '/', undefined, 307, true);
    const job = await prisma.job.findFirst({ select: { id: true } });
    if (job) await check(web, '/jobs/' + encodeURIComponent(job.id), cookie, 200, true, '/jobs/[id]');
    const canvas = requireApp('canvas').createCanvas(300, 100);
    requireApp('jsbarcode')(canvas, 'MIGRATION-CHECK', { format: 'CODE128' });
    assert(canvas.toBuffer('image/png').length > 10, 'Native barcode rendering failed');
    checks++;
    console.log('PASS native barcode rendering');
    console.log('Nunstock read-only smoke checks passed: ' + checks);
    await prisma.$disconnect();
})().catch(async error => { console.error(error.message); await prisma.$disconnect(); process.exitCode = 1; });
