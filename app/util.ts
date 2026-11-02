import {
  Attendee,
  Eviction,
  Poop,
  PollVote,
  SuggestionVote,
} from "./interfaces";

export const getLeaderboard = (poops: Poop[]) => {
  const counts = new Map<string, number>();
  for (const poop of poops) {
    if (!poop.ignoreInLeaderboard) {
      counts.set(poop.pooper, (counts.get(poop.pooper) ?? 0) + 1);
    }
  }
  return [...counts.entries()].toSorted((a, b) => b[1] - a[1]);
};

const BURST_WINDOW_MS = 60_000;

export interface PoopBurst {
  pooper: string;
  timestamp: number; // of the most recent poop in the burst
  count: number;
}

export const getPoopBursts = (poops: Poop[]): PoopBurst[] => {
  const sorted = poops.toSorted((a, b) => a.timestamp - b.timestamp);
  const bursts: (PoopBurst & { startedAt: number })[] = [];
  const openBursts = new Map<string, PoopBurst & { startedAt: number }>();

  for (const poop of sorted) {
    const open = openBursts.get(poop.pooper);
    if (open && poop.timestamp - open.startedAt <= BURST_WINDOW_MS) {
      open.count++;
      open.timestamp = poop.timestamp;
    } else {
      const burst = {
        pooper: poop.pooper,
        timestamp: poop.timestamp,
        startedAt: poop.timestamp,
        count: 1,
      };
      bursts.push(burst);
      openBursts.set(poop.pooper, burst);
    }
  }

  return bursts.toSorted((a, b) => b.timestamp - a.timestamp);
};

const BURST_PHRASES: Record<number, string> = {
  1: "pooped",
  2: "pooped not just once, but twice",
  3: "pooped thrice",
  4: "pooped frice (four-ice?)",
  5: "pooped fiveice",
  6: "achieved 6 poops in a row",
  7: "unleashed 7 poops a minute",
  8: "performed an octuple evacuation",
  10: "crossed into a double digit number of poops",
  11: "pooped eleven-fold",
  12: "pooped a full dozen times",
  20: "engaged in vigintuple voiding event",
  50: "pooped half a hundred times",
  67: "pooped 67 times, wow",
  100: "ascended",
};

const OVERACHIEVER_ADJECTIVES = [
  "a whopping",
  "a marvelous",
  "an impressive",
  "a staggering",
  "a mighty",
  "an astonishing",
  "a heroic",
  "an absurd",
];

export const describePoopRepeat = (count: number) => {
  return count > 1
    ? `waited a bit, then pooped again ${count} times`
    : "waited a bit, then pooped again";
};

export const describePoopBurst = (count: number) => {
  if (count > 100) {
    const adjective =
      OVERACHIEVER_ADJECTIVES[count % OVERACHIEVER_ADJECTIVES.length];
    return `pooped ${adjective} ${count} times`;
  }
  return BURST_PHRASES[count] ?? `pooped ${count} times`;
};

export interface PoopEvent {
  kind: "poop";
  timestamp: number;
  pooper: string;
  count: number;
  /** True when this burst directly follows an earlier one by the same pooper. */
  repeat?: boolean;
}

export interface InductionEvent {
  kind: "induction";
  timestamp: number;
  name: string;
}

export interface EvictionEvent {
  kind: "eviction";
  timestamp: number;
  name: string;
}

export type HistoryEvent = PoopEvent | InductionEvent | EvictionEvent;

export const getHistory = (
  poops: Poop[],
  attendees: Attendee[],
  evictions: Eviction[],
): HistoryEvent[] => {
  const poopEvents: HistoryEvent[] = getPoopBursts(poops).map((burst) => ({
    kind: "poop",
    timestamp: burst.timestamp,
    pooper: burst.pooper,
    count: burst.count,
  }));

  const firstInductions = new Map<string, InductionEvent>();
  for (const attendee of attendees) {
    const key = attendee.name.trim().toLowerCase();
    const existing = firstInductions.get(key);
    if (!existing || attendee.timestamp < existing.timestamp) {
      firstInductions.set(key, {
        kind: "induction",
        timestamp: attendee.timestamp,
        name: attendee.name,
      });
    }
  }

  const evictionEvents: HistoryEvent[] = evictions.map((eviction) => ({
    kind: "eviction",
    timestamp: eviction.timestamp,
    name: eviction.name,
  }));

  const events: HistoryEvent[] = [
    ...poopEvents,
    ...firstInductions.values(),
    ...evictionEvents,
  ].toSorted((a, b) => a.timestamp - b.timestamp);

  events.forEach((event, index) => {
    const previous = events[index - 1];
    if (
      event.kind === "poop" &&
      previous?.kind === "poop" &&
      previous.pooper === event.pooper &&
      event.timestamp - previous.timestamp > BURST_WINDOW_MS
    ) {
      event.repeat = true;
    }
  });

  return events.toSorted((a, b) => b.timestamp - a.timestamp);
};

export const getPollResults = (votes: PollVote[]) => {
  const latestVotes = new Map<string, PollVote>();
  for (const vote of votes) {
    const existing = latestVotes.get(vote.voter);
    if (!existing || vote.timestamp > existing.timestamp) {
      latestVotes.set(vote.voter, vote);
    }
  }

  let yes = 0;
  let no = 0;
  for (const vote of latestVotes.values()) {
    if (vote.choice === "yes") {
      yes++;
    } else {
      no++;
    }
  }

  return { yes, no };
};

export const getUpvoteCounts = (votes: SuggestionVote[]) => {
  const upvoters = new Map<string, Set<string>>();
  for (const vote of votes) {
    const voters = upvoters.get(vote.suggestionId) ?? new Set<string>();
    voters.add(vote.voter);
    upvoters.set(vote.suggestionId, voters);
  }

  const counts = new Map<string, number>();
  for (const [suggestionId, voters] of upvoters) {
    counts.set(suggestionId, voters.size);
  }
  return counts;
};

/**
 * Reads a localStorage value, copying it over from an older key name first so
 * guests who saved it before the rename keep it.
 */
export const readWithLegacyMigration = (
  key: string,
  legacyKey: string,
): string | null => {
  const current = localStorage.getItem(key);
  if (current !== null) {
    return current;
  }

  const legacy = localStorage.getItem(legacyKey);
  if (legacy === null) {
    return null;
  }

  localStorage.setItem(key, legacy);
  localStorage.removeItem(legacyKey);
  return legacy;
};
