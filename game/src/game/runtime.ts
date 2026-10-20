import type { Thing } from '../data/world';
import { isDialogOpen } from '../ui/dialog';
import { isTitleOpen } from '../ui/title';
import { isWinOpen } from '../ui/win';

/** 不存檔的執行期狀態：風淋剩餘秒數、目前面前可互動的對象。 */
export const rt: { shower: number; near: Thing | null } = { shower: 0, near: null };

/** 對話、視窗、標題畫面或風淋中時，角色不能開始新的移動。 */
export const busy = (): boolean => isDialogOpen() || isWinOpen() || isTitleOpen() || rt.shower > 0;
