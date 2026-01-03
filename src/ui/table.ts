/**
 * 表格输出模块
 * 封装表格格式化和输出功能
 */

import chalk from "chalk";

/**
 * 将字符串填充到指定宽度（右侧填充空格）
 * @param str 原始字符串
 * @param width 目标宽度
 * @returns 填充后的字符串
 *
 * @example
 * ```typescript
 * padEnd("hello", 10); // "hello     "
 * padEnd("hello world", 5); // "hello world" (不截断)
 * ```
 */
export function padEnd(str: string, width: number): string {
  if (str.length >= width) return str;
  return str + " ".repeat(width - str.length);
}

/**
 * 将字符串填充到指定宽度（左侧填充空格）
 * @param str 原始字符串
 * @param width 目标宽度
 * @returns 填充后的字符串
 *
 * @example
 * ```typescript
 * padStart("42", 5); // "   42"
 * ```
 */
export function padStart(str: string, width: number): string {
  if (str.length >= width) return str;
  return " ".repeat(width - str.length) + str;
}

/**
 * 截断长字符串
 * @param str 原始字符串
 * @param maxLength 最大长度
 * @param suffix 截断后缀，默认为 "..."
 * @returns 截断后的字符串
 *
 * @example
 * ```typescript
 * truncate("hello world", 8); // "hello..."
 * truncate("hello", 10); // "hello"
 * ```
 */
export function truncate(
  str: string,
  maxLength: number,
  suffix = "...",
): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * 表格列定义
 */
export interface TableColumn {
  /** 列标题 */
  header: string;
  /** 列宽度 */
  width: number;
  /** 对齐方式 */
  align?: "left" | "right" | "center";
}

/**
 * 表格配置选项
 */
export interface TableOptions {
  /** 列定义 */
  columns: TableColumn[];
  /** 行前缀（缩进） */
  indent?: string;
  /** 是否显示表头 */
  showHeader?: boolean;
  /** 表头颜色 */
  headerColor?: "gray" | "white" | "cyan" | "yellow";
}

/**
 * 格式化单元格内容
 * @param value 单元格值
 * @param column 列定义
 * @returns 格式化后的字符串
 */
function formatCell(value: string, column: TableColumn): string {
  const truncated = truncate(value, column.width - 2);

  switch (column.align) {
    case "right":
      return padStart(truncated, column.width);
    case "center": {
      const totalPadding = column.width - truncated.length;
      const leftPadding = Math.floor(totalPadding / 2);
      const rightPadding = totalPadding - leftPadding;
      return " ".repeat(leftPadding) + truncated + " ".repeat(rightPadding);
    }
    case "left":
    default:
      return padEnd(truncated, column.width);
  }
}

/**
 * 打印表格
 * @param options 表格配置
 * @param rows 数据行（每行是一个字符串数组）
 *
 * @example
 * ```typescript
 * printTable(
 *   {
 *     columns: [
 *       { header: "NAME", width: 20 },
 *       { header: "STATUS", width: 15 },
 *       { header: "COUNT", width: 10, align: "right" }
 *     ],
 *     indent: "  ",
 *     showHeader: true
 *   },
 *   [
 *     ["repo1", "active", "42"],
 *     ["repo2", "inactive", "0"]
 *   ]
 * );
 * ```
 */
export function printTable(options: TableOptions, rows: string[][]): void {
  const {
    columns,
    indent = "",
    showHeader = true,
    headerColor = "gray",
  } = options;

  // 打印表头
  if (showHeader) {
    const headerRow = columns
      .map((col) => formatCell(col.header, col))
      .join("");
    const coloredHeader = applyColor(headerRow, headerColor);
    console.log(indent + coloredHeader);
  }

  // 打印数据行
  for (const row of rows) {
    const formattedRow = columns
      .map((col, index) => formatCell(row[index] ?? "", col))
      .join("");
    console.log(indent + formattedRow);
  }
}

/**
 * 应用颜色
 * @param text 文本
 * @param color 颜色名称
 * @returns 带颜色的文本
 */
function applyColor(
  text: string,
  color: "gray" | "white" | "cyan" | "yellow",
): string {
  switch (color) {
    case "gray":
      return chalk.gray(text);
    case "white":
      return chalk.white(text);
    case "cyan":
      return chalk.cyan(text);
    case "yellow":
      return chalk.yellow(text);
    default:
      return text;
  }
}

/**
 * 打印简单的键值对列表
 * @param items 键值对数组
 * @param options 配置选项
 *
 * @example
 * ```typescript
 * printKeyValue([
 *   { key: "Name", value: "my-repo" },
 *   { key: "Path", value: "/path/to/repo" },
 *   { key: "Branch", value: "main" }
 * ], { indent: "  ", keyWidth: 10 });
 * ```
 */
export function printKeyValue(
  items: { key: string; value: string }[],
  options: { indent?: string; keyWidth?: number; separator?: string } = {},
): void {
  const { indent = "", keyWidth = 12, separator = ":" } = options;

  for (const item of items) {
    const key = chalk.gray(padEnd(item.key + separator, keyWidth));
    console.log(`${indent}${key} ${item.value}`);
  }
}

/**
 * 打印分隔线
 * @param length 分隔线长度
 * @param char 分隔字符，默认为 "-"
 */
export function printSeparator(length: number, char = "-"): void {
  console.log(chalk.gray(char.repeat(length)));
}

/**
 * 打印空行
 * @param count 空行数量，默认为 1
 */
export function printEmptyLine(count = 1): void {
  for (let i = 0; i < count; i++) {
    console.log();
  }
}

/**
 * 打印标题
 * @param title 标题文本
 * @param options 配置选项
 */
export function printTitle(
  title: string,
  options: { bold?: boolean; icon?: string } = {},
): void {
  const { bold = true, icon } = options;
  const text = icon ? `${icon} ${title}` : title;
  console.log(bold ? chalk.bold(text) : text);
}

/**
 * 打印统计信息
 * @param total 总数
 * @param unit 单位（单数形式）
 * @param pluralUnit 单位（复数形式），默认为单数形式加 "s"
 */
export function printTotal(
  total: number,
  unit: string,
  pluralUnit?: string,
): void {
  const actualUnit = total === 1 ? unit : (pluralUnit ?? unit + "s");
  console.log(chalk.gray(`Total: ${total} ${actualUnit}`));
}
