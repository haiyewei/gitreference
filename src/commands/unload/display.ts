/**
 * unload 命令显示/格式化逻辑
 */

import chalk from "chalk";
import { select } from "@inquirer/prompts";
import { LoadingEntry } from "../../types/index.js";
import { padEnd } from "../../ui/table.js";
import { EmptyDir } from "./types.js";

/**
 * 交互式仓库条目选择
 * @param matches 匹配的条目列表
 * @param name 用户输入的名称
 * @returns 用户选择的条目，如果取消则返回 null
 */
export async function selectEntry(
  matches: LoadingEntry[],
  name: string,
): Promise<LoadingEntry | null> {
  console.log(
    chalk.yellow(`Found ${matches.length} reference code matching '${name}':`),
  );
  console.log();

  try {
    const selected = await select({
      message: "Select reference code to remove:",
      choices: [
        ...matches.map((match) => ({
          name: `${match.repoName} -> ${match.targetPath}`,
          value: match,
        })),
        {
          name: chalk.gray("Cancel"),
          value: null as LoadingEntry | null,
        },
      ],
    });

    return selected;
  } catch {
    // 用户按 Ctrl+C 取消
    return null;
  }
}

/**
 * 显示已加载的条目列表
 * @param loadedEntries 已加载的条目列表
 * @param verbose 是否显示详细信息
 */
export function displayLoadedEntries(
  loadedEntries: LoadingEntry[],
  verbose = false,
): void {
  console.log(
    chalk.bold(
      `📦 Loaded reference code in current project (${loadedEntries.length})`,
    ),
  );
  console.log();

  // 表头
  const COL_NAME = 35;
  const COL_PATH = 30;
  const COL_COMMIT = 10;
  console.log(
    chalk.gray(
      "  " +
        padEnd("REPO", COL_NAME) +
        padEnd("PATH", COL_PATH) +
        padEnd("COMMIT", COL_COMMIT),
    ),
  );

  // 条目列表
  for (const entry of loadedEntries) {
    const repoName = entry.repoName.replace(/\\/g, "/");
    const targetPath = entry.targetPath.replace(/\\/g, "/");
    const commitShort = entry.commitId ? entry.commitId.substring(0, 7) : "-";
    console.log(
      "  " +
        padEnd(repoName, COL_NAME) +
        padEnd(targetPath, COL_PATH) +
        padEnd(commitShort, COL_COMMIT),
    );
  }

  console.log();

  // 在详细模式下显示更多信息
  if (verbose) {
    console.log(chalk.gray("Details:"));
    for (const entry of loadedEntries) {
      console.log(chalk.gray(`  - ${entry.repoName}`));
      console.log(chalk.gray(`    ID: ${entry.id}`));
      console.log(chalk.gray(`    URL: ${entry.repoUrl}`));
      console.log(chalk.gray(`    Path: ${entry.targetPath}`));
      console.log(chalk.gray(`    Commit: ${entry.commitId}`));
      if (entry.branch) {
        console.log(chalk.gray(`    Branch: ${entry.branch}`));
      }
      if (entry.subdir) {
        console.log(chalk.gray(`    Subdir: ${entry.subdir}`));
      }
      console.log(chalk.gray(`    Loaded at: ${entry.loadedAt}`));
      if (entry.updatedAt) {
        console.log(chalk.gray(`    Updated at: ${entry.updatedAt}`));
      }
    }
    console.log();
  }
}

/**
 * 显示空目录提示
 * @param emptyDirs 空目录列表
 * @param verbose 是否显示详细信息
 */
export function displayEmptyDirsHint(
  emptyDirs: EmptyDir[],
  verbose = false,
): void {
  console.log(
    chalk.yellow(`⚠️  Found ${emptyDirs.length} empty directory structures`),
  );
  if (verbose) {
    for (const dir of emptyDirs) {
      console.log(chalk.gray(`    - ${dir.fullPath.replace(/\\/g, "/")}`));
    }
  }
  console.log(
    chalk.gray(`   Use 'grf unload --clean-empty' to clean empty directories`),
  );
  console.log();
}

/**
 * 显示用法帮助
 */
export function displayUsageHelp(): void {
  console.log(chalk.yellow("No reference code specified to remove."));
  console.log();
  console.log("Usage:");
  console.log(
    `  ${chalk.cyan("grf unload <name>")}        Remove specific reference code`,
  );
  console.log(
    `  ${chalk.cyan("grf unload --all")}         Remove all reference code`,
  );
  console.log(
    `  ${chalk.cyan("grf unload --list")}        List all loaded reference code`,
  );
  console.log(
    `  ${chalk.cyan("grf unload --clean-empty")} Clean empty directory structures`,
  );
  console.log();
  console.log(
    `Use '${chalk.cyan("grf unload --list")}' to see all loaded reference code.`,
  );
}
