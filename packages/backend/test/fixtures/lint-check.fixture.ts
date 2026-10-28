const a: any = 1; // no-explicit-any
const b = (a as { x?: number }).x!; // no-non-null-assertion
// @ts-ignore
const c = 2; // ban-ts-comment
// @ts-expect-error
const d: string = 3; // needs a description
// eslint-disable-next-line no-console -- EXCEPTION: unused
const e = 4; // unused disable directive
