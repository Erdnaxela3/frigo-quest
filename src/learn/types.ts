export type Confidence = 'ok' | 'secondary' | 'disputed';

interface QBase {
  id: string; // unique, e.g. "q-1.03-psat-r32"
  skills: string[]; // ids from skills.ts
  prompt: string; // French
  explain: string; // shown after answering
  confidence: Confidence;
}

export type Question =
  | (QBase & { type: 'single'; choices: string[]; answer: number })
  | (QBase & { type: 'multi'; choices: string[]; answer: number[] })
  | (QBase & { type: 'numeric'; answer: { value: number; tol: number }; unit: string })
  | (QBase & { type: 'order'; choices: string[] }); // choices listed in the correct order; UI shuffles

/** Parametrised question source. rng() ∈ [0,1). Must return a fresh Question with a unique id. */
export interface QuestionGenerator {
  id: string;
  skills: string[];
  label: string;
  make: (rng: () => number) => Question;
}

export interface Flashcard {
  id: string;
  skills: string[];
  front: string;
  back: string;
  deck: 'fluides' | 'composants' | 'reglementation' | 'danfoss' | 'procedures' | 'unites' | 'electricite' | 'securite';
  confidence: Confidence;
}

export type WidgetId = 'pt-slider' | 'tco2e' | 'service-valve' | 'pressostat' | 'r290-limit' | 'logph';

export interface LessonSection {
  title: string;
  body: string; // markdown subset: paragraphs, **bold**, *italic*, "- " lists, "| a | b |" tables, "### " headings
  widget?: WidgetId;
}

export interface Lesson {
  id: string; // e.g. "reglementation"
  title: string;
  skills: string[];
  sections: LessonSection[];
  level?: string; // related game level id, e.g. "L04"
}
