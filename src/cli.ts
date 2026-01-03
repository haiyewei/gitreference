#!/usr/bin/env node

import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { registerAllCommands } from "./commands/index.js";

// 读取 package.json 获取版本号
const packageJsonPath = path.join(__dirname, "..", "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

const program = new Command();

program
  .name("grf")
  .description("Git Reference - A lightweight tool for managing reference code")
  .version(packageJson.version);

// 注册所有命令
registerAllCommands(program);

// 全局错误处理
process.on("uncaughtException", (error: Error) => {
  console.error("Error:", error.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  console.error(
    "Error:",
    reason instanceof Error ? reason.message : String(reason),
  );
  process.exit(1);
});

// 解析命令行参数
program.parse();
