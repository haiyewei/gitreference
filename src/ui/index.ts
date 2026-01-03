/**
 * UI 模块统一导出
 * 提供用户界面相关的工具函数
 */

// Spinner 相关
export {
  createSpinner,
  startSpinner,
  withSpinner,
  withSpinnerMessages,
  type Spinner,
  type SpinnerOptions,
} from "./spinner.js";

// 用户交互提示相关
export {
  confirm,
  prompt,
  selectByNumber,
  showCancelled,
  showWarning,
  showInfo,
  showSuccess,
  type ConfirmOptions,
  type PromptOptions,
} from "./prompt.js";

// 表格输出相关
export {
  padEnd,
  padStart,
  truncate,
  printTable,
  printKeyValue,
  printSeparator,
  printEmptyLine,
  printTitle,
  printTotal,
  type TableColumn,
  type TableOptions,
} from "./table.js";

// 格式化输出相关
export {
  shortCommit,
  formatDate,
  formatBytes,
  formatNumber,
  formatDuration,
  shortenPath,
  normalizePath,
  formatRepoName,
  StatusIcon,
  getStatusIcon,
  formatError,
  formatSuccess,
  formatWarning,
  formatHint,
  highlightCommand,
  highlightPath,
  highlightName,
} from "./format.js";
