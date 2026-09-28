# 失能评估辅助系统 · 前端对接接口文档

> 本文档是前端对接的唯一依据。旧《后端接口文档.md》已作废，请以本文档为准。
> 全部接口已通过回归测试（44/44 通过，测试脚本见 `elder-eval-backend/test/regression.test.js`）。

---

## 一、基础信息

| 项目 | 内容 |
| --- | --- |
| 服务地址 | `http://localhost:3000/api`（开发环境；生产地址以部署为准） |
| 请求 Content-Type | `application/json` |
| 字符编码 | UTF-8 |

### 统一返回体

- **成功**：HTTP `200`（创建类 `201`），直接返回业务数据，列表接口套 `{ list, total }`：

```json
{ "list": [], "total": 0 }
```

- **失败**：HTTP 4xx/5xx，统一返回：

```json
{ "message": "错误原因描述" }
```

前端统一读取 `message` 字段展示错误提示。

### HTTP 状态码

| 状态码 | 含义 | 前端处理建议 |
| --- | --- | --- |
| 200 / 201 | 成功 | 正常处理数据 |
| 400 | 参数错误 / 业务校验失败 | 弹 `message` 提示 |
| 401 | 未登录 / token 失效 / 账号已删除 | 清空登录态，跳转登录页 |
| 403 | 无权限（如评估员访问管理员接口） | 提示「暂无权限」 |
| 404 | 资源不存在或已删除 | 提示「数据不存在或已删除」 |
| 500 | 服务器内部错误 | 提示「系统异常，请联系管理员」 |

### Token 鉴权规则

- 除「登录」「注册」外，所有接口都需登录态。
- 请求头携带：`Authorization: Bearer <token>`
- `token` 由登录/注册接口返回，前端持久化并在每次请求自动附带。
- token 有效期 7 天，过期后接口返回 `401`，前端按 401 统一处理。
- 收到 `401` 时，前端自动清空登录态并跳转登录页。

---

## 二、改造变更点（重点标注）

1. **接口契约已更新，旧文档作废**：外层字段全部改为 `snake_case`（如 `created_at`、`id_card`、`elder_id`），主键 `id` 由字符串改为**数字（自增）**。注意 `scores` 内 5 个 key（`lifeAbility`、`workAbility`、`timeOrientation`、`personOrientation`）保留 **camelCase**。前端请按本文档字段名对齐。
2. **22 项评估 scores 使用 JSON 存储**：`scores` 是一个 JSON 对象（22 个 key，取值 0/1/2），整体上传、整体返回。
3. **assessor 评估员信息是快照**：`assessor` 保存评估当时的姓名快照，**不会随用户表实时更新**（改用户姓名不影响历史评估记录）。
4. **评估人由后端自动填充**：新增评估时 `assessor`/`assessor_id` 由后端根据登录 token 自动写入，**前端无需（也不要）在请求体传评估人字段**。

### 枚举取值

| 字段 | 取值 | 前端展示 |
| --- | --- | --- |
| `role` | `admin` / `staff` | 管理员 / 评估员 |
| `gender` | `MALE` / `FEMALE` | 男 / 女 |
| `corrected` | `true` / `false` | 是否发生过纠正 |

---

## 三、接口明细（16 个）

### 认证 Auth

#### 1. 登录

`POST /auth/login`

请求参数：

| 参数 | 类型 | 必传 | 说明 |
| --- | --- | --- | --- |
| username | string | 是 | 登录名 |
| password | string | 是 | 密码 |

```json
// 请求
{ "username": "admin", "password": "admin123" }

// 返回 200
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 1, "username": "admin", "name": "系统管理员", "role": "admin", "created_at": 1720000000000, "updated_at": 1720000000000 }
}
// 失败 401
{ "message": "用户名或密码错误" }
```

#### 2. 注册

`POST /auth/register`

| 参数 | 类型 | 必传 | 说明 |
| --- | --- | --- | --- |
| username | string | 是 | 登录名（唯一） |
| password | string | 是 | 密码 |
| name | string | 是 | 姓名 |

```json
// 请求
{ "username": "wang", "password": "123456", "name": "王评估员" }

// 返回 200（同登录，role 固定 staff）
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": 2, "username": "wang", "name": "王评估员", "role": "staff", "created_at": 1720000000000, "updated_at": 1720000000000 }
}
// 失败 400：用户名已存在 / 参数缺失
```

#### 3. 当前用户信息（会话恢复）

`GET /auth/me`

```json
// 返回 200
{ "id": 1, "username": "admin", "name": "系统管理员", "role": "admin", "created_at": 1720000000000, "updated_at": 1720000000000 }
```

---

### 老人管理 Elders

#### 4. 老人列表

`GET /elders?keyword=张`

