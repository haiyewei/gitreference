/**
 * grf 单配置文件管理器
 * 实现"一个参数一个配置文件"的设计
 */

import fs from "fs-extra";
import { getConfigFilePath, CONFIG_FILES, ensureGrfDirs } from "./paths";

// ============================================================================
// 配置默认值常量
// ============================================================================

/** 各配置项的默认值 */
export const CONFIG_DEFAULTS = {
  VERSION: "1.0.0",
  DEFAULT_BRANCH: "main",
  SHALLOW_CLONE: true,
  SHALLOW_DEPTH: 1,
} as const;

// ============================================================================
// 配置文件结构
// ============================================================================

/** 配置文件的 JSON 结构 */
interface ConfigFileContent<T> {
  value: T;
}

// ============================================================================
// 泛型配置管理类
// ============================================================================

/**
 * 通用的单配置文件管理器
 * @template T 配置值的类型
 */
export class ConfigManager<T> {
  private filePath: string;
  private defaultValue: T;
  private cache: T | null = null;

  /**
   * 创建配置管理器实例
   * @param filePath 配置文件的绝对路径
   * @param defaultValue 配置的默认值
   */
  constructor(filePath: string, defaultValue: T) {
    this.filePath = filePath;
    this.defaultValue = defaultValue;
  }

  /**
   * 读取配置值
   * 如果配置文件不存在，返回默认值
   * @returns 配置值
   */
  async get(): Promise<T> {
    // 如果有缓存，直接返回
    if (this.cache !== null) {
      return this.cache;
    }

    try {
      // 检查文件是否存在
      const fileExists = await fs.pathExists(this.filePath);
      if (!fileExists) {
        return this.defaultValue;
      }

      // 读取并解析配置文件
      const content = (await fs.readJson(
        this.filePath,
      )) as ConfigFileContent<T>;
      const value = content.value;

      // 更新缓存
      this.cache = value;

      return value;
    } catch {
      // 文件读取或解析失败，返回默认值
      return this.defaultValue;
    }
  }

  /**
   * 写入配置值
   * @param value 要写入的配置值
   */
  async set(value: T): Promise<void> {
    // 确保目录存在
    await ensureGrfDirs();

    // 构建配置文件内容
    const content: ConfigFileContent<T> = { value };

    // 写入文件
    await fs.writeJson(this.filePath, content, { spaces: 2 });

    // 更新缓存
    this.cache = value;
  }

  /**
   * 重置为默认值
   */
  async reset(): Promise<void> {
    await this.set(this.defaultValue);
  }

  /**
   * 检查配置文件是否存在
   * @returns 文件是否存在
   */
  async exists(): Promise<boolean> {
    return fs.pathExists(this.filePath);
  }

  /**
   * 删除配置文件
   */
  async delete(): Promise<void> {
    // 清除缓存
    this.cache = null;

    // 检查文件是否存在
    const fileExists = await fs.pathExists(this.filePath);
    if (fileExists) {
      await fs.remove(this.filePath);
    }
  }

  /**
   * 清除缓存
   * 下次调用 get() 时会重新从文件读取
   */
  clearCache(): void {
    this.cache = null;
  }
}

// ============================================================================
// 预定义的配置管理器实例
// ============================================================================

/** 版本配置管理器 */
export const versionConfig = new ConfigManager<string>(
  getConfigFilePath(CONFIG_FILES.VERSION),
  CONFIG_DEFAULTS.VERSION,
);

/** 默认分支配置管理器 */
export const defaultBranchConfig = new ConfigManager<string>(
  getConfigFilePath(CONFIG_FILES.DEFAULT_BRANCH),
  CONFIG_DEFAULTS.DEFAULT_BRANCH,
);

/** 浅克隆开关配置管理器 */
export const shallowCloneConfig = new ConfigManager<boolean>(
  getConfigFilePath(CONFIG_FILES.SHALLOW_CLONE),
  CONFIG_DEFAULTS.SHALLOW_CLONE,
);

/** 浅克隆深度配置管理器 */
export const shallowDepthConfig = new ConfigManager<number>(
  getConfigFilePath(CONFIG_FILES.SHALLOW_DEPTH),
  CONFIG_DEFAULTS.SHALLOW_DEPTH,
);

// ============================================================================
// 便捷函数
// ============================================================================

/** 所有配置的聚合类型 */
export interface AllConfigs {
  version: string;
  defaultBranch: string;
  shallowClone: boolean;
  shallowDepth: number;
}

/**
 * 获取所有配置的聚合对象
 * 用于兼容旧接口或需要一次性获取所有配置的场景
 * @returns 包含所有配置值的对象
 */
export async function getAllConfigs(): Promise<AllConfigs> {
  const [version, defaultBranch, shallowClone, shallowDepth] =
    await Promise.all([
      versionConfig.get(),
      defaultBranchConfig.get(),
      shallowCloneConfig.get(),
      shallowDepthConfig.get(),
    ]);

  return {
    version,
    defaultBranch,
    shallowClone,
    shallowDepth,
  };
}

/**
 * 批量设置配置
 * 只设置提供的配置项，未提供的保持不变
 * @param configs 要设置的配置项（部分或全部）
 */
export async function setAllConfigs(
  configs: Partial<AllConfigs>,
): Promise<void> {
  const promises: Promise<void>[] = [];

  if (configs.version !== undefined) {
    promises.push(versionConfig.set(configs.version));
  }

  if (configs.defaultBranch !== undefined) {
    promises.push(defaultBranchConfig.set(configs.defaultBranch));
  }

  if (configs.shallowClone !== undefined) {
    promises.push(shallowCloneConfig.set(configs.shallowClone));
  }

  if (configs.shallowDepth !== undefined) {
    promises.push(shallowDepthConfig.set(configs.shallowDepth));
  }

  await Promise.all(promises);
}
