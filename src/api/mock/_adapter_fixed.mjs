import { db, uid } from './db.js'

// 模拟网络延迟
const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms))

function respond(config, data, status = 200) {
  return {
    data,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: {},
    config,
    request: {},
  }
}

function fail(config, status, message) {
  return respond(config, { message }, status)
}

// 从本地会话中解析当前登录用户
function getAuthUser() {
  const token = localStorage.getItem('shineng_token')
  if (!token) return null
  const sessions = db.sessions.all()
  const userId = sessions[token]
  if (!userId) return null
  return db.users.byId(userId) || null
}

function parseBody(config) {
  if (config.data == null) return {}
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data)
    } catch {
      return {}
    }
  }
  return config.data
}

function stripPassword(user) {
  const { password, ...rest } = user
  return rest
}

// ---------------- 认证 ----------------
function handleLogin(config) {
  const { username, password } = parseBody(config)
  const user = db.users.byUsername(username)
  if (!user || user.password !== password) {
    return fail(config, 401, '用户名或密码错误')
  }
  const token = uid('t_')
  const sessions = db.sessions.all()
  sessions[token] = user.id
  db.sessions.save(sessions)
  return respond(config, { token, user: stripPassword(user) })
}

function handleRegister(config) {
  const { username, password, name } = parseBody(config)
  if (!username || !password) return fail(config, 400, '用户名和密码不能为空')
  if (db.users.byUsername(username)) return fail(config, 400, '用户名已存在')
  const user = {
    id: uid('u_'),
    username,
    password,
    name: name || username,
    role: 'staff',
    createdAt: Date.now(),
  }
  const users = db.users.all()
  users.push(user)
  db.users.save(users)
  const token = uid('t_')
  const sessions = db.sessions.all()
  sessions[token] = user.id
  db.sessions.save(sessions)
  return respond(config, { token, user: stripPassword(user) })
}

function handleMe(config) {
  const user = getAuthUser()
  if (!user) return fail(config, 401, '未登录或登录已过期')
  return respond(config, stripPassword(user))
}

// ---------------- 老人 CRUD ----------------
function requireAuth(config) {
  const user = getAuthUser()
  if (!user) return { error: fail(config, 401, '未登录或登录已过期') }
  return { user }
}

function handleListElders(config) {
  const { error } = requireAuth(config)
  if (error) return error
  const kw = String(config.params?.keyword || '').trim()
  let list = db.elders.all()
  if (kw) {
    list = list.filter((e) =>
      [e.name, e.idCard, e.phone].some((v) => (v || '').includes(kw))
    )
  }
  list = [...list].sort((a, b) => b.createdAt - a.createdAt)
  return respond(config, { list, total: list.length })
}