| 参数 | 类型 | 必传 | 说明 |
| --- | --- | --- | --- |
| keyword | string | 否 | 模糊匹配姓名/身份证/电话 |

```json
// 返回 200
{
  "list": [
    {
      "id": 1,
      "name": "张大爷",
      "gender": "MALE",
      "age": 81,
      "id_card": "110101194501012233",
      "address": "北京市朝阳区",
      "phone": "13800001111",
      "children_phone": "13900002222",
      "created_at": 1720000000000,
      "updated_at": 1720000000000
    }
  ],
  "total": 1
}
```

#### 5. 新增老人

`POST /elders`

| 参数 | 类型 | 必传 | 说明 |
| --- | --- | --- | --- |
| name | string | 是 | 姓名 |
| gender | string | 否 | `MALE` / `FEMALE` |
| age | number | 否 | 年龄；不传则按 id_card 自动推算 |
| id_card | string | 否 | 18 位身份证号 |
| address | string | 否 | 家庭住址 |
| phone | string | 否 | 联系电话 |
| children_phone | string | 否 | 儿女/紧急联系人电话 |

```json
// 请求
{ "name": "张大爷", "gender": "MALE", "id_card": "110101194501012233", "address": "北京市朝阳区", "phone": "13800001111", "children_phone": "13900002222" }

// 返回 201（age 由 id_card 推算）
{ "id": 2, "name": "张大爷", "gender": "MALE", "age": 81, "id_card": "110101194501012233", "address": "北京市朝阳区", "phone": "13800001111", "children_phone": "13900002222", "created_at": 1720000000000, "updated_at": 1720000000000 }
```

#### 6. 老人详情

`GET /elders/:id`

```json
// 返回 200（同列表项结构）
{ "id": 1, "name": "张大爷", "gender": "MALE", "age": 81, "id_card": "...", "address": "...", "phone": "...", "children_phone": "...", "created_at": 1720000000000, "updated_at": 1720000000000 }
// 404：老人不存在或已删除
```

#### 7. 更新老人

`PUT /elders/:id`

请求参数同「新增老人」，字段均可选，未传则保留原值；更新 `id_card` 且未传 `age` 时重新推算年龄。

```json
// 请求
{ "name": "张大爷", "gender": "MALE" }

// 返回 200（更新后的完整对象）
```

#### 8. 删除老人

`DELETE /elders/:id`

```json
// 返回 200
{ "ok": true }
// 备注：软删除，列表/详情不再返回；其评估记录随之隐藏
```

---

### 评估 Assessments

#### 9. 评估列表

`GET /assessments?elder_id=1`

| 参数 | 类型 | 必传 | 说明 |
| --- | --- | --- | --- |
| elder_id | number | 否 | 按老人筛选 |

```json
// 返回 200
{
  "list": [
    {
      "id": 1,
      "elder_id": 1,
      "scores": { "feeding": 0, "dressing": 1, "bowel": 0, "bladder": 0, "toileting": 1, "transfer": 1, "walking": 2, "stairs": 2, "bathing": 2, "grooming": 1, "cognition": 0, "aggression": 0, "depression": 0, "consciousness": 0, "vision": 0, "hearing": 1, "communication": 0, "lifeAbility": 1, "workAbility": 1, "timeOrientation": 0, "personOrientation": 0, "socialContact": 1 },
      "dimension_levels": { "adl": 2, "mental": 0, "sensory": 0, "social": 1 },
      "computed_level": 2,
      "manual_level": 2,
      "corrected": false,
      "correction_note": "",
      "assessor": "王评估员",
      "assessor_id": 2,
      "date": "2026-09-22",
      "created_at": 1720000000000
    }
  ],
  "total": 1
}
```

#### 10. 新增评估

`POST /assessments`

| 参数 | 类型 | 必传 | 说明 |
| --- | --- | --- | --- |
| elder_id | number | 是 | 关联老人 id |
| scores | object | 是 | 22 项打分（0/1/2） |
| dimension_levels | object | 否 | 四维度等级 `{adl,mental,sensory,social}` |
| computed_level | number | 否 | 系统计算等级（默认 0） |
| manual_level | number | 否 | 最终等级（默认等于 computed_level） |
| correction_note | string | 否 | 纠正说明（manual_level ≠ computed_level 时**必填**） |
| date | string | 否 | 评估日期 `YYYY-MM-DD`；不传默认取当天 |

