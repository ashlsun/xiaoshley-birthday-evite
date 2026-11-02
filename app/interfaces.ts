export interface Attendee {
  name: string;
  timestamp: number;
}

export interface Eviction {
  name: string;
  timestamp: number;
}

export type PollChoice = "yes" | "no";

export interface PollVote {
  voter: string;
  voterName: string;
  choice: PollChoice;
  timestamp: number;
}

export interface SuggestedAction {
  name: string;
  text: string;
  timestamp: number;
}

export interface SuggestionVote {
  suggestionId: string;
  voter: string;
  timestamp: number;
}

export interface Poop {
  pooper: string;
  timestamp: number;
  ignoreInLeaderboard?: boolean;
}
