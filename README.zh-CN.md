[English](https://github.com/haiyewei/grf-cli/blob/main/README.md) | 简体中文

# Git Reference (grf)

一个轻量级的 CLI 工具，用于管理来自 Git 仓库的参考代码。轻松添加、加载和同步参考代码到你的项目中，而不会使主代码库变得混乱。

## 功能特点

- **添加和管理 Git 参考仓库** - 使用自定义别名跟踪多个参考仓库
- **将参考代码加载到工作目录** - 有选择地从参考仓库加载文件和目录
- **浅克隆支持** - 默认使用浅克隆节省磁盘空间
- **自动 .gitignore 管理** - 自动将加载的参考代码添加到 .gitignore
- **仓库更新和同步** - 使用简单的命令保持参考代码最新

## 安装

### 前置要求

- **Node.js** >= 18.0.0
- **Git** >= 2.0.0

### 通过 npm 安装

```bash
# 全局安装（推荐）
npm install -g grf-cli

# 或者使用 npx 无需安装
npx grf-cli <command>
```

## 快速开始

```bash
# 在项目中初始化 grf
grf config init

# 添加参考仓库
grf add https://github.com/example/awesome-utils.git --name utils

# 列出所有参考仓库
grf list

# 将参考代码加载到项目中
grf load utils src/helpers

# 更新所有参考到最新版本
grf update

# 不再需要时卸载参考代码
grf unload utils
```

## 命令

### add

添加参考仓库。

**语法：**

```bash
grf add <url> [options]
```

**参数：**

| 参数 | 类型   | 必需  | 默认值 | 描述         |
| ---- | ------ | ----- | ------ | ------------ |
| url  | string | ✅ 是 | -      | Git 仓库 URL |

**选项：**

| 选项         | 简写 | 类型    | 默认值 | 描述                 |
| ------------ | ---- | ------- | ------ | -------------------- |
| --name       | -n   | string  | -      | 自定义仓库名称       |
| --branch     | -b   | string  | -      | 指定分支             |
| --shallow    | -    | boolean | true   | 浅克隆（默认：启用） |
| --no-shallow | -    | boolean | -      | 完整克隆             |
| --depth      | -    | string  | "1"    | 浅克隆深度           |

**示例：**

```bash
# 使用默认设置添加仓库
grf add https://github.com/example/repo.git

# 使用自定义名称添加
grf add https://github.com/example/repo.git --name my-ref

# 添加特定分支
grf add https://github.com/example/repo.git --branch develop

# 完整克隆（非浅克隆）
grf add https://github.com/example/repo.git --no-shallow

# 使用自定义浅克隆深度
grf add https://github.com/example/repo.git --depth 10
```

---

### clean

清理缓存的仓库。

**语法：**

```bash
grf clean [name] [options]
```

**参数：**

| 参数 | 类型   | 必需  | 默认值 | 描述             |
| ---- | ------ | ----- | ------ | ---------------- |
| name | string | ❌ 否 | -      | 要移除的仓库名称 |

**选项：**

| 选项    | 简写 | 类型    | 默认值 | 描述               |
| ------- | ---- | ------- | ------ | ------------------ |
| --all   | -a   | boolean | false  | 移除所有缓存的仓库 |
| --force | -f   | boolean | false  | 跳过确认           |

**示例：**

```bash
# 移除特定的缓存仓库
grf clean my-ref

# 移除所有缓存的仓库（需要确认）
grf clean --all

# 无需确认移除所有缓存的仓库
grf clean --all --force

# 无需确认移除特定仓库
grf clean my-ref -f
```

---

### config

管理全局配置。

**语法：**

```bash
grf config [key] [value] [options]
```

**参数：**

| 参数  | 类型   | 必需  | 默认值 | 描述   |
| ----- | ------ | ----- | ------ | ------ |
| key   | string | ❌ 否 | -      | 配置键 |
| value | string | ❌ 否 | -      | 配置值 |

**选项：**

| 选项   | 简写 | 类型    | 默认值 | 描述             |
| ------ | ---- | ------- | ------ | ---------------- |
| --list | -l   | boolean | false  | 显示所有配置     |
| --path | -    | boolean | false  | 显示配置文件路径 |

**有效的配置键：**

| 键            | 类型    | 描述                     |
| ------------- | ------- | ------------------------ |
| defaultBranch | string  | 默认分支名称             |
| shallowClone  | boolean | 启用浅克隆（true/false） |
| shallowDepth  | number  | 浅克隆深度（正整数）     |

**示例：**

```bash
# 显示所有配置
grf config --list

# 显示配置文件路径
grf config --path

# 获取配置值
grf config defaultBranch

# 设置配置值
grf config defaultBranch main

# 启用浅克隆
grf config shallowClone true

# 设置浅克隆深度
grf config shallowDepth 5
```

---

### list

列出所有缓存的仓库。

**语法：**

```bash
grf list [options]
```

**选项：**

| 选项      | 简写 | 类型    | 默认值 | 描述                             |
| --------- | ---- | ------- | ------ | -------------------------------- |
| --json    | -    | boolean | false  | 以 JSON 格式输出                 |
| --load    | -    | boolean | false  | 列出当前项目中已加载的参考代码   |
| --verbose | -v   | boolean | false  | 显示详细输出                     |

**示例：**

```bash
# 列出所有缓存的仓库
grf list

# 以 JSON 格式列出
grf list --json

# 列出当前项目中已加载的参考代码
grf list --load

# 显示详细信息
grf list --verbose
```

---

### load

将参考仓库复制到当前目录（支持 Git URL）。

**语法：**

```bash
grf load <name> [path] [options]
```

**参数：**

| 参数 | 类型   | 必需  | 默认值                      | 描述                     |
| ---- | ------ | ----- | --------------------------- | ------------------------ |
| name | string | ✅ 是 | -                           | 仓库名称、简称或 Git URL |
| path | string | ❌ 否 | .gitreference/\<repo-path\> | 目标路径                 |

**选项：**

| 选项        | 简写 | 类型    | 默认值 | 描述                       |
| ----------- | ---- | ------- | ------ | -------------------------- |
| --subdir    | -s   | string  | -      | 仅复制特定子目录           |
| --no-ignore | -    | boolean | -      | 不更新 .gitignore          |
| --branch    | -b   | string  | -      | 指定分支（仅用于 Git URL） |

**示例：**

```bash
# 按名称加载仓库
grf load my-ref

# 加载到特定路径
grf load my-ref src/helpers

# 仅加载特定子目录
grf load my-ref --subdir src/utils

# 加载但不更新 .gitignore
grf load my-ref --no-ignore

# 直接从 Git URL 加载
grf load https://github.com/example/repo.git

# 从 Git URL 加载特定分支
grf load https://github.com/example/repo.git --branch develop
```

---

### unload

从当前项目移除参考代码。

**语法：**

```bash
grf unload [name] [options]
```

**参数：**

| 参数 | 类型   | 必需  | 默认值 | 描述             |
| ---- | ------ | ----- | ------ | ---------------- |
| name | string | ❌ 否 | -      | 要移除的仓库名称 |

**选项：**

| 选项          | 简写 | 类型    | 默认值 | 描述                               |
| ------------- | ---- | ------- | ------ | ---------------------------------- |
| --all         | -a   | boolean | false  | 移除所有参考代码                   |
| --force       | -f   | boolean | false  | 跳过确认提示                       |
| --dry-run     | -    | boolean | false  | 显示将要删除的内容但不实际删除     |
| --list        | -l   | boolean | false  | 列出所有已加载的参考代码           |
| --keep-empty  | -    | boolean | false  | 移除后保留空的 .gitreference/ 目录 |
| --clean-empty | -    | boolean | false  | 清理 .gitreference/ 中的空目录结构 |
| --verbose     | -v   | boolean | false  | 显示详细的删除进度                 |

**示例：**

```bash
# 移除特定参考
grf unload my-ref

# 移除所有参考代码
grf unload --all

# 无需确认移除
grf unload my-ref --force

# 预览将要删除的内容
grf unload my-ref --dry-run

# 列出所有已加载的参考
grf unload --list

# 移除但保留空的 .gitreference/ 目录
grf unload my-ref --keep-empty

# 移除后清理空目录
grf unload my-ref --clean-empty

# 显示详细进度
grf unload my-ref --verbose
```

---

### update

更新缓存的仓库并可选择同步到工作区。

**语法：**

```bash
grf update [name] [options]
```

**参数：**

| 参数 | 类型   | 必需  | 默认值 | 描述                         |
| ---- | ------ | ----- | ------ | ---------------------------- |
| name | string | ❌ 否 | -      | 仓库名称（不指定则更新全部） |

**选项：**

| 选项        | 简写 | 类型    | 默认值 | 描述                           |
| ----------- | ---- | ------- | ------ | ------------------------------ |
| --check     | -    | boolean | false  | 仅检查更新，不拉取             |
| --status    | -    | boolean | false  | 显示工作区和缓存之间的同步状态 |
| --sync      | -s   | boolean | false  | 更新缓存后同步到工作区         |
| --sync-only | -    | boolean | false  | 仅同步到工作区（跳过缓存更新） |
| --force     | -f   | boolean | false  | 即使版本匹配也强制同步         |
| --dry-run   | -    | boolean | false  | 显示将要执行的操作但不实际执行 |

**示例：**

```bash
# 更新所有缓存的仓库
grf update

# 更新特定仓库
grf update my-ref

# 检查更新但不拉取
grf update --check

# 显示同步状态
grf update --status

# 更新并同步到工作区
grf update --sync

# 仅同步到工作区（跳过缓存更新）
grf update --sync-only

# 即使版本匹配也强制同步
grf update --sync --force

# 预览将要执行的操作
grf update --dry-run
```

---

## 配置

### 配置文件

grf 使用全局配置目录来存储设置和缓存的仓库：

| 位置                          | 描述                       |
| ----------------------------- | -------------------------- |
| `~/.gitreference/config.json` | 全局配置文件               |
| `~/.gitreference/repos/`      | 缓存仓库存储位置           |
| `.gitreference/`              | 工作目录（在项目根目录中） |

### 配置文件结构

全局配置文件（`~/.gitreference/config.json`）包含：

```json
{
  "defaultBranch": "main",
  "shallowClone": true,
  "shallowDepth": 1,
  "repositories": [
    {
      "name": "example-repo",
      "url": "https://github.com/example/repo.git",
      "branch": "main",
      "shallow": true,
      "depth": 1
    }
  ]
}
```

---

## 工作原理

grf 采用两阶段工作流来管理参考代码：

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   远程仓库       │────▶│   全局缓存       │────▶│   项目工作区     │
│   (GitHub 等)   │     │ (~/.gitreference/repos) │ │ (.gitreference) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │      grf add          │      grf load         │
         │      grf update       │      grf update --sync│
         └───────────────────────┴───────────────────────┘
```

### 工作流程步骤

1. **`grf add`** - 将仓库克隆到全局缓存目录（`~/.gitreference/repos/`）
2. **`grf load`** - 将缓存的仓库复制到当前项目的 `.gitreference/` 目录
3. **自动 .gitignore** - `.gitreference/` 目录会自动添加到 `.gitignore`
4. **`grf update`** - 从远程更新缓存，并可选择同步到工作目录
5. **`grf unload`** - 从项目中移除已加载的参考代码

### 优势

- **集中缓存** - 仓库只需克隆一次，可在多个项目间共享
- **干净的项目历史** - 参考代码被排除在版本控制之外
- **轻松更新** - 保持参考代码与上游更改同步
- **选择性加载** - 只加载你需要的文件或目录

---

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](https://github.com/haiyewei/grf-cli/blob/main/LICENSE) 文件。

---

## 贡献指南

欢迎贡献！以下是你可以提供帮助的方式：

### 开始

1. Fork 本仓库
2. 克隆你的 fork：`git clone https://github.com/your-username/grf-cli.git`
3. 安装依赖：`npm install`
4. 创建功能分支：`git checkout -b feature/your-feature`

### 开发

```bash
# 构建项目
npm run build

# 以开发模式运行
npm run dev

# 运行测试
npm test

# 代码检查
npm run lint
```

### 提交更改

1. 进行更改并使用清晰、描述性的消息提交
2. 推送到你的 fork：`git push origin feature/your-feature`
3. 打开一个 Pull Request，并清楚描述你的更改

### 指南

- 遵循现有的代码风格
- 为新功能添加测试
- 根据需要更新文档
- 保持提交专注且原子化
