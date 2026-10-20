export const RESPONSES = ['swallow', 'clarify', 'boundary', 'talk'] as const;
export type ResponseId = (typeof RESPONSES)[number];

/**
 * 話術事件後的四種回應（規格 5.7）：理智、對施加者的關係、對盟友的關係。
 * 澄清事實要有相關證據才有效；沒有證據會被反問，理智 −3。
 */
export function responseEffect(id: ResponseId, hasEvidence: boolean): { sanity: number; target: number; ally: number } {
  switch (id) {
    case 'swallow':
      return { sanity: -3, target: 5, ally: 0 };
    case 'clarify':
      return { sanity: hasEvidence ? 0 : -3, target: -5, ally: 0 };
    case 'boundary':
      return { sanity: 5, target: -10, ally: 0 };
    case 'talk':
      return { sanity: 5, target: 0, ally: 5 };
  }
}