function handleCreateElder(config) {
  const { error } = requireAuth(config)
  if (error) return error
  const body = parseBody(config)
  if (!body.name) return fail(config, 400, '姓名不能为空')
  const elder = {
    id: uid('e_'),
    name: body.name,
    gender: body.gender || '',
    age: body.age ?? null,
    idCard: body.idCard || '',
    address: body.address || '',
    phone: body.phone || '',
    childrenPhone: body.childrenPhone || '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  const list = db.elders.all()
  list.push(elder)
  db.elders.save(list)
  return respond(config, elder, 201)
}

function handleGetElder(config, match) {
  const { error } = requireAuth(config)
  if (error) return error
  const elder = db.elders.byId(match[1])
  if (!elder) return fail(config, 404, '老人不存在')
  return respond(config, elder)
}

function handleUpdateElder(config, match) {
  const { error } = requireAuth(config)
  if (error) return error
  const list = db.elders.all()
  const idx = list.findIndex((e) => e.id === match[1])
  if (idx === -1) return fail(config, 404, '老人不存在')
  const body = parseBody(config)
  list[idx] = { ...list[idx], ...body, id: list[idx].id, updatedAt: Date.now() }
  db.elders.save(list)
  return respond(config, list[idx])
}

function handleDeleteElder(config, match) {
  const { error } = requireAuth(config)
  if (error) return error
  const list = db.elders.all()
  const next = list.filter((e) => e.id !== match[1])
  if (next.length === list.length) return fail(config, 404, '老人不存在')
  db.elders.save(next)
  // 级联删除该老人的评估记录
  db.assessments.save(db.assessments.all().filter((a) => a.elderId !== match[1]))
  return respond(config, { ok: true })
}

// ---------------- 评估 ----------------
function handleListAssessments(config) {
  const { error } = requireAuth(config)
  if (error) return error
  let list = db.assessments.all()
  const elderId = config.params?.elderId
  if (elderId) list = list.filter((a) => a.elderId === elderId)
  list = [...list].sort((a, b) => b.createdAt - a.createdAt)
  return respond(config, { list, total: list.length })
}

function handleCreateAssessment(config) {
  const { error, user } = requireAuth(config)
  if (error) return error
  const body = parseBody(config)
  if (!body.elderId) return fail(config, 400, '缺少老人信息')
  const assessment = {
    id: uid('a_'),
    elderId: body.elderId,
    scores: body.scores || {},
    dimensionLevels: body.dimensionLevels || {},
    computedLevel: body.computedLevel ?? 0,
    manualLevel: body.manualLevel ?? body.computedLevel ?? 0,
    corrected: !!body.corrected,
    correctionNote: body.correctionNote || '',
    assessor: user.name || user.username,
    assessorId: user.id,
    date: body.date || new Date().toISOString().slice(0, 10),
    createdAt: Date.now(),
  }
  const list = db.assessments.all()
  list.push(assessment)
  db.assessments.save(list)
  return respond(config, assessment, 201)
}

function handleGetAssessment(config, match) {
  const { error } = requireAuth(config)
  if (error) return error
  const a = db.assessments.byId(match[1])
  if (!a) return fail(config, 404, '评估记录不存在')
  return respond(config, a)
}

function handleReport(config, match) {
  const { error } = requireAuth(config)
  if (error) return error
  const a = db.assessments.byId(match[1])
  if (!a) return fail(config, 404, '评估记录不存在')
  return respond(config, { assessment: a, elder: db.elders.byId(a.elderId) || null })
}

// ---------------- 用户管理（管理员） ----------------
function requireAdmin(config) {
  const user = getAuthUser()
  if (!user) return { error: fail(config, 401, '未登录或登录已过期') }
  if (user.role !== 'admin') return { error: fail(config, 403, '无权限操作') }
  return { user }
}

function handleListUsers(config) {
  const { error } = requireAdmin(config)
  if (error) return error
  const list = db.users.all().map(stripPassword)
  return respond(config, { list, total: list.length })
}

function handleUpdateUser(config, match) {
  const { error } = requireAdmin(config)
  if (error) return error
  const list = db.users.all()
  const idx = list.findIndex((u) => u.id === match[1])
  if (idx === -1) return fail(config, 404, '用户不存在')
  const body = parseBody(config)
  if (body.password) list[idx].password = body.password
  if (body.name) list[idx].name = body.name
  if (body.role) list[idx].role = body.role
  db.users.save(list)
  return respond(config, stripPassword(list[idx]))
}

function handleDeleteUser(config, match) {
  const { error, user } = requireAdmin(config)
  if (error) return error
  if (match[1] === user.id) return fail(config, 400, '不能删除自己')
  const list = db.users.all()
  const next = list.filter((u) => u.id !== match[1])
  if (next.length === list.length) return fail(config, 404, '用户不存在')
  db.users.save(next)
  return respond(config, { ok: true })
}

const routes = [
  { method: 'POST', pattern: /^\/auth\/login$/, handler: handleLogin },
  { method: 'POST', pattern: /^\/auth\/register$/, handler: handleRegister },
  { method: 'GET', pattern: /^\/auth\/me$/, handler: handleMe },
  { method: 'GET', pattern: /^\/elders$/, handler: handleListElders },
  { method: 'POST', pattern: /^\/elders$/, handler: handleCreateElder },
  { method: 'GET', pattern: /^\/elders\/([^/]+)$/, handler: handleGetElder },
  { method: 'PUT', pattern: /^\/elders\/([^/]+)$/, handler: handleUpdateElder },
  { method: 'DELETE', pattern: /^\/elders\/([^/]+)$/, handler: handleDeleteElder },
  { method: 'GET', pattern: /^\/assessments$/, handler: handleListAssessments },
  { method: 'POST', pattern: /^\/assessments$/, handler: handleCreateAssessment },
  { method: 'GET', pattern: /^\/assessments\/([^/]+)$/, handler: handleGetAssessment },
  { method: 'GET', pattern: /^\/reports\/([^/]+)$/, handler: handleReport },
  { method: 'GET', pattern: /^\/users$/, handler: handleListUsers },
  { method: 'PUT', pattern: /^\/users\/([^/]+)$/, handler: handleUpdateUser },
  { method: 'DELETE', pattern: /^\/users\/([^/]+)$/, handler: handleDeleteUser },
]

export async function mockAdapter(config) {
  await delay()
  const method = (config.method || 'get').toUpperCase()
  const url = config.url || ''
  const route = routes.find((r) => r.method === method && r.pattern.test(url))
  if (!route) {
    return fail(config, 404, `接口不存在：${method} ${url}`)
  }
  const match = url.match(route.pattern)
  try {
    return route.handler(config, match)
  } catch (e) {
    console.error('[mock] handler error', e)
    return fail(config, 500, '服务器内部错误')
  }
}
