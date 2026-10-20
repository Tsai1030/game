import { C } from './palette';

export type PortraitId = 'sys' | 'me' | 'meSuit' | 'boss' | 'kevin' | 'fse';

const BOSS = ['................', '.....OOOOOO.....', '....OHHHHHHO....', '...OHHHHHHHHO...', '...OHSSSSSSHO...', '...OSSSSSSSSO...', '...OGGGSSGGGO...', '...OGEGSSGEGO...', '...OSSSSSSSSO...', '...OSSSMMSSSO...', '....OSSSSSSO....', '.....OOSSOO.....', '...OOWWRRWWOO...', '..OWWWWRRWWWWO..', '..OWWWWRRWWWWO..', '..OOOOOOOOOOOO..'];
const HOOD = ['................', '.....OOOOOO.....', '....OWWWWWWO....', '...OWWWWWWWWO...', '...OWVVVVVVWO...', '...OWVEVVEVWO...', '...OWVVVVVVWO...', '...OWWWWWWWWO...', '...OWWWWWWWWO...', '....OWWWWWWO....', '.....OOWWOO.....', '...OOWWWWWWOO...', '..OWWWWSSWWWWO..', '..OWWWWWWWWWWO..', '..OWWWWWWWWWWO..', '..OOOOOOOOOOOO..'];
const ME = ['................', '.....OOOOOO.....', '....OHHHHHHO....', '...OHHHHHHHHO...', '...OHHSSSSHHO...', '...OHSSSSSSHO...', '...OSSESSESSO...', '...OSSSSSSSSO...', '...OSSSMMSSSO...', '....OSSSSSSO....', '.....OOSSOO.....', '...OOBBBBBBOO...', '..OBBBBBBBBBBO..', '..OBBBBBBBBBBO..', '..OBBBBBBBBBBO..', '..OOOOOOOOOOOO..'];
const PHONE = ['................', '....OOOOOOOO....', '....OKKKKKKO....', '....OKAAAAKO....', '....OKARRAKO....', '....OKAAAAKO....', '....OKARRAKO....', '....OKAAAAKO....', '....OKAAAAKO....', '....OKKKKKKO....', '....OKKWWKKO....', '....OKKKKKKO....', '....OOOOOOOO....', '................', '................', '................'];

/** 16×16 頭像：每個字元對應一種顏色，'.' 是透明。 */
export const PORTRAITS: Record<PortraitId, [string[], Record<string, string>]> = {
  boss: [BOSS, { O: C.line, H: '#8a8898', S: C.skin, G: C.line, E: C.white, M: C.red, W: '#f4f2fa', R: C.red }],
  kevin: [HOOD, { O: C.line, W: C.suit, S: C.suit2, V: C.visor, E: C.skin }],
  fse: [HOOD, { O: C.line, W: C.suit, S: '#f08a2a', V: C.visor, E: C.skin }],
  me: [ME, { O: C.line, H: '#2b2230', S: C.skin, E: C.line, M: '#c0605a', B: '#8fb8e0' }],
  meSuit: [HOOD, { O: C.line, W: C.suit, S: C.glove, V: C.visor, E: C.skin }],
  sys: [PHONE, { O: C.line, K: '#3a3e6b', A: C.win, R: C.red, W: C.white }],
};

export function drawPortrait(ctx: CanvasRenderingContext2D, id: PortraitId): void {
  const [rows, map] = PORTRAITS[id];
  ctx.clearRect(0, 0, 16, 16);
  rows.forEach((row, j) => {
    for (let i = 0; i < 16; i++) {
      const ch = row[i]!;
      if (ch === '.') continue;
      ctx.fillStyle = map[ch] ?? C.line;
      ctx.fillRect(i, j, 1, 1);
    }
  });
}
