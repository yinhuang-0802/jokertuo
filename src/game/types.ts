export type Suit = "S" | "H" | "C" | "D";

export type Rank =
  | "3"
  | "2"
  | "A"
  | "K"
  | "Q"
  | "J"
  | "10"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4";

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

export type ComboType =
  | "single"
  | "pair"
  | "straight"
  | "flush"
  | "full_house"
  | "four_kind"
  | "straight_flush";

export type Combo = {
  type: ComboType;
  cards: Card[];
  maxCard: Card;
};

export type Player = {
  id: string;
  name: string;
  isHuman: boolean;
  hand: Card[];
  finishedRank?: number;
  revealed: {
    spadeA: boolean;
    spade3: boolean;
  };
};

export type Trick = {
  byPlayerId: string;
  combo: Combo;
};

export type GameMode = "solo" | "duo";
export type AiDifficulty = "easy" | "normal" | "hard";

export type GameSettings = {
  mode: GameMode;
  difficulty: AiDifficulty;
};

export type GamePhase = "playing" | "finished";

export type GameState = {
  settings: GameSettings;
  phase: GamePhase;
  players: Player[];
  turnIndex: number;
  leaderIndex: number;
  trick: Trick | null;
  passCount: number;
  finishedOrder: string[];
  firstMoveDone: boolean;
  revealedSpades: {
    A: boolean;
    "3": boolean;
  };
};

export type GameResult =
  | {
      type: "2v2";
      teamASpades: { aHolderId: string; threeHolderId: string };
      teamAIds: [string, string];
      teamBIds: [string, string];
      teamAScore: number;
      teamBScore: number;
      winner: "teamA" | "teamB" | "draw";
    }
  | {
      type: "solo";
      soloId: string;
      soloRank: number;
      soloOutcome: "win" | "lose";
    };

