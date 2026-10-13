# 失能评估辅助系统 · 前端对接接口文档

> 本文档是前端对接的唯一依据。旧《后端接口文档.md》已作废，请以本文档为准。
> 全部接口已通过回归测试（50/50 通过，测试脚本见 `elder-eval-backend/test/regression.test.js`）。

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

1. **接口契约已更新，旧文档作废**：外层字段全部改为 `snake_case`（如 `created_at`、`id_card`、`elder_id`），主键 `id` 由字符串改为**数字（自增）**。注意 `scores` 内 26 个指标 key 全部为 **camelCase**（如 `dressingUpper`、`timeOrientation`）。前端请按本文档字段名对齐。
2. **26 项评估 scores 使用 JSON 存储**（依据 GB/T 42195-2022）：`scores` 是一个 JSON 对象（26 个 key），整体上传、整体返回。多数 key 取值 `0~4` 五档，个别 key 满分不同（上下楼梯/交通 0~3，攻击/抑郁 0~1，意识/视力/听力 0~2）。
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
      "scores": { "eating": 3, "grooming": 3, "bathing": 2, "dressingUpper": 3, "dressingLower": 3, "urineControl": 4, "stoolControl": 4, "toileting": 3, "bedMobility": 4, "chairTransfer": 4, "walking": 3, "stairs": 2, "timeOrientation": 4, "spaceOrientation": 4, "personOrientation": 4, "memory": 3, "comprehension": 4, "expression": 4, "aggression": 0, "depression": 0, "consciousness": 2, "vision": 2, "hearing": 1, "dailyAffairs": 3, "transport": 2, "socialContact": 3 },
      "dimension_levels": {},
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
| scores | object | 是 | 26 项打分（多数 0~4，上下楼梯/交通 0~3，攻击/抑郁 0~1，意识/视力/听力 0~2） |
| computed_level | number | 否 | 系统计算等级 0-4（默认 0） |
| manual_level | number | 否 | 最终等级 0-4（默认等于 computed_level） |
| correction_note | string | 否 | 纠正说明（manual_level ≠ computed_level 时**必填**） |
| date | string | 否 | 评估日期 `YYYY-MM-DD`；不传默认取当天 |
| qa | object | 否 | 问答观察记录 `{ photo, questions, summary }`，结构见下方说明 |

```json
// 请求
{
  "elder_id": 1,
  "scores": { "eating": 3, "grooming": 3, "bathing": 2, "dressingUpper": 3, "dressingLower": 3, "urineControl": 4, "stoolControl": 4, "toileting": 3, "bedMobility": 4, "chairTransfer": 4, "walking": 3, "stairs": 2, "timeOrientation": 4, "spaceOrientation": 4, "personOrientation": 4, "memory": 3, "comprehension": 4, "expression": 4, "aggression": 0, "depression": 0, "consciousness": 2, "vision": 2, "hearing": 1, "dailyAffairs": 3, "transport": 2, "socialContact": 3 },
  "computed_level": 2,
  "manual_level": 2,
  "date": "2026-09-24"
}

// 返回 201（assessor/assessor_id 由后端自动填充）
{
  "id": 2,
  "elder_id": 1,
  "scores": { "eating": 3, "grooming": 3, "...": 0 },
  "dimension_levels": {},
  "computed_level": 2,
  "manual_level": 2,
  "corrected": false,
  "correction_note": "",
  "assessor": "系统管理员",
  "assessor_id": 1,
  "date": "2026-09-24",
  "created_at": 1720000000000
}
// 失败 400：elder_id/scores 为空、scores 含未知 key 或取值超出该项满分、computed_level/manual_level 取值非 0-4、纠正未填说明
// 失败 404：老人不存在
```

**qa 字段结构（可选）**：问答观察记录，随评估一起存储/返回。

```json
{
  "photo": "data:image/jpeg;base64,...",
  "questions": [
    { "key": "cognition", "item": "认知功能", "question": "请老人做简单计算…", "answer": 0, "note": "" }
  ],
  "summary": "问答观察：认知功能：正常；…"
}
```
- `answer` 取值 `null`(未记录) / `0` / `1` / `2`。
- 未做问答/未拍照时，后端存 `null`。

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

## 四、scores 26 项 key 速查（GB/T 42195-2022，总分 90）

| 一级指标（4 个） | 二级指标 key（满分） |
| --- | --- |
| 自理能力 | `eating` 进食(4)、`grooming` 修饰(4)、`bathing` 洗澡(4)、`dressingUpper` 穿/脱上衣(4)、`dressingLower` 穿/脱裤子和鞋袜(4)、`urineControl` 小便控制(4)、`stoolControl` 大便控制(4)、`toileting` 如厕(4) |
| 基础运动能力 | `bedMobility` 床上体位转移(4)、`chairTransfer` 床椅转移(4)、`walking` 平地行走(4)、`stairs` 上下楼梯(3) |
| 精神状态 | `timeOrientation` 时间定向(4)、`spaceOrientation` 空间定向(4)、`personOrientation` 人物定向(4)、`memory` 记忆(4)、`comprehension` 理解能力(4)、`expression` 表达能力(4)、`aggression` 攻击行为(1)、`depression` 抑郁症状(1)、`consciousness` 意识水平(2) |
| 感知觉与社会参与 | `vision` 视力(2)、`hearing` 听力(2)、`dailyAffairs` 执行日常事务(4)、`transport` 使用交通工具外出(3)、`socialContact` 社会交往能力(4) |

- 每项得分为 `0~该项满分`，**得分越高能力越好**；总分 0~90。
- `computed_level` / `manual_level` 取值：`0` 能力完好(≥90) / `1` 轻度失能(66~89) / `2` 中度失能(46~65) / `3` 重度失能(30~45) / `4` 完全失能(0~29)。
- 特殊规则：意识水平=0（昏睡/昏迷）直接判为 `4` 完全失能；痴呆/精神障碍/近 30 天 2 次照护风险事件需「提高一级」（暂未纳入，见 `scoring.js` 注释）。

---

## 五、对接注意事项

1. 外层字段名**全部 snake_case**，`id` 为数字，不要沿用旧文档的 camelCase / 字符串 id；`scores` 内 26 个 key 全部 camelCase。
2. `gender` 传 `MALE`/`FEMALE`，前端展示时映射为 男/女；传其他值返回 400。
3. 新增评估**不要传** `assessor`/`assessor_id`，后端自动填；纠正（`manual_level ≠ computed_level`）时必须传 `correction_note`，否则 400。
4. 所有删除为软删除，前端无需区分，仅表现为列表/详情不再出现。
5. 切换真实接口时，前端 `USE_MOCK` 改为 `false`，`baseURL` 指向 `/api`（或由代理转发）。
6. 服务端已做取值校验：`scores` key 限 26 项、取值 0~该项满分（多数 0~4）；`computed_level`/`manual_level` 取值 0-4；`gender` 取值 `MALE`/`FEMALE`。传错返回 400，前端无需自行兜底。
