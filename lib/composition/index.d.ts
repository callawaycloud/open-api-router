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
export declare const sequence: AsyncSequence;
/**
 * Executes a dictionary of async parallel functions and returns their combined responses
 */
export declare function parallel<T extends {
    [key: string]: (...args: any[]) => Promise<any>;
}>(functionMap: T): Promise<{
    [K in keyof T]: Awaited<ReturnType<T[K]>>;
}>;
export declare function retry<R>(fn: () => R, retries?: number, delay?: number): Promise<R>;
//# sourceMappingURL=index.d.ts.map