```json
// 请求
{
  "elder_id": 1,
  "scores": { "feeding": 0, "dressing": 1, "bowel": 0, "bladder": 0, "toileting": 1, "transfer": 1, "walking": 2, "stairs": 2, "bathing": 2, "grooming": 1, "cognition": 0, "aggression": 0, "depression": 0, "consciousness": 0, "vision": 0, "hearing": 1, "communication": 0, "lifeAbility": 1, "workAbility": 1, "timeOrientation": 0, "personOrientation": 0, "socialContact": 1 },
  "dimension_levels": { "adl": 2, "mental": 0, "sensory": 0, "social": 1 },
  "computed_level": 2,
  "manual_level": 2,
  "date": "2026-09-24"
}

// 返回 201（assessor/assessor_id 由后端自动填充）
{
  "id": 2,
  "elder_id": 1,
  "scores": { "...": 0 },
  "dimension_levels": { "adl": 2, "mental": 0, "sensory": 0, "social": 1 },
  "computed_level": 2,
  "manual_level": 2,
  "corrected": false,
  "correction_note": "",
  "assessor": "系统管理员",
  "assessor_id": 1,
  "date": "2026-09-24",
  "created_at": 1720000000000
}
// 失败 400：elder_id/scores 为空、scores 含未知 key 或取值非 0/1/2、computed_level/manual_level 取值非 0-3、纠正未填说明
// 失败 404：老人不存在
```

#### 11. 评估详情

`GET /assessments/:id`

```json
// 返回 200（同列表项结构）
// 404：评估记录不存在或已删除
```

#### 12. 删除评估

`DELETE /assessments/:id`

```json
// 返回 200
{ "ok": true }
// 备注：软删除
```

---

### 报告 Reports

#### 13. 获取报告数据

`GET /reports/:assessmentId`

```json
// 返回 200
{
  "assessment": { /* Assessment 对象，同列表项 */ },
  "elder": { /* Elder 对象 */ }
}
// elder 为 null：老人已被删除
// 404：评估记录不存在
```

---

### 用户管理 Users（仅管理员）

> 以下接口需 `role = admin`，评估员访问返回 `403`。

#### 14. 用户列表

`GET /users`

```json
// 返回 200（不含 password 字段）
{
  "list": [
    { "id": 1, "username": "admin", "name": "系统管理员", "role": "admin", "created_at": 1720000000000, "updated_at": 1720000000000 },
    { "id": 2, "username": "wang", "name": "王评估员", "role": "staff", "created_at": 1720000000000, "updated_at": 1720000000000 }
  ],
  "total": 2
}
```

#### 15. 更新用户

`PUT /users/:id`

| 参数 | 类型 | 必传 | 说明 |
| --- | --- | --- | --- |
| name | string | 否 | 新姓名 |
| role | string | 否 | `admin` / `staff` |
| password | string | 否 | 新密码（留空不改） |

```json
// 请求
{ "name": "王评估员", "role": "staff" }

// 返回 200（不含 password）
```

#### 16. 删除用户

`DELETE /users/:id`

```json
// 返回 200
{ "ok": true }
// 失败 400：不能删除自己
// 备注：软删除，被删账号无法再登录
```

---

## 四、scores 22 项 key 速查（对应国标 4 维度）

| 维度 | key |
| --- | --- |
| 日常生活活动能力 adl | `feeding` 进食、`dressing` 穿脱衣、`bowel` 大便控制、`bladder` 小便控制、`toileting` 如厕、`transfer` 床椅转移、`walking` 平地行走、`stairs` 上下楼梯、`bathing` 洗澡、`grooming` 修饰 |
| 精神状态 mental | `cognition` 认知功能、`aggression` 攻击行为、`depression` 抑郁症状 |
| 感知觉与沟通 sensory | `consciousness` 意识水平、`vision` 视力、`hearing` 听力、`communication` 沟通交流 |
| 社会参与 social | `lifeAbility` 生活能力、`workAbility` 工作能力、`timeOrientation` 时间/空间定向、`personOrientation` 人物定向、`socialContact` 社会交往能力 |

每项取值 `0` / `1` / `2`；`computed_level` / `manual_level` 取值 `0` 能力完好 / `1` 轻度失能 / `2` 中度失能 / `3` 重度失能。

---

## 五、对接注意事项

1. 外层字段名**全部 snake_case**，`id` 为数字，不要沿用旧文档的 camelCase / 字符串 id；`scores` 内 5 个 key（`lifeAbility`、`workAbility`、`timeOrientation`、`personOrientation`）保留 camelCase。
2. `gender` 传 `MALE`/`FEMALE`，前端展示时映射为 男/女；传其他值返回 400。
3. 新增评估**不要传** `assessor`/`assessor_id`，后端自动填；纠正（`manual_level ≠ computed_level`）时必须传 `correction_note`，否则 400。
4. 所有删除为软删除，前端无需区分，仅表现为列表/详情不再出现。
5. 切换真实接口时，前端 `USE_MOCK` 改为 `false`，`baseURL` 指向 `/api`（或由代理转发）。
6. 服务端已做取值校验：`scores` key 限 22 项、取值 0/1/2；`computed_level`/`manual_level` 取值 0-3；`gender` 取值 `MALE`/`FEMALE`。传错返回 400，前端无需自行兜底。
