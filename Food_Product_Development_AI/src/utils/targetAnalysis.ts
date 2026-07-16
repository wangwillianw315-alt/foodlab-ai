import type { TargetStatus } from "../types/productDevelopment";
export const calculateTargetVariance = (
  current: number | null,
  target: number | null,
) => (current == null || target == null ? null : current - target);
export const evaluateTarget = (
  current: number | null,
  target: number | null,
  lowerIsBetter = false,
  higherIsBetter = false,
): TargetStatus => {
  if (target == null) return "NO_TARGET";
  if (current == null || !Number.isFinite(current)) return "INCOMPLETE_DATA";
  if (
    current === target ||
    (lowerIsBetter && current <= target) ||
    (higherIsBetter && current >= target)
  )
    return "MEETS_TARGET";
  return Math.abs(current - target) <= Math.abs(target) * 0.05
    ? "CLOSE_TO_TARGET"
    : "OUTSIDE_TARGET";
};
export const calculateBriefMatchScore = (
  items: {
    current: number | null;
    target: number | null;
    lowerIsBetter?: boolean;
    higherIsBetter?: boolean;
  }[],
) => {
  const rated = items
    .map((i) =>
      evaluateTarget(i.current, i.target, i.lowerIsBetter, i.higherIsBetter),
    )
    .filter((x) => x !== "NO_TARGET");
  if (!rated.length) return null;
  return (
    (rated.reduce(
      (s, x) =>
        s + (x === "MEETS_TARGET" ? 1 : x === "CLOSE_TO_TARGET" ? 0.75 : 0),
      0,
    ) /
      rated.length) *
    100
  );
};
