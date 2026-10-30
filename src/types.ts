export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
export interface Observation {
  game: string;
  puzzleId: string;
  progress: number;
  complete: boolean;
  checkpoint?: Json;
  outcome?: "won" | "lost";
  score?: string;
  guesses?: number;
  shareText?: string;
  shareSource?: string;
  spoiler?: Json;
}
export interface Adapter {
  boardSelector: string;
  overlays: string;
  read(document: Document, storage: Storage, now: Date): Observation | null;
}
export interface Game {
  id: string;
  name: string;
  url: string;
  matches: string[];
  adapter: Adapter;
}
export interface Result {
  outcome: "won" | "lost";
  score: string;
  guesses: number;
  shareText: string;
  shareSource: string;
  spoiler: Json;
  completedAt: number;
  preexisting: boolean;
}
export interface GameProgress {
  puzzleId: string | null;
  seen: boolean;
  progress: number;
  checkpoint: Json;
  activeMs: number;
  result: Result | null;
  screenshotKey: string | null;
  captureAttempts: number;
  error: string | null;
}
export interface Run {
  version: 2;
  id: string;
  createdAt: number;
  updatedAt: number;
  status: "running" | "paused" | "complete" | "stopped";
  pauseReason: string | null;
  order: string[];
  currentGameId: string | null;
  games: Record<string, GameProgress>;
  clock: {
    totalMs: number;
    checkpointAt: number;
    activeGameId: string | null;
    activeTabId: number | null;
    leaseUntil: number;
  };
}
export interface Focus {
  gameId: string;
  tabId: number;
}
export interface CaptureRect {
  x: number;
  y: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  href: string;
}
export type Command =
  | { type: "start"; ids: string[]; random: boolean }
  | { type: "openGame" | "retryCapture"; gameId: string }
  | { type: "next" | "pause" | "resume" | "stop" | "getRun" }
  | { type: "observation"; snapshot: Observation };

export interface Settings {
  order: string[];
  selected: string[];
  random: boolean;
}
