import type { Flashcard, Lesson, Question, QuestionGenerator } from '../types';
import { QUESTIONS_A1_BASE } from './questions-a1-base';
import { QUESTIONS_A1_ADV } from './questions-a1-adv';
import { QUESTIONS_CAP } from './questions-cap';
import { GENERATORS } from './generators';
import { CARDS } from './cards';
import { LESSONS } from './lessons';

export const QUESTIONS: Question[] = [...QUESTIONS_A1_BASE, ...QUESTIONS_A1_ADV, ...QUESTIONS_CAP];
export { GENERATORS, CARDS, LESSONS };
export type { Flashcard, Lesson, Question, QuestionGenerator };
