/**
 * load 命令
 * 将缓存的仓库内容复制到当前工作目录
 * 支持直接传入 git URL，会自动先 add 再 load
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import * as repository from "../core/repository.js";
import * as filesystem from "../core/filesystem.js";
import * as loading from "../core/loading.js";
import { GrfError, ErrorCode } from "../types/index.js";

/**
 * 检查字符串是否为 Git URL
 * 支持 HTTPS 和 SSH 格式
 */
function isGitUrl(str: string): boolean {
  // HTTPS 格式: https://github.com/user/repo.git
  const httpsRegex = /^https?:\/\/[^/]+\/[^/]+\/[^/]+/;
  // SSH 格式: git@github.com:user/repo.git
  const sshRegex = /^git@[^:]+:[^/]+\/[^/]+/;

  return httpsRegex.test(str) || sshRegex.test(str);
}

export const loadCommand = new Command("load")
  .description(
    "Copy reference repository to current directory (supports Git URL)",
  )
  .argument("<name>", "Repository name, short name, or Git URL")
  .argument("[path]", "Target path (default: .gitreference/<repo-path>)")
  .option("-s, --subdir <path>", "Copy only a specific subdirectory")
  .option("--no-ignore", "Do not update .gitignore")
  .option("-b, --branch <branch>", "Specify branch (only for Git URL)")
  .action(
    async (
      name: string,
      targetPath: string | undefined,
      options: {
        subdir?: string;
        ignore: boolean;
        branch?: string;
      },
    ) => {
      let repoName = name;

      // 检查是否为 Git URL
      if (isGitUrl(name)) {
        const addSpinner = ora("Adding repository...").start();

        try {
          // 检查仓库是否已存在
          const parsed = repository.parseRepoUrl(name);
          const fullName = `${parsed.host}/${parsed.owner}/${parsed.repo}`;

          if (await repository.exists(fullName)) {
            addSpinner.info(
              chalk.blue("Repository already exists, skipping add..."),
            );
            repoName = fullName;
          } else {
            // 自动添加仓库
            const repoInfo = await repository.add(name, {
              branch: options.branch,
              shallow: true,
              depth: 1,
            });
            addSpinner.succeed(chalk.green("Repository added successfully!"));
            console.log(`  ${chalk.gray("Name:")}     ${repoInfo.name}`);
            console.log(
              `  ${chalk.gray("Commit:")}   ${repoInfo.commitId.substring(0, 7)}...`,
            );
            console.log();
            repoName = repoInfo.name;
          }
        } catch (error) {
          addSpinner.fail(chalk.red("Failed to add repository"));

          if (error instanceof GrfError) {
            console.error(chalk.red(`\n${chalk.bold("✗")} ${error.message}`));
          } else if (error instanceof Error) {
            console.error(chalk.red(`\n${chalk.bold("✗")} ${error.message}`));
          } else {
            console.error(
              chalk.red(`\n${chalk.bold("✗")} An unknown error occurred`),
            );
          }
          process.exit(1);
        }
      }

      const spinner = ora("Copying repository...").start();

      try {
        // 检查仓库是否存在
        if (!(await repository.exists(repoName))) {
          spinner.fail(chalk.red("Repository not found"));
          console.error(
            chalk.red(
              `\n${chalk.bold("✗")} Repository "${repoName}" does not exist.`,
            ),
          );
          console.error(
            chalk.gray(
              `  Use ${chalk.cyan("grf add <url>")} to add a repository first.`,
            ),
          );
          console.error(
            chalk.gray(
              `  Or use ${chalk.cyan("grf load <url>")} to add and load in one step.`,
            ),
          );
          process.exit(1);
        }

        // 获取仓库信息
        let repoInfo = await repository.get(repoName);
        if (!repoInfo) {
          spinner.fail(chalk.red("Failed to get repository info"));
          process.exit(1);
        }

        // 如果指定了分支且与当前分支不同，则切换分支
        if (options.branch && repoInfo.branch !== options.branch) {
          spinner.text = `Switching to branch ${options.branch}...`;
          try {
            repoInfo = await repository.switchBranch(repoName, options.branch);
            spinner.text = "Copying repository...";
          } catch (error) {
            spinner.fail(chalk.red(`Failed to switch branch`));
            if (error instanceof GrfError) {
              console.error(chalk.red(`\n${chalk.bold("✗")} ${error.message}`));
              if (error.code === ErrorCode.GIT_CHECKOUT_FAILED) {
                console.error(
                  chalk.gray(
                    `  Branch "${options.branch}" may not exist. Use ${chalk.cyan("git branch -r")} to list available branches.`,
                  ),
                );
              }
            } else if (error instanceof Error) {
              console.error(chalk.red(`\n${chalk.bold("✗")} ${error.message}`));
            } else {
              console.error(
                chalk.red(`\n${chalk.bold("✗")} An unknown error occurred`),
              );
            }
            process.exit(1);
          }
        }

        // 解析仓库路径
        const repoPath = await repository.resolvePath(repoName);

        // 确定源路径（如果指定了 subdir，则使用子目录）
        const sourcePath = options.subdir
          ? path.join(repoPath, options.subdir)
          : repoPath;

        // 检查源路径是否存在（特别是子目录情况）
        if (options.subdir && !(await filesystem.exists(sourcePath))) {
          spinner.fail(chalk.red("Subdirectory not found"));
          console.error(
            chalk.red(
              `\n${chalk.bold("✗")} Subdirectory "${options.subdir}" does not exist in repository "${repoInfo.name}".`,
            ),
          );
          process.exit(1);
        }

        // 确定目标路径
        const finalTargetPath = targetPath
          ? path.resolve(process.cwd(), targetPath)
          : path.join(process.cwd(), ".gitreference", repoInfo.name);

        // 确保目标目录的父目录存在
        await filesystem.ensureDir(path.dirname(finalTargetPath));

        // 复制文件（排除 .git 和 meta.json）
        await filesystem.copyDir(sourcePath, finalTargetPath, {
          exclude: [".git", "meta.json", ".grf-meta.json"],
          overwrite: true,
        });

        // 更新 .gitignore（如果没有 --no-ignore 选项）
        if (options.ignore !== false) {
          // 始终添加 .gitreference/ 条目（默认行为）
          await filesystem.updateGitignore(process.cwd(), ".gitreference/");

          // 如果用户指定了自定义路径，额外添加该路径
          if (targetPath) {
            // 计算相对于工作目录的路径
            const relativePath = path.relative(process.cwd(), finalTargetPath);
            // 确保路径使用正斜杠（跨平台兼容）并以 / 结尾（表示目录）
            const normalizedPath = relativePath.replace(/\\/g, "/");
            const gitignoreEntry = normalizedPath.endsWith("/")
              ? normalizedPath
              : normalizedPath + "/";

            // 避免重复添加（如果自定义路径在 .gitreference/ 下则跳过）
            if (!gitignoreEntry.startsWith(".gitreference/")) {
              await filesystem.updateGitignore(process.cwd(), gitignoreEntry);
            }
          }
        }

        // 记录加载信息到 loading.json
        const relativeTargetPath = path
          .relative(process.cwd(), finalTargetPath)
          .replace(/\\/g, "/");
        await loading.addEntry({
          repoName: repoInfo.name,
          repoUrl: repoInfo.url,
          commitId: repoInfo.commitId,
          branch: repoInfo.branch,
          subdir: options.subdir,
          targetPath: relativeTargetPath,
        });

        spinner.succeed(chalk.green("Repository copied successfully!"));

        // 显示复制信息
        console.log();
        console.log(`  ${chalk.gray("Source:")}   ${sourcePath}`);
        console.log(`  ${chalk.gray("Target:")}   ${finalTargetPath}`);
        console.log(
          `  ${chalk.gray("Commit:")}   ${repoInfo.commitId.substring(0, 7)}...`,
        );
      } catch (error) {
        spinner.fail(chalk.red("Failed to copy repository"));

        if (error instanceof GrfError) {
          console.error(chalk.red(`\n${chalk.bold("✗")} ${error.message}`));

          // 提供更具体的错误提示
          if (error.code === ErrorCode.REPO_NOT_FOUND) {
            console.error(
              chalk.gray(
                `  Use ${chalk.cyan("grf add <url>")} to add a repository first.`,
              ),
            );
          } else if (error.code === ErrorCode.FS_PATH_NOT_FOUND) {
            console.error(
              chalk.gray(
                `  The source path does not exist. Please check the repository or subdirectory.`,
              ),
            );
          } else if (error.code === ErrorCode.FS_PERMISSION_DENIED) {
            console.error(
              chalk.gray(
                `  Permission denied. Please check your file permissions.`,
              ),
            );
          }
          process.exit(1);
        }

        // 未知错误
        if (error instanceof Error) {
          console.error(chalk.red(`\n${chalk.bold("✗")} ${error.message}`));
        } else {
          console.error(
            chalk.red(`\n${chalk.bold("✗")} An unknown error occurred`),
          );
        }
        process.exit(1);
      }
    },
  );
