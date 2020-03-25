export function arrayDifference(arr1: readonly any[], arr2: readonly any[]): readonly any[] {
  return arr1.filter(x => !arr2.includes(x));
}

export function arrayIntersection(arr1: readonly any[], arr2: readonly any[]): readonly any[] {
  return arr1.filter(x => arr2.includes(x));
}
