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

**P5 已完成：产品库、媒体素材、资料、简繁校对、繁体公开页、视频双通道，外加全局搜索、数据导出与 3D 预览。**

已完成的内容：

| 能力 | 说明 |
|---|---|
| 工程骨架 | Next.js 15（App Router）+ TypeScript strict + Tailwind v4 |
| 数据模型 | Prisma + PostgreSQL，6 张表（accounts / categories / spec_fields / products / media_assets / materials） |
| 账号隔离 | Prisma 扩展 + AsyncLocalStorage 强制注入 `account_id`；禁用裸 SQL 与 `findUnique` |
| 鉴权 | Auth.js v5 凭据登录（argon2），管理员手动建号 |
| 产品库 | 分类与参数字典（均含简繁双语）、产品 CRUD、参数以 JSONB 存储 |
| 媒体素材 | 上传即生成主图（长边 3000px）+ 1600/800/320 三档 WebP，画廊预览与删除 |
| 配额 | 5 GB/人，上传前按「主图 + 衍生图」实际体积校验；超限拒绝且不落盘 |
| 资料 | TipTap 富文本编辑、资料 CRUD、关联产品、公开开关 |
| 视频 | 本地视频自动转 720p H.264 + faststart 并抽首帧做封面；YouTube 外链只存 videoId；两者都计入公开页 |
| 简繁转换 | OpenCC `twp`（台湾用语）自动生成繁体，型号与 slug 不参与转换；`<code>` / `<pre>` 内不转换 |
| 校对流程 | 正文改动自动退回待校对；校对页支持人工修正繁体，并提示基线表内残留的简体术语 |
| 公开页 | `/s/<slug>` 繁体展示：账号主页、产品详情（规格/画廊/相关文件）、文件阅读页；未公开内容一律 404 |
| OG 图 | `/api/og/<slug>/<model>` 动态生成 1200×630 卡片（产品图裁切，无图时品牌色底图） |
| 安全 | 公开页富文本按白名单清洗（去脚本/事件属性/iframe），外链自动补 `noopener` |
| 搜索 | 顶栏全局搜索，产品与资料一起搜，简体 / 繁体 / 型号三种写法都能命中 |
| 导出 | 产品清单 CSV（含规格列、带 BOM 可直接用 Excel 打开）与全量 JSON 备份 |
| 3D 预览 | .glb 上传（≤30 MB，校验文件头），公开页用 `<model-viewer>` 展示，支持轨道旋转 |
| 部署 | Dockerfile（含静态 ffmpeg）、docker-compose、Caddy 自动 HTTPS |
| 测试 | 54 个集成测试，覆盖越权 404、上下文强制、配额拦截、图片/视频/3D 管线、富文本转换、校对状态机、公开页边界、Range 请求、搜索与导出 |

> 公开页地址：`/s/<slug>`（账号主页）、`/s/<slug>/p/<型号>`（产品）、`/s/<slug>/m/<slug>`（文件）。
> 未公开的产品只存在于后台，直接访问其地址会返回 404。

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
│   │   ├── (dashboard)/       # 后台：产品 / 分类 / 参数字典 / 资料
│   │   ├── admin/accounts/    # 管理员建号
│   │   ├── media/[...key]/    # 开发期上传文件代理（含 Range，生产由 Caddy 直出）
│   │   ├── s/[slug]/          # 繁体公开展示页
│   │   ├── (dashboard)/search # 全局搜索
│   │   └── api/               # 鉴权与业务接口
│   ├── components/
│   │   ├── model-viewer.tsx   # 3D 预览（model-viewer web component）
│   │   └── video-embed.tsx    # YouTube facade（点击后才加载 iframe）
│   ├── lib/
│   │   ├── auth/              # 会话读取、表单 schema、守卫
│   │   ├── catalog/           # 产品 / 分类 / 参数校验 schema
│   │   ├── db/                # Prisma 客户端、账号作用域扩展
│   │   ├── export/            # CSV 序列化
│   │   ├── i18n/              # OpenCC 转换、富文本转换、术语基线表
│   │   ├── search/            # 全局搜索
│   │   ├── materials/         # 资料表单 schema
│   │   ├── media/             # sharp 图片管线、ffmpeg 视频管线
│   │   ├── quota/             # 配额校验与用量记账
│   │   └── storage/           # 存储抽象层（本地磁盘）
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
