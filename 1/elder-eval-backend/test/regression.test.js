// 回归测试：覆盖 api-docs.md 声明的 16 个接口契约 + 服务端校验
// 运行：node --test test/regression.test.js
const path = require('node:path');
const fs = require('node:fs');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// 隔离测试库：必须在 require app（进而 require db/init）之前设置
const TEST_DIR = path.join(__dirname, 'tmp');
fs.rmSync(TEST_DIR, { recursive: true, force: true });
fs.mkdirSync(TEST_DIR, { recursive: true });
process.env.DB_PATH = path.join(TEST_DIR, 'test.db');
process.env.JWT_SECRET = 'test-secret-2026';

const { start } = require('../app');
const { db } = require('../db/init');

let server;
let base;
let adminToken;
let staffToken;

const SCORES = {
  feeding: 0, dressing: 1, bowel: 0, bladder: 0, toileting: 1, transfer: 1,
  walking: 2, stairs: 2, bathing: 2, grooming: 1,
  cognition: 0, aggression: 0, depression: 0,
  consciousness: 0, vision: 0, hearing: 1, communication: 0,
  lifeAbility: 1, workAbility: 1, timeOrientation: 0, personOrientation: 0, socialContact: 1
};

async function api(method, url, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${url}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

before(async () => {
  server = await start(0);
  base = `http://127.0.0.1:${server.address().port}/api`;

  const login = await api('POST', '/auth/login', { body: { username: 'admin', password: 'admin123' } });
  assert.equal(login.status, 200);
  adminToken = login.data.token;

  const reg = await api('POST', '/auth/register', { body: { username: 'staff1', password: '123456', name: '王评估员' } });
  assert.equal(reg.status, 200);
  staffToken = reg.data.token;
});

after(() => {
  server?.close();
  try { db.close(); } catch {}
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

let elderId;
let assessmentId;

test('登录成功返回 token 与用户（不含 password）', async () => {
  const { status, data } = await api('POST', '/auth/login', { body: { username: 'admin', password: 'admin123' } });
  assert.equal(status, 200);
  assert.ok(data.token);
  assert.equal(data.user.role, 'admin');
  assert.equal(data.user.password, undefined);
  assert.equal(typeof data.user.id, 'number');
});

test('登录密码错误返回 401', async () => {
  const { status, data } = await api('POST', '/auth/login', { body: { username: 'admin', password: 'wrong' } });
  assert.equal(status, 401);
  assert.ok(data.message);
});

test('登录缺参数返回 400', async () => {
  const { status } = await api('POST', '/auth/login', { body: { username: 'admin' } });
  assert.equal(status, 400);
});

test('注册成功 role 固定 staff', async () => {
  const { status, data } = await api('POST', '/auth/register', { body: { username: 'staff2', password: '123456', name: '李评估员' } });
  assert.equal(status, 200);
  assert.equal(data.user.role, 'staff');
});

test('注册用户名重复返回 400', async () => {
  const { status } = await api('POST', '/auth/register', { body: { username: 'staff2', password: '123456', name: '李评估员' } });
  assert.equal(status, 400);
});

test('注册缺姓名返回 400', async () => {
  const { status } = await api('POST', '/auth/register', { body: { username: 'staff3', password: '123456' } });
  assert.equal(status, 400);
});

test('GET /auth/me 返回当前用户', async () => {
  const { status, data } = await api('GET', '/auth/me', { token: adminToken });
  assert.equal(status, 200);
  assert.equal(data.username, 'admin');
});

test('未带 token 访问受保护接口返回 401', async () => {
  const { status } = await api('GET', '/elders');
  assert.equal(status, 401);
});

test('老人列表初始为空', async () => {
  const { status, data } = await api('GET', '/elders', { token: adminToken });
  assert.equal(status, 200);
  assert.deepEqual(data, { list: [], total: 0 });
});

test('新增老人：age 由 id_card 自动推算', async () => {
  const { status, data } = await api('POST', '/elders', {
    token: adminToken,
    body: { name: '张大爷', gender: 'MALE', id_card: '110101194501012233', address: '北京市朝阳区', phone: '13800001111', children_phone: '13900002222' }
  });
  assert.equal(status, 201);
  assert.equal(data.name, '张大爷');
  assert.equal(data.gender, 'MALE');
  assert.equal(typeof data.id, 'number');
  assert.equal(typeof data.age, 'number');
  elderId = data.id;
});

test('新增老人缺姓名返回 400', async () => {
  const { status } = await api('POST', '/elders', { token: adminToken, body: { gender: 'MALE' } });
  assert.equal(status, 400);
});

test('新增老人非法 gender 返回 400', async () => {
  const { status } = await api('POST', '/elders', { token: adminToken, body: { name: '李大爷', gender: 'X' } });
  assert.equal(status, 400);
});

test('老人详情返回对象', async () => {
  const { status, data } = await api('GET', `/elders/${elderId}`, { token: adminToken });
  assert.equal(status, 200);
  assert.equal(data.id, elderId);
});

test('老人详情不存在返回 404', async () => {
  const { status } = await api('GET', '/elders/99999', { token: adminToken });
  assert.equal(status, 404);
});

test('更新老人保留未传字段', async () => {
  const { status, data } = await api('PUT', `/elders/${elderId}`, { token: adminToken, body: { name: '张大爷改' } });
  assert.equal(status, 200);
  assert.equal(data.name, '张大爷改');
  assert.equal(data.gender, 'MALE');
});

test('更新老人非法 gender 返回 400', async () => {
  const { status } = await api('PUT', `/elders/${elderId}`, { token: adminToken, body: { gender: '男' } });
  assert.equal(status, 400);
});

test('老人列表 keyword 模糊匹配', async () => {
  const { status, data } = await api('GET', '/elders?keyword=张大爷', { token: adminToken });
  assert.equal(status, 200);
  assert.equal(data.total, 1);
});

test('删除老人返回 ok', async () => {
  const { status, data } = await api('DELETE', `/elders/${elderId}`, { token: adminToken });
  assert.equal(status, 200);
  assert.deepEqual(data, { ok: true });
});

test('重复删除老人返回 404', async () => {
  const { status } = await api('DELETE', `/elders/${elderId}`, { token: adminToken });
  assert.equal(status, 404);
});

test('为评估准备在用的老人', async () => {
  const { status, data } = await api('POST', '/elders', { token: adminToken, body: { name: '评估对象', gender: 'FEMALE', age: 78 } });
  assert.equal(status, 201);
  elderId = data.id;
});

test('新增评估：assessor 由后端自动填充', async () => {
  const { status, data } = await api('POST', '/assessments', {
    token: staffToken,
    body: { elder_id: elderId, scores: SCORES, dimension_levels: { adl: 2, mental: 0, sensory: 0, social: 1 }, computed_level: 2, manual_level: 2, date: '2026-09-24' }
  });
  assert.equal(status, 201);
  assert.equal(data.assessor, '王评估员');
  assert.equal(data.assessor_id, 2);
  assert.equal(data.corrected, false);
  assert.equal(typeof data.id, 'number');
  assessmentId = data.id;
});

test('新增评估缺 elder_id 返回 400', async () => {
  const { status } = await api('POST', '/assessments', { token: adminToken, body: { scores: SCORES } });
  assert.equal(status, 400);
});

test('新增评估缺 scores 返回 400', async () => {
  const { status } = await api('POST', '/assessments', { token: adminToken, body: { elder_id: elderId } });
  assert.equal(status, 400);
});

test('新增评估 scores 含未知 key 返回 400', async () => {
  const { status } = await api('POST', '/assessments', { token: adminToken, body: { elder_id: elderId, scores: { ...SCORES, foo: 1 } } });
  assert.equal(status, 400);
});

test('新增评估 scores 取值非法返回 400', async () => {
  const { status } = await api('POST', '/assessments', { token: adminToken, body: { elder_id: elderId, scores: { ...SCORES, feeding: 3 } } });
  assert.equal(status, 400);
});

test('新增评估 computed_level 越界返回 400', async () => {
  const { status } = await api('POST', '/assessments', { token: adminToken, body: { elder_id: elderId, scores: SCORES, computed_level: 4 } });
  assert.equal(status, 400);
});

test('新增评估 manual_level 越界返回 400', async () => {
  const { status } = await api('POST', '/assessments', { token: adminToken, body: { elder_id: elderId, scores: SCORES, computed_level: 1, manual_level: -1 } });
  assert.equal(status, 400);
});

test('新增评估纠正未填说明返回 400', async () => {
  const { status } = await api('POST', '/assessments', { token: adminToken, body: { elder_id: elderId, scores: SCORES, computed_level: 1, manual_level: 2 } });
  assert.equal(status, 400);
});

test('新增评估纠正填说明成功且 corrected=true', async () => {
  const { status, data } = await api('POST', '/assessments', { token: adminToken, body: { elder_id: elderId, scores: SCORES, computed_level: 1, manual_level: 2, correction_note: '复核调整' } });
  assert.equal(status, 201);
  assert.equal(data.corrected, true);
  assert.equal(data.correction_note, '复核调整');
});

test('新增评估不传 date 默认当天', async () => {
  const { status, data } = await api('POST', '/assessments', { token: adminToken, body: { elder_id: elderId, scores: SCORES } });
  assert.equal(status, 201);
  assert.match(data.date, /^\d{4}-\d{2}-\d{2}$/);
});

test('新增评估老人不存在返回 404', async () => {
  const { status } = await api('POST', '/assessments', { token: adminToken, body: { elder_id: 99999, scores: SCORES } });
  assert.equal(status, 404);
});

test('评估列表返回 list/total', async () => {
  const { status, data } = await api('GET', '/assessments', { token: adminToken });
  assert.equal(status, 200);
  assert.ok(Array.isArray(data.list));
  assert.equal(typeof data.total, 'number');
});

test('评估列表按 elder_id 筛选', async () => {
  const { status, data } = await api('GET', `/assessments?elder_id=${elderId}`, { token: adminToken });
  assert.equal(status, 200);
  assert.ok(data.list.every((a) => a.elder_id === elderId));
});

test('评估详情返回对象', async () => {
  const { status, data } = await api('GET', `/assessments/${assessmentId}`, { token: adminToken });
  assert.equal(status, 200);
  assert.equal(data.id, assessmentId);
});

test('评估详情不存在返回 404', async () => {
  const { status } = await api('GET', '/assessments/99999', { token: adminToken });
  assert.equal(status, 404);
});

test('报告返回 assessment 与 elder', async () => {
  const { status, data } = await api('GET', `/reports/${assessmentId}`, { token: adminToken });
  assert.equal(status, 200);
  assert.ok(data.assessment);
  assert.ok(data.elder);
});

test('老人删除后报告 elder 为 null', async () => {
  const { status, data: created } = await api('POST', '/elders', { token: adminToken, body: { name: '待删老人', gender: 'MALE', age: 70 } });
  assert.equal(status, 201);
  const { status: s2, data: a } = await api('POST', '/assessments', { token: adminToken, body: { elder_id: created.id, scores: SCORES } });
  assert.equal(s2, 201);
  await api('DELETE', `/elders/${created.id}`, { token: adminToken });
  const { status: s3, data: report } = await api('GET', `/reports/${a.id}`, { token: adminToken });
  assert.equal(s3, 200);
  assert.equal(report.elder, null);
});

test('用户列表不含 password（管理员）', async () => {
  const { status, data } = await api('GET', '/users', { token: adminToken });
  assert.equal(status, 200);
  assert.ok(data.list.every((u) => u.password === undefined));
});

test('评估员访问用户管理返回 403', async () => {
  const { status } = await api('GET', '/users', { token: staffToken });
  assert.equal(status, 403);
});

test('更新用户姓名/角色成功', async () => {
  const { status, data } = await api('PUT', '/users/2', { token: adminToken, body: { name: '王评估员改', role: 'staff' } });
  assert.equal(status, 200);
  assert.equal(data.name, '王评估员改');
  assert.equal(data.password, undefined);
});

test('assessor 为快照，改姓名不影响历史评估', async () => {
  const { status, data } = await api('GET', `/assessments/${assessmentId}`, { token: adminToken });
  assert.equal(status, 200);
  assert.equal(data.assessor, '王评估员');
});

test('更新用户非法角色返回 400', async () => {
  const { status } = await api('PUT', '/users/2', { token: adminToken, body: { role: 'boss' } });
  assert.equal(status, 400);
});

test('删除用户成功', async () => {
  const { status, data } = await api('DELETE', '/users/2', { token: adminToken });
  assert.equal(status, 200);
  assert.deepEqual(data, { ok: true });
});

test('删除自己返回 400', async () => {
  const { status } = await api('DELETE', '/users/1', { token: adminToken });
  assert.equal(status, 400);
});
