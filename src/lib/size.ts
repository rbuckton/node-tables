const starPattern = /^(\.\d+|\d+(?:\.\d+)?)\*$/;

export const enum SizeUnit {
    fixed,
    auto,
    star
}

export class Size {
    readonly unit: SizeUnit;
    readonly value: number;

    constructor(value: number, unit = SizeUnit.fixed) {
        if (unit === SizeUnit.auto) {
            this.value = 1;
        }
        else if (unit === SizeUnit.fixed) {
            this.value = value >> 0;
        }
        else {
            this.value = value;
        }

        this.unit = unit;
    }

    get isFixed() { return this.unit === SizeUnit.fixed; }
    get isAuto() { return this.unit === SizeUnit.auto; }
    get isStar() { return this.unit === SizeUnit.star; }

    toString(extended?: boolean) {
        switch (this.unit) {
            case SizeUnit.fixed: return "" + this.value;
            case SizeUnit.star: return this.value + "*";
            case SizeUnit.auto: return "auto";
            default: return "auto";
        }
    }

    static auto() {
        return new this(1, SizeUnit.auto);
    }

    static star(value: number) {
        return new this(value, SizeUnit.star)
    }

    static fixed(value: number) {
        return new this(value, SizeUnit.fixed);
    }

    static parse(value: number | string) {
        if (typeof value === "number") {
            return this.fixed(value);
        }
        else if (value) {
            const match = starPattern.exec(value);
            if (match) {
                return this.star(+match[1]);
            }
        }

        return this.auto();
    }
}
