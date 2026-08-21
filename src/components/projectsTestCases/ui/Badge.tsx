import { Chip, type ChipProps } from './Chip.tsx';

export type BadgeProps = Required<Pick<ChipProps, 'type' | 'value'>> & Omit<ChipProps, 'type' | 'value'>;

/** Backwards-compatible name for the shared application chip. */
export const Badge = (props: BadgeProps) => <Chip {...props} />;
