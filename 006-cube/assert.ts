export function assertDefined<T>(val: T, name: string): asserts val is NonNullable<T> {
    if (val === undefined || val === null) {
    throw new Error(`${name} is not defined.`);
  }
}