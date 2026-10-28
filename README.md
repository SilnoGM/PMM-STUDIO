# PMM Studio

**以产品为中心的内容中台与创作工作台——把产品参数、视觉素材和教程文档（Product / Media / Material）集中管理与加工，让市场与运营在一个地方直接产出可对外的产品内容。**

## 三大模块

| 字母 | 原词 | 模块 | 管什么 |
|:---:|---|---|---|
| **P** | Product | 产品库 | 产品型号、参数表、规格书、分类目录、SKU 管理 |
| **M** | Media | 媒体资源 | 产品图片、宣传视频、3D 模型、海报、Banner 等素材资产 |
| **M** | Material | 内容 / 资料 | 教程文档、技术手册、安装指南、案例文章、FAQ 等内容管理 |

一句话速记：**P**roduct 管「是什么」，**M**edia 管「看得见」，**M**aterial 管「用得上」。

三个模块共享同一个锚点：**以产品（P）为中心**，媒体与资料都是围绕产品组织的对外输出物。因此数据关系上始终是「产品关联素材 / 产品关联文档」，而不是三套互不相干的独立库。

## `Studio` 的含义

`Studio` 是工作室、创作工作台，而不是数据库。它约束了产品形态：

- 强调**产出** —— 能在这里加工出可直接对外发布的物料，而不只是存档；
- 强调**组织** —— 按产品、渠道聚合素材，支持复用与批量处理；
- 强调**门槛** —— 面向运营与市场人员，操作复杂度低于传统 PIM / DAM。

## 两个 M 怎么分

缩写里有两个 `M`，是实际落地最容易混的地方，判定口诀只有一句：

> **有查看器 / 播放器的归 Media，有阅读页 / 目录的归 Material。**

例如「安装视频教程」：视频文件归 Media，教程正文与步骤归 Material，后者引用前者的资源 ID，不重复上传。完整边界规则见[项目命名方案](docs/项目命名方案.md#5-模块边界判定规则)。

## 项目状态

**P0 已完成：工程骨架、账号隔离、登录与账号管理可运行；产品 / 媒体 / 资料模块待 P1 起实现。**

已完成的内容：

| 能力 | 说明 |
|---|---|
| 工程骨架 | Next.js 15（App Router）+ TypeScript strict + Tailwind v4 |
| 数据模型 | Prisma + PostgreSQL，6 张表（accounts / categories / spec_fields / products / media_assets / materials） |
| 账号隔离 | Prisma 扩展 + AsyncLocalStorage 强制注入 `account_id`；禁用裸 SQL 与 `findUnique` |
| 鉴权 | Auth.js v5 凭据登录（argon2），管理员手动建号 |
| 部署 | Dockerfile（含 ffmpeg）、docker-compose、Caddy 自动 HTTPS |
| 验收测试 | 跨账号越权返回 404（而非 403），未登录返回 401 |

## 快速开始（本地开发）

```bash
# 1. 起开发数据库（PostgreSQL 16，端口 5433）
docker compose -f docker-compose.dev.yml up -d

# 2. 配置环境变量
cp .env.example .env        # 填入 DATABASE_URL / TEST_DATABASE_URL / AUTH_SECRET / ADMIN_*

# 3. 安装依赖、迁移、创建管理员
pnpm install
pnpm db:migrate
pnpm db:seed

# 4. 启动
pnpm dev                    # http://localhost:3000
```

常用命令：

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 开发服务器（Turbopack） |
| `pnpm build` | 生产构建（standalone 输出） |
| `pnpm test` | 集成测试，跑真实 PostgreSQL，会清空测试库 |
| `pnpm typecheck` / `pnpm lint` | 类型检查与 ESLint（含隔离红线规则） |
| `pnpm db:migrate` / `pnpm db:deploy` | 开发迁移 / 生产迁移 |
| `pnpm db:seed` | 创建或重置管理员账号 |

测试库需要在首次运行前手动创建：`docker exec -it <pg容器> psql -U postgres -c 'CREATE DATABASE pmm_test'`。

## 目录结构

```text
PMM Studio/
├── docs/                      # 命名方案、技术选型
├── prisma/
│   ├── schema.prisma          # 数据模型
│   └── migrations/            # 迁移文件（必须入库）
├── scripts/
│   └── seed-admin.ts          # 创建首个管理员
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # 登录
│   │   ├── (dashboard)/       # 后台（需登录）
│   │   ├── admin/accounts/    # 管理员建号
│   │   └── api/               # 鉴权与业务接口
│   ├── lib/
│   │   ├── auth/              # 会话读取、表单 schema
│   │   └── db/                # Prisma 客户端、账号作用域扩展
│   └── types/                 # 类型增强
├── tests/                     # 隔离与越权测试
├── Dockerfile / docker-compose.yml / Caddyfile
└── README.md
```

## 文档

| 文档 | 内容 |
|---|---|
| [项目命名方案](docs/项目命名方案.md) | PMM 字母拆解、`Studio` 后缀定位、模块边界判定规则、代码与数据标识规范、对外表述模板、备选方案取舍、术语表、落地检查清单 |
| [技术选型方案](docs/技术选型方案.md) | 需求约束、四种方案对比、技术栈与不引入项、账号隔离策略、配额与磁盘预算、简繁双语模型、公开页路由、部署拓扑、分阶段计划、风险 |
