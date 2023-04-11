import { AsyncSequence } from './types';

/** Takes a list of functions and combines all of the responses into a single object
 *   - The original input will be pass to every function,  but not included in the final result
 *   - Conflicting keys will be overwritten by subsequent functions
 * Type Signature:
 *
 * combine(
 *  (I) => ()
 *  (I) -> R1,
 *  (I & R1) -> R2,
 *  (I & R1 & R2) -> R3,
 *  ...
 * ) -> (I) -> (R1 & R2 & R3 ...)
 *
 */
export const sequence: AsyncSequence = (...fns: any[]) => {
  //TODO: Rewrite using fp-ts?
  return async (args: any) => {
    let result = {};
    for (const fn of fns) {
      result = { ...result, ...(await fn({ ...args, ...result })) };
    }
    return result;
  };
};

/**
 * Executes a dictionary of async parallel functions and returns their combined responses
 */
export async function parallel<
  T extends { [key: string]: (...args: any[]) => Promise<any> }
>(functionMap: T): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const functions = Object.keys(functionMap).map((key) => async () => ({
    key,
    result: await functionMap[key](),
  }));

  const results = await Promise.all(functions.map((f) => f()));
  return results.reduce((acc, result) => {
    acc[result.key as keyof T] = result.result;
    return acc;
  }, {} as { [K in keyof T]: Awaited<ReturnType<T[K]>> });
}

export async function retry<R>(
  fn: () => R,
  retries = 3,
  delay = 1000
): Promise<R> {
  try {
    return await fn();
  } catch (err) {
    if (retries > 0) {
      await new Promise((r) => setTimeout(r, delay));
      return retry(fn, retries - 1, delay);
    }
    throw err;
  }
}
