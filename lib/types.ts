export const BOARD_TEMPLATE = {
  columns: ["Development", "Test", "Staging", "Production"] as const,
  rows: [
    "Vem använder miljön?",
    "Vad verifieras?",
    "Hur Produktionslik?",
    "Automatisk Deployment?",
    "Approval?",
  ] as const,
} as const;

export const ROWS = BOARD_TEMPLATE.rows.length;
export const COLS = BOARD_TEMPLATE.columns.length;

export type CellKey = `${number}-${number}`;

export interface TeamBoard {
  cells: Record<CellKey, string>;
  completed: boolean;
}

export interface SessionState {
  name: string;
  maxTeams: number;
  teams: Record<string, TeamBoard>;
}

export function createEmptySession(
  name: string,
  maxTeams: number
): SessionState {
  const teams: Record<string, TeamBoard> = {};
  for (let i = 1; i <= maxTeams; i++) {
    teams[String(i)] = { cells: {}, completed: false };
  }
  return { name, maxTeams, teams };
}
