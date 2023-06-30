import { Express, Request, RequestHandler, Response } from 'express';
import { RequestBody, RequestParams, ResponseList, SuccessResponseType } from './util';
import { OpenAPIV3 } from 'openapi-types';
/** TODO: Move to package? */
export type APIDef<Paths, Locals extends Record<string, any>, GlobalMiddleware> = {
    [path in keyof Paths]: {
        [method in keyof Paths[path]]: OpenApiHandler<Paths[path][method], Locals, GlobalMiddleware>;
    };
};
/**
 * Express type for a provided Open API "Operation" type
 */
export type OpenApiRequest<Operation, Locals extends Record<string, any>> = Request<RequestParams<Operation, 'path'>, // params
Response<ResponseList<Operation>['type']>, // response?
RequestBody<Operation>, // body
RequestParams<Operation, 'query'>, // query
Locals>;
export type OpenApiResponse<Operation, Locals extends Record<string, any>> = Response<ResponseList<Operation>['type'], Locals>;
export type OpenApiContext<Operation, Locals extends Record<string, any>, GlobalMiddleware> = {
    req: OpenApiRequest<Operation, Locals>;
    res: OpenApiResponse<Operation, Locals>;
    openApi: {
        spec: any;
        operation: OpenAPIV3.OperationObject;
    };
    globalMiddleware: GlobalMiddleware;
};
export type OpenApiHandlerResponse<O> = Promise<SuccessResponseType<ResponseList<O>>>;
export type OpenApiHandler<Operation, Locals extends Record<string, any>, GlobalMiddleware> = (context: OpenApiContext<Operation, Locals, GlobalMiddleware>) => OpenApiHandlerResponse<Operation>;
export type InitOpenApiOptions<Paths, Locals extends Record<string, any>, GlobalMiddlewareResult = {}> = {
    /**
     * The Full OpenAPI Spec (JSON).  Used to provide spec metadata to the handler & middleware
     */
    openApiSpec: Promise<any>;
    /**
     * The base URI for the API.
     */
    baseUri?: string;
    /**
     * The API -> router handler mapping */
    api?: APIDef<Paths, Locals, GlobalMiddlewareResult>;
    errorHandler?: (context: OpenApiContext<any, Locals, GlobalMiddlewareResult>, err: any, fn: RequestHandler) => void;
    /**
     * Middleware that runs on EVERY operation.
     * Best for security and other functions that you want to ensure always happen */
    globalMiddleware?: (context: OpenApiContext<any, Locals, undefined>) => Promise<GlobalMiddlewareResult>;
};
/**
 * Setups an API with typesafe handler based on OpenAPI types generated using openapi-typescript.
 * @param options
 * @returns
 */
export declare const initApi: <Paths, Locals extends Record<string, any>, GlobalMiddleware>(options: InitOpenApiOptions<Paths, Locals, GlobalMiddleware>) => Promise<(app: Express) => {
    options: InitOpenApiOptions<Paths, Locals, GlobalMiddleware>;
    registerOperation: <P extends keyof Paths, M extends keyof Paths[P]>(app: Express, path: P, method: M, handler: OpenApiHandler<Paths[P][M], Locals, GlobalMiddleware>) => any;
}>;
export declare const withMiddleware: <O, M, Locals extends Record<string, any>, GlobalMiddleware>(middleware: (ctx: OpenApiContext<O, Locals, GlobalMiddleware>) => Promise<M>, controller: (ctx: OpenApiContext<O, Locals, GlobalMiddleware> & {
    middleware: M;
}) => OpenApiHandlerResponse<O>) => OpenApiHandler<O, Locals, GlobalMiddleware>;
//# sourceMappingURL=createApi.d.ts.map