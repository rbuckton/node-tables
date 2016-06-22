export const maxInt32 = 0x3fffffff; // max value for a 32-bit tagged integer

export function minMax(value: number, minValue: number, maxValue: number) {
    return Math.min(Math.max(value, minValue), maxValue);
}

export function addInt32(x: number, y: number) {
    if (x === maxInt32 || y === maxInt32) return maxInt32;
    if (x > maxInt32 - y) return maxInt32;
    return x + y;
}