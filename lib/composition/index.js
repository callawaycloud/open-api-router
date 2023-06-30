"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retry = exports.parallel = exports.sequence = void 0;
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
const sequence = (...fns) => {
    //TODO: Rewrite using fp-ts?
    return (args) => __awaiter(void 0, void 0, void 0, function* () {
        let result = {};
        for (const fn of fns) {
            result = Object.assign(Object.assign({}, result), (yield fn(Object.assign(Object.assign({}, args), result))));
        }
        return result;
    });
};
exports.sequence = sequence;
/**
 * Executes a dictionary of async parallel functions and returns their combined responses
 */
function parallel(functionMap) {
    return __awaiter(this, void 0, void 0, function* () {
        const functions = Object.keys(functionMap).map((key) => () => __awaiter(this, void 0, void 0, function* () {
            return ({
                key,
                result: yield functionMap[key](),
            });
        }));
        const results = yield Promise.all(functions.map((f) => f()));
        return results.reduce((acc, result) => {
            acc[result.key] = result.result;
            return acc;
        }, {});
    });
}
exports.parallel = parallel;
function retry(fn, retries = 3, delay = 1000) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield fn();
        }
        catch (err) {
            if (retries > 0) {
                yield new Promise((r) => setTimeout(r, delay));
                return retry(fn, retries - 1, delay);
            }
            throw err;
        }
    });
}
exports.retry = retry;
