export const DART_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export const MULTIPLIERS = {
  SINGLE: 'SINGLE',
  DOUBLE: 'DOUBLE',
  TRIPLE: 'TRIPLE',
};

export const SPECIAL_DARTS = {
  MISS: 'MISS',
  OUTER_BULL: 'OUTER_BULL',
  BULLSEYE: 'BULLSEYE',
};

export const SPECIAL_SCORES = {
  MISS: 0,
  OUTER_BULL: 25,
  BULLSEYE: 50,
};

export const MAX_DARTS_PER_TURN = 3;
export const DEFAULT_STARTING_SCORE = 501;
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 1;

export const GAME_STATUS = {
  SETUP: 'setup',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
};

export const STORAGE_KEYS = {
  ACTIVE_GAME: 'dartscore_active_game',
  GAME_HISTORY: 'dartscore_game_history',
  SETTINGS: 'dartscore_settings',
  ACTIVE_TOURNAMENT: 'dartscore_active_tournament',
  TOURNAMENT_HISTORY: 'dartscore_tournament_history',
  ACTIVE_TOURNAMENT_MATCH: 'dartscore_active_tournament_match',
};

export const DEFAULT_RULES = {
  doubleIn: false,
  doubleOut: true,
};

export const TOURNAMENT_STATUS = {
  SETUP: 'setup',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const MATCH_STATUS = {
  UPCOMING: 'upcoming',
  IN_PROGRESS: 'in_progress',
  PAUSED: 'paused',
  COMPLETED: 'completed',
};

export const TOURNAMENT_FORMAT = {
  SINGLE_ELIMINATION: 'single_elimination',
  DOUBLE_ELIMINATION: 'double_elimination',
};

export const TOURNAMENT_FORMAT_LABELS = {
  [TOURNAMENT_FORMAT.SINGLE_ELIMINATION]: 'Single Elimination',
  [TOURNAMENT_FORMAT.DOUBLE_ELIMINATION]: 'Double Elimination',
};

export const BRACKET_TYPE = {
  WINNERS: 'winners',
  LOSERS: 'losers',
  GRAND_FINAL: 'grand_final',
};

export const MATCH_FORMAT = {
  BEST_OF_1: 'best_of_1',
  BEST_OF_3: 'best_of_3',
  BEST_OF_5: 'best_of_5',
};

export const MATCH_FORMAT_LABELS = {
  [MATCH_FORMAT.BEST_OF_1]: 'Best of 1',
  [MATCH_FORMAT.BEST_OF_3]: 'Best of 3',
  [MATCH_FORMAT.BEST_OF_5]: 'Best of 5',
};

export const SUPPORTED_PLAYER_COUNTS = [4, 8, 16];

export const GAME_CONTEXT = {
  STANDALONE: 'standalone',
  TOURNAMENT_LEG: 'tournament_leg',
};

export const MULTIPLIER_DISPLAY = {
  SINGLE: { label: 'S', color: 'bg-slate-500' },
  DOUBLE: { label: 'D', color: 'bg-red-500' },
  TRIPLE: { label: 'T', color: 'bg-green-500' },
};
