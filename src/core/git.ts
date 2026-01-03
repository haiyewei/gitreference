/**
 * Git 模块
 * 封装所有 Git 命令的执行，提供类型安全的接口
 */

import { exec } from "child_process";
import { promisify } from "util";
import { ErrorCode, GrfError } from "../types/index.js";

const execAsync = promisify(exec);

/**
 * Git 克隆选项
 */
export interface CloneOptions {
  /** 指定分支 */
  branch?: string;
  /** 浅克隆深度 */
  depth?: number;
  /** 是否浅克隆 */
  shallow?: boolean;
}

/**
 * 执行选项
 */
interface ExecOptions {
  /** 工作目录 */
  cwd?: string;
}

/**
 * 执行 Git 命令的内部函数
 * @param args Git 命令参数数组
 * @param options 执行选项
 * @param errorCode 失败时使用的错误码
 * @returns 命令输出（已去除首尾空白）
 */
async function execGit(
  args: string[],
  options?: ExecOptions,
  errorCode: ErrorCode = ErrorCode.GIT_CLONE_FAILED,
): Promise<string> {
  const command = `git ${args.join(" ")}`;
  try {
    const { stdout } = await execAsync(command, { cwd: options?.cwd });
    return stdout.trim();
  } catch (error) {
    throw new GrfError(
      errorCode,
      `Git command failed: ${command}`,
      error as Error,
    );
  }
}

/**
 * 克隆 Git 仓库
 * @param url 仓库 URL
 * @param dest 目标路径
 * @param options 克隆选项
 */
export async function clone(
  url: string,
  dest: string,
  options?: CloneOptions,
): Promise<void> {
  const args: string[] = ["clone"];

  // 处理浅克隆选项
  if (options?.shallow || options?.depth) {
    const depth = options.depth ?? 1;
    args.push("--depth", depth.toString());
  }

  // 处理分支选项
  if (options?.branch) {
    args.push("--branch", options.branch);
  }

  args.push(url, dest);

  await execGit(args, undefined, ErrorCode.GIT_CLONE_FAILED);
}

/**
 * 拉取远程更新
 * @param repoPath 仓库路径
 */
export async function pull(repoPath: string): Promise<void> {
  await execGit(["pull"], { cwd: repoPath }, ErrorCode.GIT_PULL_FAILED);
}

/**
 * 获取当前 commit ID
 * @param repoPath 仓库路径
 * @returns 完整的 40 字符 SHA
 */
export async function getCurrentCommit(repoPath: string): Promise<string> {
  return execGit(
    ["rev-parse", "HEAD"],
    { cwd: repoPath },
    ErrorCode.GIT_CLONE_FAILED,
  );
}

/**
 * 获取远程仓库 URL
 * @param repoPath 仓库路径
 * @returns 远程 URL
 */
export async function getRemoteUrl(repoPath: string): Promise<string> {
  return execGit(
    ["remote", "get-url", "origin"],
    { cwd: repoPath },
    ErrorCode.GIT_CLONE_FAILED,
  );
}

/**
 * 检查是否有远程更新
 * @param repoPath 仓库路径
 * @returns 是否有更新
 */
export async function hasUpdates(repoPath: string): Promise<boolean> {
  // 先获取远程更新
  await fetch(repoPath);

  // 获取当前分支
  const branch = await getBranch(repoPath);

  // 比较本地和远程的差异
  try {
    const count = await execGit(
      ["rev-list", `HEAD..origin/${branch}`, "--count"],
      { cwd: repoPath },
      ErrorCode.GIT_CLONE_FAILED,
    );
    return parseInt(count, 10) > 0;
  } catch {
    // 如果比较失败（例如远程分支不存在），尝试使用 origin/HEAD
    try {
      const count = await execGit(
        ["rev-list", "HEAD..origin/HEAD", "--count"],
        { cwd: repoPath },
        ErrorCode.GIT_CLONE_FAILED,
      );
      return parseInt(count, 10) > 0;
    } catch {
      // 如果都失败了，假设没有更新
      return false;
    }
  }
}

/**
 * 获取当前分支名
 * @param repoPath 仓库路径
 * @returns 分支名称
 */
export async function getBranch(repoPath: string): Promise<string> {
  return execGit(
    ["rev-parse", "--abbrev-ref", "HEAD"],
    { cwd: repoPath },
    ErrorCode.GIT_CLONE_FAILED,
  );
}

/**
 * 检查路径是否是 Git 仓库
 * @param path 要检查的路径
 * @returns 是否是 Git 仓库
 */
export async function isGitRepo(path: string): Promise<boolean> {
  try {
    await execGit(
      ["rev-parse", "--git-dir"],
      { cwd: path },
      ErrorCode.GIT_CLONE_FAILED,
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取远程更新（不合并）
 * @param repoPath 仓库路径
 */
export async function fetch(repoPath: string): Promise<void> {
  await execGit(["fetch"], { cwd: repoPath }, ErrorCode.GIT_CLONE_FAILED);
}

/**
 * 切换到指定分支
 * @param repoPath 仓库路径
 * @param branch 目标分支名
 */
export async function checkout(
  repoPath: string,
  branch: string,
): Promise<void> {
  try {
    // 1. 修改 fetch 配置以支持获取所有分支（解决浅克隆问题）
    await execGit(
      ["config", "remote.origin.fetch", "+refs/heads/*:refs/remotes/origin/*"],
      { cwd: repoPath },
      ErrorCode.GIT_CHECKOUT_FAILED,
    );

    // 2. 获取指定分支
    await execGit(
      ["fetch", "origin", branch],
      { cwd: repoPath },
      ErrorCode.GIT_CHECKOUT_FAILED,
    );

    // 3. 切换到指定分支
    await execGit(
      ["checkout", branch],
      { cwd: repoPath },
      ErrorCode.GIT_CHECKOUT_FAILED,
    );
  } catch (error) {
    throw new GrfError(
      ErrorCode.GIT_CHECKOUT_FAILED,
      `Git command failed: git checkout ${branch}\n  Branch "${branch}" may not exist. Use git branch -r to list available branches.`,
      error as Error,
    );
  }
}

/**
 * 获取所有远程分支列表
 * @param repoPath 仓库路径
 * @returns 分支名称数组
 */
export async function listRemoteBranches(repoPath: string): Promise<string[]> {
  const output = await execGit(
    ["branch", "-r"],
    { cwd: repoPath },
    ErrorCode.GIT_CLONE_FAILED,
  );

  // 解析输出，每行一个分支，格式如 "  origin/main" 或 "  origin/HEAD -> origin/main"
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.includes("->")) // 过滤空行和 HEAD 指针
    .map((line) => line.replace(/^origin\//, "")); // 移除 origin/ 前缀
}
