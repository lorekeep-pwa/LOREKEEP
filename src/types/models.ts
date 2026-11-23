export type NavSection = 'hub' | 'editor' | 'games' | 'collections' | 'archive';

export interface Game {
  id: string;
  title: string;
  platform: string;
  genre: string;
  developer: string;
  releaseYear: string;
  notes: string;
  coverDataUrl: string | null;
  coverAccent: string;
  createdAt: number;
  updatedAt: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface LoreDocument {
  id: string;
  title: string;
  contentJson: string;
  plainText: string;
  wordCount: number;
  charCount: number;
  gameId: string | null;
  collectionId: string | null;
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentRevision {
  id: string;
  documentId: string;
  title: string;
  contentJson: string;
  wordCount: number;
  createdAt: number;
}

export type EditorFont = 'sans' | 'serif';
export type EditorWidth = 'narrow' | 'comfortable' | 'wide';

export interface AppSettings {
  id: 'user-settings';
  showWordCount: boolean;
  editorFont: EditorFont;
  editorWidth: EditorWidth;
  spellcheck: boolean;
  autoHideChromeWhileTyping: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'user-settings',
  showWordCount: true,
  editorFont: 'sans',
  editorWidth: 'comfortable',
  spellcheck: false,
  autoHideChromeWhileTyping: true,
};

export const GAME_PLATFORMS = [
  'PC',
  'PlayStation 5',
  'Xbox Series X|S',
  'Nintendo Switch',
  'Nintendo Switch 2',
  'Steam Deck',
  'Multiplatform',
  'Other Console',
] as const;

export const GAME_GENRES = [
  'RPG',
  'Action-Adventure',
  'Soulslike',
  'Open World',
  'Sci-Fi / Cyberpunk',
  'Survival Horror',
  'Strategy',
  'Indie / Narrative',
  'FPS / Shooter',
  'Metroidvania',
  'Other',
] as const;

export const ACCENT_SWATCHES = [
  { name: 'Indigo', hex: '#5B6EF5' },
  { name: 'Cobalt', hex: '#4A90D9' },
  { name: 'Emerald', hex: '#3BA573' },
  { name: 'Amber', hex: '#D69E4E' },
  { name: 'Coral', hex: '#D96B6B' },
  { name: 'Slate Violet', hex: '#8F6CE8' },
  { name: 'Teal', hex: '#439EA3' },
  { name: 'Graphite', hex: '#636B7E' },
] as const;
