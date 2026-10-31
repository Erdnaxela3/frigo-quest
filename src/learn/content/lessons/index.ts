import type { Lesson } from '../../types';
import reglementation from './reglementation';
import thermo from './thermo';
import saturation from './saturation';
import circuit from './circuit';
import etancheite from './etancheite';
import videPression from './vide-pression';
import recuperation from './recuperation';
import composants from './composants';
import brasage from './brasage';
import substitution from './substitution';
import hydrocarbures from './hydrocarbures';
import capUp1 from './cap-up1';
import capUp2 from './cap-up2';
import capUp3 from './cap-up3';

export const LESSONS: Lesson[] = [
  reglementation, thermo, saturation, circuit, etancheite, videPression, recuperation,
  composants, brasage, substitution, hydrocarbures, capUp1, capUp2, capUp3,
];
