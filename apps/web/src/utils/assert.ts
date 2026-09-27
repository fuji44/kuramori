/**
 * 到達不能コードをコンパイル時および実行時に検証する。
 * 分岐網羅漏れがある場合、引数の型が never に推論されないため型検査時にエラーとなる。
 */
export function assertNever(value: never, message?: string): never {
  throw new TypeError(message ?? `Unexpected value: ${JSON.stringify(value)}`);
}
