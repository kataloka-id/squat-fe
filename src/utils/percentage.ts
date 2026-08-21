export type PercentageValue = number | null | undefined;

export interface PercentageOptions {
  /** Set to false when the metric has no available denominator. */
  hasDenominator?: boolean;
  decimals?: number;
}

const isValidDenominator = (value: boolean | undefined) => value !== false;

export const percentageNumber = (
  value: PercentageValue,
  options: PercentageOptions = {},
): number | null => {
  if (!isValidDenominator(options.hasDenominator) || typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const decimals = options.decimals ?? 2;
  const factor = 10 ** decimals;
  return Math.round(Math.min(100, Math.max(0, value)) * factor) / factor;
};

export const formatPercentage = (
  value: PercentageValue,
  options: PercentageOptions = {},
) => {
  const normalized = percentageNumber(value, options);
  return normalized === null ? 'N/A' : `${normalized}%`;
};
