/**
 * 命令参数模块
 * 统一导出所有可复用的命令参数定义
 */

// 通用参数
export { allOption } from "./all.js";
export { forceOption } from "./force.js";
export { verboseOption } from "./verbose.js";
export { dryRunOption } from "./dry-run.js";
export { jsonOption } from "./json.js";
export { listOption } from "./list.js";

// add 命令参数
export { nameOption } from "./name.js";
export { branchOption } from "./branch.js";
export { shallowOption, noShallowOption } from "./shallow.js";
export { depthOption } from "./depth.js";

// load 命令参数
export { subdirOption } from "./subdir.js";
export { noIgnoreOption } from "./no-ignore.js";

// unload 命令参数
export { keepEmptyOption } from "./keep-empty.js";
export { cleanEmptyOption } from "./clean-empty.js";

// config 命令参数
export { pathOption } from "./path.js";

// update 命令参数
export { checkOption } from "./check.js";
export { statusOption } from "./status.js";
export { syncOption } from "./sync.js";
export { syncOnlyOption } from "./sync-only.js";
