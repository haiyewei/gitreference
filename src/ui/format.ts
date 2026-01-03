/**
 * 格式化输出模块
 * 封装各种数据格式化功能
 */

import chalk from "chalk";

/**
 * 截断 commit ID（前 7 个字符）
 * @param commitId 完整的 commit ID
 * @param length 截断长度，默认为 7
 * @returns 截断后的 commit ID
 *
 * @example
 * ```typescript
 * shortCommit("abc1234567890"); // "abc1234"
 * shortCommit("abc1234567890", 10); // "abc1234567"
 * ```
 */
export function shortCommit(commitId: string, length: number = 7): string {
  return commitId.substring(0, length);
}

/**
 * 格式化日期
 * @param isoDate ISO 格式日期字符串或 Date 对象
 * @param format 格式类型
 * @returns 格式化后的日期字符串
 *
 * @example
 * ```typescript
 * formatDate("2024-01-15T10:30:00Z"); // "1/15/2024"
 * formatDate("2024-01-15T10:30:00Z", "full"); // "1/15/2024, 10:30:00 AM"
 * formatDate("2024-01-15T10:30:00Z", "relative"); // "2 days ago"
 * ```
 */
export function formatDate(
  isoDate: string | Date,
  format: "short" | "full" | "relative" | "iso" = "short",
): string {
  const date = typeof isoDate === "string" ? new Date(isoDate) : isoDate;

  switch (format) {
    case "short":
      return date.toLocaleDateString();
    case "full":
      return date.toLocaleString();
    case "iso":
      return date.toISOString();
    case "relative":
      return formatRelativeTime(date);
    default:
      return date.toLocaleDateString();
  }
}

/**
 * 格式化相对时间
 * @param date 日期对象
 * @returns 相对时间字符串
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  } else {
    return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
  }
}

/**
 * 格式化字节大小
 * @param bytes 字节数
 * @param decimals 小数位数，默认为 2
 * @returns 格式化后的大小字符串
 *
 * @example
 * ```typescript
 * formatBytes(1024); // "1 KB"
 * formatBytes(1234567); // "1.18 MB"
 * formatBytes(0); // "0 Bytes"
 * ```
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${size} ${sizes[i]}`;
}

/**
 * 格式化数字（添加千位分隔符）
 * @param num 数字
 * @returns 格式化后的数字字符串
 *
 * @example
 * ```typescript
 * formatNumber(1234567); // "1,234,567"
 * ```
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * 格式化持续时间（毫秒）
 * @param ms 毫秒数
 * @returns 格式化后的持续时间字符串
 *
 * @example
 * ```typescript
 * formatDuration(1500); // "1.5s"
 * formatDuration(65000); // "1m 5s"
 * formatDuration(500); // "500ms"
 * ```
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    if (remainingSeconds > 0) {
      return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    }
    if (remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${hours}h`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    if (remainingSeconds > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${minutes}m`;
  }

  // 小于 1 分钟，显示小数秒
  const decimalSeconds = ms / 1000;
  return `${decimalSeconds.toFixed(1)}s`;
}

/**
 * 格式化路径（将 home 目录替换为 ~）
 * @param filePath 文件路径
 * @param homeDir home 目录路径
 * @returns 格式化后的路径
 *
 * @example
 * ```typescript
 * shortenPath("/home/user/projects", "/home/user"); // "~/projects"
 * ```
 */
export function shortenPath(filePath: string, homeDir?: string): string {
  const home = homeDir ?? process.env.HOME ?? process.env.USERPROFILE ?? "";
  if (home && filePath.startsWith(home)) {
    return "~" + filePath.slice(home.length);
  }
  return filePath;
}

/**
 * 规范化路径分隔符（统一使用正斜杠）
 * @param filePath 文件路径
 * @returns 规范化后的路径
 *
 * @example
 * ```typescript
 * normalizePath("path\\to\\file"); // "path/to/file"
 * ```
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

/**
 * 格式化仓库名称（用于显示）
 * @param repoName 仓库名称
 * @returns 格式化后的名称
 */
export function formatRepoName(repoName: string): string {
  return normalizePath(repoName);
}

/**
 * 状态图标
 */
export const StatusIcon = {
  success: chalk.green("✓"),
  error: chalk.red("✗"),
  warning: chalk.yellow("⚠"),
  info: chalk.blue("ℹ"),
  pending: chalk.gray("○"),
  inProgress: chalk.cyan("◐"),
  update: chalk.yellow("⬆"),
} as const;

/**
 * 获取状态图标
 * @param status 状态类型
 * @returns 对应的图标
 */
export function getStatusIcon(
  status:
    | "success"
    | "error"
    | "warning"
    | "info"
    | "pending"
    | "inProgress"
    | "update",
): string {
  return StatusIcon[status];
}

/**
 * 格式化错误消息
 * @param message 错误消息
 * @returns 格式化后的错误消息
 */
export function formatError(message: string): string {
  return chalk.red(`${chalk.bold("✗")} ${message}`);
}

/**
 * 格式化成功消息
 * @param message 成功消息
 * @returns 格式化后的成功消息
 */
export function formatSuccess(message: string): string {
  return chalk.green(`${chalk.bold("✓")} ${message}`);
}

/**
 * 格式化警告消息
 * @param message 警告消息
 * @returns 格式化后的警告消息
 */
export function formatWarning(message: string): string {
  return chalk.yellow(`${chalk.bold("⚠")} ${message}`);
}

/**
 * 格式化提示消息
 * @param message 提示消息
 * @returns 格式化后的提示消息
 */
export function formatHint(message: string): string {
  return chalk.gray(`💡 ${message}`);
}

/**
 * 高亮显示命令
 * @param command 命令字符串
 * @returns 高亮后的命令
 */
export function highlightCommand(command: string): string {
  return chalk.cyan(command);
}

/**
 * 高亮显示路径
 * @param path 路径字符串
 * @returns 高亮后的路径
 */
export function highlightPath(path: string): string {
  return chalk.gray(path);
}

/**
 * 高亮显示名称
 * @param name 名称字符串
 * @returns 高亮后的名称
 */
export function highlightName(name: string): string {
  return chalk.cyan(name);
}
