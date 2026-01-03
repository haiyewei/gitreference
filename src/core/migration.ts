/**
 * grf 配置迁移工具
 * 将旧版单一 config.json 文件迁移到新的模块化配置结构
 */

import fs from "fs-extra";
import {
  getLegacyConfigPath,
  ensureGrfDirs,
  getConfigDir,
  getReposIndexPath,
} from "./paths.js";
import {
  versionConfig,
  defaultBranchConfig,
  shallowCloneConfig,
  shallowDepthConfig,
  CONFIG_DEFAULTS,
} from "./config-manager.js";
import { reposIndex } from "./repos-index.js";
import { RepoEntry } from "../types/index.js";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 迁移结果接口
 */
export interface MigrationResult {
  /** 迁移是否成功 */
  success: boolean;
  /** 是否执行了迁移 */
  migrated: boolean;
  /** 结果消息 */
  message: string;
  /** 详细信息 */
  details?: {
    /** 已迁移的配置项列表 */
    configsMigrated: string[];
    /** 已迁移的仓库数量 */
    reposMigrated: number;
    /** 备份文件路径 */
    backupPath?: string;
  };
}

/**
 * 旧版配置结构（与 GlobalConfig 相同）
 */
interface LegacyConfig {
  version?: string;
  defaultBranch?: string;
  shallowClone?: boolean;
  shallowDepth?: number;
  repos?: Record<string, RepoEntry>;
}

// ============================================================================
// 核心迁移函数
// ============================================================================

/**
 * 检查是否需要迁移
 * 条件：旧配置存在且新配置目录不存在或为空
 * @returns 是否需要迁移
 */
export async function needsMigration(): Promise<boolean> {
  try {
    const legacyConfigPath = getLegacyConfigPath();
    const configDir = getConfigDir();
    const reposIndexPath = getReposIndexPath();

    // 检查旧配置文件是否存在
    const legacyExists = await fs.pathExists(legacyConfigPath);
    if (!legacyExists) {
      return false;
    }

    // 检查新配置目录是否存在
    const configDirExists = await fs.pathExists(configDir);
    if (!configDirExists) {
      return true;
    }

    // 检查新配置目录是否为空
    const configDirContents = await fs.readdir(configDir);
    if (configDirContents.length === 0) {
      return true;
    }

    // 检查 repos.json 是否存在
    const reposIndexExists = await fs.pathExists(reposIndexPath);
    if (!reposIndexExists) {
      // 如果旧配置有 repos 数据，需要迁移
      const legacyConfig = await readLegacyConfig();
      if (legacyConfig?.repos && Object.keys(legacyConfig.repos).length > 0) {
        return true;
      }
    }

    return false;
  } catch {
    // 出错时保守处理，不执行迁移
    return false;
  }
}

/**
 * 读取旧版配置文件
 * @returns 旧版配置对象，如果不存在或解析失败则返回 null
 */
async function readLegacyConfig(): Promise<LegacyConfig | null> {
  try {
    const legacyConfigPath = getLegacyConfigPath();
    const exists = await fs.pathExists(legacyConfigPath);

    if (!exists) {
      return null;
    }

    const content = await fs.readFile(legacyConfigPath, "utf-8");
    const config = JSON.parse(content) as LegacyConfig;

    return config;
  } catch {
    return null;
  }
}

/**
 * 备份旧配置文件
 * @returns 备份文件路径，如果备份失败则返回 null
 */
