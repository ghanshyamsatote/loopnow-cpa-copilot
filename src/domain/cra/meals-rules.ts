// CRA ITC restriction on meals & entertainment (ITA s.67.1 / GST/HST Memorandum 8-2)
// Standard case: only 50% of GST/HST paid on reasonable meals & entertainment is
// eligible as an ITC. Exceptions exist (e.g. long-haul truck drivers get 80%,
// charities/public institutions are not subject to the restriction at all).
// This is expressed as data, not hardcoded into a single "if amount then 50%" branch,
// so new exceptions can be added without touching calculation code.

export type MealItcException =
    | "STANDARD"
    | "LONG_HAUL_TRUCK_DRIVER"
    | "CHARITY_OR_PUBLIC_INSTITUTION";

export const MealItcPolicy: Record<MealItcException, number> = {
    STANDARD: 0.5,
    LONG_HAUL_TRUCK_DRIVER: 0.8,
    CHARITY_OR_PUBLIC_INSTITUTION: 1.0,
};

export function getMealItcPercentage(
    exception: MealItcException = "STANDARD",
): number {
    return MealItcPolicy[exception];
}
