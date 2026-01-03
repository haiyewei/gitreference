/**
 * grf 配置模块
 * 负责管理全局配置和仓库元信息的读写
 */

import fs from "fs-extra";
import os from "os";
import path from "path";
import { GlobalConfig, RepoMeta, GrfError, ErrorCode } from "../types/index.js";

/** grf 根目录名称 */
const GRF_DIR_NAME = ".gitreference";
/** 全局配置文件名 */
const CONFIG_FILE_NAME = "config.json";
/** 仓库存储目录名 */
const REPOS_DIR_NAME = "repos";
/** 仓库元信息文件名 */
const REPO_META_FILE_NAME = ".gitreference-meta.json";
/** 当前配置版本 */
const CONFIG_VERSION = "1.0.0";

/**
 * 获取 grf 根目录路径
 * @returns grf 根目录的绝对路径 (~/.gitreference/)
 */
export function getGrfRoot(): string {
  return path.join(os.homedir(), GRF_DIR_NAME);
}

/**
 * 获取仓库存储根目录
 * @returns 仓库存储目录的绝对路径 (~/.gitreference/repos/)
 */
export function getReposRoot(): string {
  return path.join(getGrfRoot(), REPOS_DIR_NAME);
}

/**
 * 获取配置文件路径
 * @returns 配置文件的绝对路径 (~/.gitreference/config.json)
 */
export function getConfigPath(): string {
  return path.join(getGrfRoot(), CONFIG_FILE_NAME);
}

/**
 * 获取默认配置
 * @returns 默认的全局配置对象
 */
export function getDefaultConfig(): GlobalConfig {
  return {
    version: CONFIG_VERSION,
    defaultBranch: "main",
    shallowClone: true,
    shallowDepth: 1,
    repos: {},
  };
}

/**
 * 确保配置目录存在
 * 如果目录不存在则创建
 */
export async function ensureConfigDir(): Promise<void> {
  try {
    const grfRoot = getGrfRoot();
    const reposRoot = getReposRoot();

    await fs.ensureDir(grfRoot);
    await fs.ensureDir(reposRoot);
  } catch (error) {
    throw new GrfError(
      ErrorCode.FS_PERMISSION_DENIED,
      `无法创建配置目录: ${(error as Error).message}`,
      error as Error,
    );
  }
}

/**
 * 读取全局配置
 * 如果配置文件不存在，返回默认配置
 * @returns 全局配置对象
 */
export async function readGlobalConfig(): Promise<GlobalConfig> {
  const configPath = getConfigPath();

  try {
    const exists = await fs.pathExists(configPath);
    if (!exists) {
      return getDefaultConfig();
    }

    const content = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(content) as GlobalConfig;

    // 确保配置对象包含所有必要字段
    return {
      ...getDefaultConfig(),
      ...config,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return getDefaultConfig();
    }

    if (error instanceof SyntaxError) {
      throw new GrfError(
        ErrorCode.CONFIG_PARSE_ERROR,
        `配置文件解析失败: ${error.message}`,
        error,
      );
    }

    throw new GrfError(
      ErrorCode.CONFIG_NOT_FOUND,
      `读取配置文件失败: ${(error as Error).message}`,
      error as Error,
    );
  }
}

/**
 * 写入全局配置
 * 自动创建配置目录（如果不存在）
 * @param config 要写入的配置对象
 */
export async function writeGlobalConfig(config: GlobalConfig): Promise<void> {
  try {
    await ensureConfigDir();

    const configPath = getConfigPath();
    const content = JSON.stringify(config, null, 2);

    await fs.writeFile(configPath, content, "utf-8");
  } catch (error) {
    if (error instanceof GrfError) {
      throw error;
    }

    throw new GrfError(
      ErrorCode.CONFIG_WRITE_ERROR,
      `写入配置文件失败: ${(error as Error).message}`,
      error as Error,
    );
  }
}

/**
 * 获取仓库元信息文件路径
 * @param repoPath 仓库目录路径
 * @returns 元信息文件的绝对路径
 */
function getRepoMetaPath(repoPath: string): string {
  return path.join(repoPath, REPO_META_FILE_NAME);
}

/**
 * 读取仓库元信息
 * @param repoPath 仓库目录路径
 * @returns 仓库元信息对象，如果不存在则返回 null
 */
export async function readRepoMeta(repoPath: string): Promise<RepoMeta | null> {
  const metaPath = getRepoMetaPath(repoPath);

  try {
    const exists = await fs.pathExists(metaPath);
    if (!exists) {
      return null;
    }

    const content = await fs.readFile(metaPath, "utf-8");
    return JSON.parse(content) as RepoMeta;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    if (error instanceof SyntaxError) {
      throw new GrfError(
        ErrorCode.CONFIG_PARSE_ERROR,
        `仓库元信息解析失败: ${error.message}`,
        error,
      );
    }

    throw new GrfError(
      ErrorCode.CONFIG_NOT_FOUND,
      `读取仓库元信息失败: ${(error as Error).message}`,
      error as Error,
    );
  }
}

/**
 * 写入仓库元信息
 * @param repoPath 仓库目录路径
 * @param meta 要写入的元信息对象
 */
export async function writeRepoMeta(
  repoPath: string,
  meta: RepoMeta,
): Promise<void> {
  try {
    const metaPath = getRepoMetaPath(repoPath);
    const content = JSON.stringify(meta, null, 2);

    await fs.writeFile(metaPath, content, "utf-8");
  } catch (error) {
    throw new GrfError(
      ErrorCode.CONFIG_WRITE_ERROR,
      `写入仓库元信息失败: ${(error as Error).message}`,
      error as Error,
    );
  }
}