export async function backupLegacyConfig(): Promise<string | null> {
  try {
    const legacyConfigPath = getLegacyConfigPath();
    const exists = await fs.pathExists(legacyConfigPath);

    if (!exists) {
      return null;
    }

    const backupPath = `${legacyConfigPath}.backup`;

    // 如果备份文件已存在，添加时间戳
    let finalBackupPath = backupPath;
    if (await fs.pathExists(backupPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      finalBackupPath = `${legacyConfigPath}.backup.${timestamp}`;
    }

    await fs.copy(legacyConfigPath, finalBackupPath);

    return finalBackupPath;
  } catch {
    return null;
  }
}

/**
 * 执行配置迁移
 * @returns 迁移结果
 */
export async function migrateConfig(): Promise<MigrationResult> {
  try {
    // 检查是否需要迁移
    const shouldMigrate = await needsMigration();
    if (!shouldMigrate) {
      return {
        success: true,
        migrated: false,
        message: "无需迁移：旧配置不存在或新配置已存在",
      };
    }

    // 读取旧配置
    const legacyConfig = await readLegacyConfig();
    if (!legacyConfig) {
      return {
        success: false,
        migrated: false,
        message: "迁移失败：无法读取旧配置文件",
      };
    }

    // 备份旧配置
    const backupPath = await backupLegacyConfig();
    if (!backupPath) {
      return {
        success: false,
        migrated: false,
        message: "迁移失败：无法备份旧配置文件",
      };
    }

    // 确保目录存在
    await ensureGrfDirs();

    // 记录迁移的配置项
    const configsMigrated: string[] = [];

    // 迁移 version
    const version = legacyConfig.version ?? CONFIG_DEFAULTS.VERSION;
    await versionConfig.set(version);
    configsMigrated.push("version");

    // 迁移 defaultBranch
    const defaultBranch =
      legacyConfig.defaultBranch ?? CONFIG_DEFAULTS.DEFAULT_BRANCH;
    await defaultBranchConfig.set(defaultBranch);
    configsMigrated.push("defaultBranch");

    // 迁移 shallowClone
    const shallowClone =
      legacyConfig.shallowClone ?? CONFIG_DEFAULTS.SHALLOW_CLONE;
    await shallowCloneConfig.set(shallowClone);
    configsMigrated.push("shallowClone");

    // 迁移 shallowDepth
    const shallowDepth =
      legacyConfig.shallowDepth ?? CONFIG_DEFAULTS.SHALLOW_DEPTH;
    await shallowDepthConfig.set(shallowDepth);
    configsMigrated.push("shallowDepth");

    // 迁移 repos
    const repos = legacyConfig.repos ?? {};
    const repoCount = Object.keys(repos).length;
    if (repoCount > 0) {
      await reposIndex.setAll(repos);
    }

    return {
      success: true,
      migrated: true,
      message: `迁移成功：已迁移 ${configsMigrated.length} 个配置项和 ${repoCount} 个仓库`,
      details: {
        configsMigrated,
        reposMigrated: repoCount,
        backupPath,
      },
    };
  } catch (error) {
    return {
      success: false,
      migrated: false,
      message: `迁移失败：${(error as Error).message}`,
    };
  }
}

/**
 * 验证迁移结果
 * 检查新配置文件是否正确创建
 * @returns 验证是否通过
 */
export async function validateMigration(): Promise<boolean> {
  try {
    // 检查各配置文件是否存在
    const versionExists = await versionConfig.exists();
    const defaultBranchExists = await defaultBranchConfig.exists();
    const shallowCloneExists = await shallowCloneConfig.exists();
    const shallowDepthExists = await shallowDepthConfig.exists();

    // 所有配置文件都必须存在
    if (
      !versionExists ||
      !defaultBranchExists ||
      !shallowCloneExists ||
      !shallowDepthExists
    ) {
      return false;
    }

    // 尝试读取各配置值，确保格式正确
    await versionConfig.get();
    await defaultBranchConfig.get();
    await shallowCloneConfig.get();
    await shallowDepthConfig.get();

    // 检查 repos.json 是否可读
    const reposIndexPath = getReposIndexPath();
    const reposIndexExists = await fs.pathExists(reposIndexPath);
    if (reposIndexExists) {
      await reposIndex.getAll();
    }

    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// 自动迁移入口
// ============================================================================

/**
 * 确保配置已迁移
 * 在应用启动时调用，自动检测并执行迁移
 * 此函数是幂等的，多次调用结果相同
 * @returns 迁移结果
 */
export async function ensureMigrated(): Promise<MigrationResult> {
  try {
    // 检查是否需要迁移
    const shouldMigrate = await needsMigration();

    if (!shouldMigrate) {
      // 不需要迁移，检查是否已经迁移过
      const isValid = await validateMigration();

      if (isValid) {
        return {
          success: true,
          migrated: false,
          message: "配置已是最新格式，无需迁移",
        };
      }

      // 配置目录存在但验证失败，可能是首次运行
      // 确保目录存在即可
      await ensureGrfDirs();

      return {
        success: true,
        migrated: false,
        message: "配置目录已初始化",
      };
    }

    // 执行迁移
    const result = await migrateConfig();

    // 如果迁移成功，验证结果
    if (result.success && result.migrated) {
      const isValid = await validateMigration();

      if (!isValid) {
        return {
          success: false,
          migrated: true,
          message: "迁移完成但验证失败，配置文件可能不完整",
          details: result.details,
        };
      }
    }

    return result;
  } catch (error) {
    return {
      success: false,
      migrated: false,
      message: `自动迁移失败：${(error as Error).message}`,
    };
  }
}
