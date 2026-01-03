/**
 * update 命令 --status 处理逻辑
 */

import { UpdateContext } from "../types.js";
import { showSyncStatus } from "../display.js";

/**
 * 处理 --status 选项
 * @param context 命令上下文
 * @returns 如果处理了该选项返回 true，否则返回 false
 */
export async function handleStatus(context: UpdateContext): Promise<boolean> {
  if (!context.showStatus) {
    return false;
  }

  await showSyncStatus();
  return true;
}
