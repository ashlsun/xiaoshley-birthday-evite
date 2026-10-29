import { Poop } from "./interfaces";

export const getLeaderboard = (poops: Poop[]) => {
  const counts: Record<string, number> = {};
  poops.forEach((poop) => {
    if (!poop.ignoreInLeaderboard) {
      if (Object.keys(counts).includes(poop.pooper)) {
        counts[poop.pooper]++;
      } else {
        counts[poop.pooper] = 1;
      }
    }
  });
  return Object.entries(counts).toSorted((a, b) => b[1] - a[1]);
};

export const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const time = date.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const dateStr = date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${time} on ${dateStr}`;
};
