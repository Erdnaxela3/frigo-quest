import type { Level } from '../game/types';
import L01 from './L01';
import L02 from './L02';
import L03 from './L03';
import L04 from './L04';
import L05 from './L05';

export const LEVELS: Level[] = [L01, L02, L03, L04, L05];

export const getLevel = (id: string | undefined) => LEVELS.find((l) => l.id === id);
