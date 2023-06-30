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
exports.withMiddleware = exports.initApi = void 0;
/**
 * Setups an API with typesafe handler based on OpenAPI types generated using openapi-typescript.
 * @param options
 * @returns
 */
const initApi = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const { api } = options;
    const registerOperation = yield createRegisterOperationFn(options);
    return (app) => {
        // register passed in API
        if (api) {
            for (const path in api) {
                for (const method in api[path]) {
                    registerOperation(app, path, method, api[path][method]);
                }
            }
        }
        return {
            options,
            registerOperation,
        };
    };
});
exports.initApi = initApi;
const createRegisterOperationFn = (options) => __awaiter(void 0, void 0, void 0, function* () {
    const { baseUri, openApiSpec, globalMiddleware } = options;
    //todo: move out?
    const parsedSchema = yield openApiSpec;
    const registerOperation = (app, path, method, handler) => {
        //TODO: normalize route based on baseUri + path?
        const route = `${baseUri}${path}`;
        //clean up these types
        const fn = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
            const operation = parsedSchema.paths[path][method];
            // build out context...
            const ctx = {
                req,
                res,
                openApi: { spec: parsedSchema, operation },
                globalMiddleware: undefined,
            };
            try {
                // run global middleware
                if (globalMiddleware) {
                    ctx.globalMiddleware = yield globalMiddleware(ctx);
                }
                const responseBody = yield handler(ctx);
                //TODO: need to probably provide some way for the handler to override...
                // Maybe giving an alternate return type: `T | {status: code, body: T}`
                res.status(findSuccessStatusCode(ctx.openApi.operation));
                res.json(responseBody);
            }
            catch (err) {
                console.error(err);
                if (options.errorHandler) {
                    yield options.errorHandler(err, ctx, fn);
                }
                else {
                    //TODO do we need to check `res.headersSent`?
                    const message = 'message' in err ? err.message : 'Unknown Error';
                    const status = 'status' in err ? err.status : 500;
                    res.status(status).json({ message });
                }
                // not sure about how next() is handled here...
                // next(err);
            }
            finally {
                // next();
            }
        });
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
            //NOTE: Express likes :param names, but OpenAPI uses {param} names
            //So we need to conver the route to express format
            const expressRoute = route.replace(/{/g, ':').replace(/}/g, '');
            return app[method](expressRoute, fn);
        }
        throw new Error(`Unsupported method: ${method}`);
    };
    return registerOperation;
});
/**
 * Finds the first 2xx status code in the operation response.
 * WARNING: This does not work if a request has multiple 2xx responses.
 * @param operation Open API operation object
 * @returns The first 2xx status code
 */
function findSuccessStatusCode(operation) {
    const successStatusCodes = Object.keys(operation.responses).filter((statusCode) => String(statusCode).startsWith('2'));
    if (successStatusCodes.length === 0) {
        return 200;
    }
    return Number(successStatusCodes[0]);
}
const withMiddleware = (middleware, controller) => (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const middlewareResult = yield middleware(ctx);
    return (yield controller(Object.assign(Object.assign({}, ctx), { middleware: middlewareResult })));
});
exports.withMiddleware = withMiddleware;
