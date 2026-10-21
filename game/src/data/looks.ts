import type { LookId } from './world';

/** 人物外觀：頭髮（或帽子）、上衣、褲子、領帶、無塵衣、手套的顏色。2D 與 3D 共用。 */
export interface Look {
  hair?: string;
  top?: string;
  bottom?: string;
  tie?: boolean;
  suit?: boolean;
  glove?: string;
}

export const LOOK: Record<LookId, Look> = {
  office: { hair: '#2b2230', top: '#8fb8e0', bottom: '#4a4670' },
  suit: { suit: true },
  boss: { hair: '#8a8898', top: '#f4f2fa', bottom: '#4a4670', tie: true },
  kevin: { suit: true },
  kevinDay: { hair: '#3a2e2a', top: '#5a6a8a', bottom: '#2b2d3a' },
  fse: { suit: true, glove: '#f08a2a' },
  fang: { hair: '#1e1a24', top: '#2f7d74', bottom: '#2b2d3a' },
  amy: { hair: '#6b4a32', top: '#e8a0b4', bottom: '#7a7f92' },
  guard: { hair: '#23304a', top: '#9fb4d0', bottom: '#23304a' },
};
