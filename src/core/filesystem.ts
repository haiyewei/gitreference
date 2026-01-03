/**
 * FileSystem 模块
 * 封装文件系统操作，提供复制、删除等功能
 */

import fs from "fs-extra";
import path from "path";
import { ErrorCode, GrfError } from "../types/index.js";

/**
 * 复制选项接口
 */
export interface CopyOptions {
  /** 要排除的文件/目录模式（如 ['.git', 'node_modules']） */
  exclude?: string[];
  /** 是否覆盖已存在的文件 */
  overwrite?: boolean;
}

/**
 * 复制目录
 * @param src 源目录路径
 * @param dest 目标目录路径
 * @param options 复制选项
 */
export async function copyDir(
  src: string,
  dest: string,
  options?: CopyOptions,
): Promise<void> {
  try {
    await fs.copy(src, dest, {
      overwrite: options?.overwrite ?? true,
      filter: (srcPath: string) => {
        const basename = path.basename(srcPath);
        return !options?.exclude?.includes(basename);
      },
    });
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new GrfError(
        ErrorCode.FS_PATH_NOT_FOUND,
        `源路径不存在: ${src}`,
        err,
      );
    }
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new GrfError(
        ErrorCode.FS_PERMISSION_DENIED,
        `权限被拒绝: ${src} -> ${dest}`,
        err,
      );
    }
    throw new GrfError(
      ErrorCode.FS_COPY_FAILED,
      `复制目录失败: ${src} -> ${dest}`,
      err,
    );
  }
}

/**
 * 复制单个文件
 * @param src 源文件路径
 * @param dest 目标文件路径
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  try {
    // 确保目标目录存在
    await fs.ensureDir(path.dirname(dest));
    await fs.copy(src, dest);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new GrfError(
        ErrorCode.FS_PATH_NOT_FOUND,
        `源文件不存在: ${src}`,
        err,
      );
    }
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new GrfError(
        ErrorCode.FS_PERMISSION_DENIED,
        `权限被拒绝: ${src} -> ${dest}`,
        err,
      );
    }
    throw new GrfError(
      ErrorCode.FS_COPY_FAILED,
      `复制文件失败: ${src} -> ${dest}`,
      err,
    );
  }
}

/**
 * 删除目录（递归删除）
 * @param dirPath 要删除的目录路径
 */
export async function removeDir(dirPath: string): Promise<void> {
  try {
    await fs.remove(dirPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new GrfError(
        ErrorCode.FS_PERMISSION_DENIED,
        `权限被拒绝，无法删除: ${dirPath}`,
        err,
      );
    }
    throw new GrfError(
      ErrorCode.FS_COPY_FAILED,
      `删除目录失败: ${dirPath}`,
      err,
    );
  }
}

/**
 * 检查路径是否存在
 * @param filePath 要检查的路径
 * @returns 路径是否存在
 */
export async function exists(filePath: string): Promise<boolean> {
  return fs.pathExists(filePath);
}

/**
 * 确保目录存在（不存在则创建）
 * @param dirPath 目录路径
 */
export async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.ensureDir(dirPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new GrfError(
        ErrorCode.FS_PERMISSION_DENIED,
        `权限被拒绝，无法创建目录: ${dirPath}`,
        err,
      );
    }
    throw new GrfError(
      ErrorCode.FS_COPY_FAILED,
      `创建目录失败: ${dirPath}`,
      err,
    );
  }
}

/**
 * 更新 .gitignore 文件
 * 如果指定条目不存在，则追加到文件末尾
 * 优化：将所有 gitreference 管理的条目放在同一个注释块下
 * @param dir 目录路径
 * @param entry 要添加的条目
 */
export async function updateGitignore(
  dir: string,
  entry: string,
): Promise<void> {
  const GITREFERENCE_COMMENT = "# Added by gitreference";

  try {
    const gitignorePath = path.join(dir, ".gitignore");
    let content = "";

    if (await fs.pathExists(gitignorePath)) {
      content = await fs.readFile(gitignorePath, "utf-8");
    }

    const lines = content.split("\n");
    const trimmedEntry = entry.trim();

    // 检查条目是否已存在（按行检查，避免部分匹配）
    const trimmedLines = lines.map((line) => line.trim());
    if (trimmedLines.includes(trimmedEntry)) {
      return; // 条目已存在，无需添加
    }

    // 查找现有的 gitreference 注释块
    let commentIndex = -1;
    let lastGitrefEntryIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (trimmedLine === GITREFERENCE_COMMENT) {
        if (commentIndex === -1) {
          commentIndex = i;
        }
        lastGitrefEntryIndex = i;
      } else if (
        commentIndex !== -1 &&
        trimmedLine !== "" &&
        !trimmedLine.startsWith("#")
      ) {
        // 在注释块后找到非空、非注释行，更新最后条目位置
        lastGitrefEntryIndex = i;
      } else if (commentIndex !== -1 && trimmedLine === "") {
        // 遇到空行，检查是否是 gitreference 块的结束
        // 继续查找，可能有多个 gitreference 块需要合并
      }
    }

    if (commentIndex !== -1) {
      // 找到现有的 gitreference 块，在最后一个条目后插入新条目
      // 首先需要找到该块的实际结束位置
      let insertIndex = lastGitrefEntryIndex + 1;

      // 在现有块后插入新条目
      lines.splice(insertIndex, 0, trimmedEntry);

      // 写回文件
      await fs.writeFile(gitignorePath, lines.join("\n"), "utf-8");
    } else {
      // 没有找到现有块，追加新块
      const newEntry = `\n${GITREFERENCE_COMMENT}\n${trimmedEntry}\n`;
      await fs.appendFile(gitignorePath, newEntry);
    }
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new GrfError(
        ErrorCode.FS_PERMISSION_DENIED,
        `权限被拒绝，无法更新 .gitignore: ${dir}`,
        err,
      );
    }
    throw new GrfError(
      ErrorCode.FS_COPY_FAILED,
      `更新 .gitignore 失败: ${dir}`,
      err,
    );
  }
}

