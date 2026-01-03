/**
 * Repository 模块
 * 负责仓库的增删改查操作，整合配置、Git 和文件系统模块
 */

import path from "path";
import { ErrorCode, GrfError, RepoMeta } from "../types/index.js";
import {
  getReposRoot,
  readGlobalConfig,
  writeGlobalConfig,
  readRepoMeta,
  writeRepoMeta,
  ensureConfigDir,
} from "./config.js";
import * as git from "./git.js";
import * as fs from "./filesystem.js";

/**
 * 添加仓库选项
 */
export interface AddOptions {
  /** 自定义仓库名称 */
  name?: string;
  /** 指定分支 */
  branch?: string;
  /** 是否浅克隆 */
  shallow?: boolean;
  /** 浅克隆深度 */
  depth?: number;
}

/**
 * 仓库信息（用于 list 命令返回）
 */
export interface RepoInfo {
  /** 仓库名称（如 github.com/user/repo） */
  name: string;
  /** 远程 URL */
  url: string;
  /** 本地路径 */
  path: string;
  /** 当前 commit ID */
  commitId: string;
  /** 分支名 */
  branch?: string;
  /** 添加时间 */
  addedAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 解析后的仓库 URL 信息
 */
export interface ParsedRepoUrl {
  /** 主机名（如 github.com） */
  host: string;
  /** 所有者/组织名 */
  owner: string;
  /** 仓库名 */
  repo: string;
}

/**
 * 解析 Git URL
 * 支持 HTTPS 和 SSH 格式
 * @param url Git 仓库 URL
 * @returns 解析后的 URL 信息
 * @throws GrfError 如果 URL 格式无效
 *
 * @example
 * // HTTPS 格式
 * parseRepoUrl('https://github.com/facebook/react.git')
 * // -> { host: 'github.com', owner: 'facebook', repo: 'react' }
 *
 * // SSH 格式
 * parseRepoUrl('git@github.com:facebook/react.git')
 * // -> { host: 'github.com', owner: 'facebook', repo: 'react' }
 */
export function parseRepoUrl(url: string): ParsedRepoUrl {
  // 去除首尾空白
  url = url.trim();

  // HTTPS 格式: https://github.com/user/repo.git
  const httpsRegex = /^https?:\/\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?$/;
  const httpsMatch = httpsRegex.exec(url);
  if (httpsMatch) {
    return {
      host: httpsMatch[1],
      owner: httpsMatch[2],
      repo: httpsMatch[3].replace(/\.git$/, ""),
    };
  }

  // SSH 格式: git@github.com:user/repo.git
  const sshRegex = /^git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/;
  const sshMatch = sshRegex.exec(url);
  if (sshMatch) {
    return {
      host: sshMatch[1],
      owner: sshMatch[2],
      repo: sshMatch[3].replace(/\.git$/, ""),
    };
  }

  throw new GrfError(
    ErrorCode.REPO_INVALID_URL,
    `无效的 Git URL: ${url}。支持的格式: https://github.com/user/repo.git 或 git@github.com:user/repo.git`,
  );
}

/**
 * 根据 URL 生成本地存储路径
 * @param url Git 仓库 URL
 * @returns 本地存储路径
 *
 * @example
 * getRepoStoragePath('https://github.com/facebook/react.git')
 * // -> ~/.gitreference/repos/github.com/facebook/react
 */
export function getRepoStoragePath(url: string): string {
  const { host, owner, repo } = parseRepoUrl(url);
  return path.join(getReposRoot(), host, owner, repo);
}

/**
 * 根据解析后的 URL 信息生成仓库名称
 * @param parsed 解析后的 URL 信息
 * @returns 仓库名称（格式: host/owner/repo）
 */
function getRepoName(parsed: ParsedRepoUrl): string {
  return `${parsed.host}/${parsed.owner}/${parsed.repo}`;
}

/**
 * 添加仓库
 * @param url Git 仓库 URL
 * @param options 添加选项
 * @returns 仓库信息
 */
export async function add(
  url: string,
  options?: AddOptions,
): Promise<RepoInfo> {
  // 解析 URL
  const parsed = parseRepoUrl(url);
  const repoPath = getRepoStoragePath(url);
  const repoName = options?.name ?? getRepoName(parsed);

  // 检查仓库是否已存在
  if (await exists(repoName)) {
    throw new GrfError(
      ErrorCode.REPO_ALREADY_EXISTS,
      `仓库已存在: ${repoName}`,
    );
  }

  // 确保配置目录存在
  await ensureConfigDir();

  // 确保父目录存在
  await fs.ensureDir(path.dirname(repoPath));

  // 克隆仓库
  await git.clone(url, repoPath, {
    branch: options?.branch,
    shallow: options?.shallow,
    depth: options?.depth,
  });

  // 获取 commit ID 和分支信息
  const commitId = await git.getCurrentCommit(repoPath);
  const branch = await git.getBranch(repoPath);

  // 创建元信息
  const now = new Date().toISOString();
  const meta: RepoMeta = {
    url,
    name: repoName,
    addedAt: now,
    updatedAt: now,
    commitId,
    branch,
  };

  // 保存元信息
  await writeRepoMeta(repoPath, meta);

  // 更新全局配置
  const config = await readGlobalConfig();
  config.repos[repoName] = {
    url,
    path: repoPath,
    addedAt: now,
  };
  await writeGlobalConfig(config);

  return {
    name: repoName,
    url,
    path: repoPath,
    commitId,
    branch,
    addedAt: now,
    updatedAt: now,
  };
}

/**
 * 检查仓库名称是否匹配
 * 支持以下匹配方式：
 * - 完整名称：github.com/owner/repo
 * - owner/repo 格式：owner/repo
 * - 仅 repo 名称：repo
 *
 * @param repoName 仓库完整名称（如 github.com/owner/repo）
 * @param searchName 搜索名称
 * @returns 是否匹配
 */
function matchRepoName(repoName: string, searchName: string): boolean {
  // 标准化：将反斜杠转换为正斜杠
  const normalizedRepoName = repoName.replace(/\\/g, "/");
  const normalizedSearchName = searchName.replace(/\\/g, "/");

  // 完整名称匹配
  if (normalizedRepoName === normalizedSearchName) {
    return true;
  }

  // 分割仓库名称为各个部分
  const repoParts = normalizedRepoName.split("/");
  const searchParts = normalizedSearchName.split("/");

  // 如果搜索名称有多个部分，从末尾开始匹配
  if (searchParts.length > 1) {
    // 检查是否匹配末尾的 N 个部分
    if (repoParts.length >= searchParts.length) {
      const repoSuffix = repoParts.slice(-searchParts.length).join("/");
      return repoSuffix === normalizedSearchName;
    }
    return false;
  }

  // 单个名称：只匹配最后一个部分（repo 名称）
  const repoBaseName = repoParts[repoParts.length - 1];
  return repoBaseName === normalizedSearchName;
}

/**
 * 根据名称获取仓库信息
 * @param name 仓库名称（完整路径或简短名称）
 * @returns 仓库信息，不存在返回 null
 */
export async function get(name: string): Promise<RepoInfo | null> {
  const config = await readGlobalConfig();

  // 首先尝试完整名称匹配
  if (config.repos[name]) {
    const entry = config.repos[name];
    const meta = await readRepoMeta(entry.path);
    if (!meta) {
      return null;
    }
    return {
      name,
      url: entry.url,
      path: entry.path,
      commitId: meta.commitId,
      branch: meta.branch,
      addedAt: meta.addedAt,
      updatedAt: meta.updatedAt,
    };
  }

  // 尝试简短名称匹配（支持 repo 或 owner/repo 格式）
  for (const [repoName, entry] of Object.entries(config.repos)) {
    if (matchRepoName(repoName, name)) {
      const meta = await readRepoMeta(entry.path);
      if (!meta) {
        continue;
      }
      return {
        name: repoName,
        url: entry.url,
        path: entry.path,
        commitId: meta.commitId,
        branch: meta.branch,
        addedAt: meta.addedAt,
        updatedAt: meta.updatedAt,
      };
    }
  }

  return null;
}

/**
 * 列出所有仓库
 * @returns 仓库信息数组
 */
export async function list(): Promise<RepoInfo[]> {
  const config = await readGlobalConfig();
  const repos: RepoInfo[] = [];

  for (const [name, entry] of Object.entries(config.repos)) {
    const meta = await readRepoMeta(entry.path);
    if (meta) {
      repos.push({
        name,
        url: entry.url,
        path: entry.path,
        commitId: meta.commitId,
        branch: meta.branch,
        addedAt: meta.addedAt,
        updatedAt: meta.updatedAt,
      });
    }
  }

  return repos;
}

/**
 * 删除仓库
 * @param name 仓库名称
 * @throws GrfError 如果仓库不存在
 */
export async function remove(name: string): Promise<void> {
  const repoInfo = await get(name);

  if (!repoInfo) {
    throw new GrfError(ErrorCode.REPO_NOT_FOUND, `仓库不存在: ${name}`);
  }

  // 删除仓库目录
  await fs.removeDir(repoInfo.path);

  // 更新全局配置
  const config = await readGlobalConfig();
  delete config.repos[repoInfo.name];
  await writeGlobalConfig(config);
}

/**
 * 检查仓库是否存在
 * @param name 仓库名称
 * @returns 是否存在
 */
export async function exists(name: string): Promise<boolean> {
  const config = await readGlobalConfig();

  // 首先尝试完整名称匹配
  if (config.repos[name]) {
    const entry = config.repos[name];
    // 检查目录和元信息是否都存在
    const dirExists = await fs.exists(entry.path);
    const meta = await readRepoMeta(entry.path);
    return dirExists && meta !== null;
  }

  // 尝试简短名称匹配（使用统一的匹配函数）
  for (const [repoName, entry] of Object.entries(config.repos)) {
    if (matchRepoName(repoName, name)) {
      const dirExists = await fs.exists(entry.path);
      const meta = await readRepoMeta(entry.path);
      return dirExists && meta !== null;
    }
  }

  return false;
}

/**
 * 将仓库名称解析为本地路径
 * @param name 仓库名称（完整名称或简短名称）
 * @returns 本地路径
 * @throws GrfError 如果仓库不存在
 */
export async function resolvePath(name: string): Promise<string> {
  const repoInfo = await get(name);

  if (!repoInfo) {
    throw new GrfError(ErrorCode.REPO_NOT_FOUND, `仓库不存在: ${name}`);
  }

  return repoInfo.path;
}

/**
 * 切换仓库分支
 * @param name 仓库名称
 * @param branch 目标分支
 * @returns 更新后的仓库信息
 * @throws GrfError 如果仓库不存在或切换失败
 */
export async function switchBranch(
  name: string,
  branch: string,
): Promise<RepoInfo> {
  // 获取仓库信息
  const repoInfo = await get(name);

  if (!repoInfo) {
    throw new GrfError(ErrorCode.REPO_NOT_FOUND, `仓库不存在: ${name}`);
  }

  // 调用 git.checkout() 切换分支
  await git.checkout(repoInfo.path, branch);

  // 获取新的 commit ID
  const commitId = await git.getCurrentCommit(repoInfo.path);
  const currentBranch = await git.getBranch(repoInfo.path);

  // 更新 meta.json 中的 branch 字段
  const now = new Date().toISOString();
  const meta: RepoMeta = {
    url: repoInfo.url,
    name: repoInfo.name,
    addedAt: repoInfo.addedAt,
    updatedAt: now,
    commitId,
    branch: currentBranch,
  };

  await writeRepoMeta(repoInfo.path, meta);

  // 返回更新后的仓库信息
  return {
    name: repoInfo.name,
    url: repoInfo.url,
    path: repoInfo.path,
    commitId,
    branch: currentBranch,
    addedAt: repoInfo.addedAt,
    updatedAt: now,
  };
}