/**
 * 读取目录内容
 * @param dirPath 目录路径
 * @returns 文件/目录名数组
 */
export async function readDir(dirPath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirPath);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new GrfError(
        ErrorCode.FS_PATH_NOT_FOUND,
        `目录不存在: ${dirPath}`,
        err,
      );
    }
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new GrfError(
        ErrorCode.FS_PERMISSION_DENIED,
        `权限被拒绝，无法读取目录: ${dirPath}`,
        err,
      );
    }
    throw new GrfError(
      ErrorCode.FS_COPY_FAILED,
      `读取目录失败: ${dirPath}`,
      err,
    );
  }
}

/**
 * 检查路径是否为目录
 * @param filePath 要检查的路径
 * @returns 是否为目录
 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isDirectory();
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      throw new GrfError(
        ErrorCode.FS_PATH_NOT_FOUND,
        `路径不存在: ${filePath}`,
        err,
      );
    }
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new GrfError(
        ErrorCode.FS_PERMISSION_DENIED,
        `权限被拒绝，无法访问: ${filePath}`,
        err,
      );
    }
    throw new GrfError(
      ErrorCode.FS_COPY_FAILED,
      `获取文件信息失败: ${filePath}`,
      err,
    );
  }
}

/**
 * 从 .gitignore 文件中移除指定条目
 * @param dir 目录路径（包含 .gitignore 的目录）
 * @param entry 要移除的条目
 * @param options 移除选项
 * @returns 是否成功移除（条目存在并被移除返回 true）
 */
export async function removeFromGitignore(
  dir: string,
  entry: string,
  options?: {
    /** 是否同时移除关联的注释行（# Added by gitreference） */
    removeComment?: boolean;
  },
): Promise<boolean> {
  const removeComment = options?.removeComment ?? true;
  const gitignorePath = path.join(dir, ".gitignore");

  try {
    // 检查 .gitignore 文件是否存在
    if (!(await fs.pathExists(gitignorePath))) {
      return false;
    }

    // 读取文件内容
    const content = await fs.readFile(gitignorePath, "utf-8");
    const lines = content.split("\n");

    // 标记要删除的行索引
    const linesToDelete = new Set<number>();
    const trimmedEntry = entry.trim();
    let found = false;

    // 遍历每一行，查找匹配的条目
    for (let i = 0; i < lines.length; i++) {
      const trimmedLine = lines[i].trim();
      if (trimmedLine === trimmedEntry) {
        found = true;
        linesToDelete.add(i);

        // 如果 removeComment 为 true，检查上一行是否为注释
        if (removeComment && i > 0) {
          const prevLine = lines[i - 1].trim();
          if (prevLine === "# Added by gitreference") {
            linesToDelete.add(i - 1);
          }
        }
      }
    }

    // 如果没有找到匹配的行，返回 false
    if (!found) {
      return false;
    }

    // 过滤掉标记为删除的行
    const filteredLines = lines.filter((_, index) => !linesToDelete.has(index));

    // 清理多余的空行（连续多个空行合并为一个）
    const cleanedLines: string[] = [];
    let prevLineEmpty = false;

    for (const line of filteredLines) {
      const isEmpty = line.trim() === "";
      if (isEmpty) {
        if (!prevLineEmpty) {
          cleanedLines.push(line);
        }
        prevLineEmpty = true;
      } else {
        cleanedLines.push(line);
        prevLineEmpty = false;
      }
    }

    // 移除开头和结尾的空行
    while (cleanedLines.length > 0 && cleanedLines[0].trim() === "") {
      cleanedLines.shift();
    }
    while (
      cleanedLines.length > 0 &&
      cleanedLines[cleanedLines.length - 1].trim() === ""
    ) {
      cleanedLines.pop();
    }

    // 写回文件
    const newContent =
      cleanedLines.length > 0 ? cleanedLines.join("\n") + "\n" : "";
    await fs.writeFile(gitignorePath, newContent, "utf-8");

    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "EACCES" || err.code === "EPERM") {
      throw new GrfError(
        ErrorCode.FS_PERMISSION_DENIED,
        `权限被拒绝，无法更新 .gitignore: ${dir}`,
        err,
      );
    }
    // 其他错误静默处理，返回 false
    return false;
  }
}
