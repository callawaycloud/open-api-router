import {Express, NextFunction, Request, RequestHandler, Response} from 'express';
import {RequestBody, RequestParams, ResponseList, SuccessResponseType} from './util';

import {OpenAPIV3} from 'openapi-types';

/** TODO: Move to package? */

export type APIDef<Paths, Locals extends Record<string, any>, GlobalMiddleware> = {
  [path in keyof Paths]: {
    [method in keyof Paths[path]]: OpenApiHandler<Paths[path][method], Locals, GlobalMiddleware>;
  };
};

/**
 * Express type for a provided Open API "Operation" type
 */
export type OpenApiRequest<Operation, Locals extends Record<string, any>> = Request<
  RequestParams<Operation, 'path'>, // params
  Response<ResponseList<Operation>['type']>, // response?
  RequestBody<Operation>, // body
  RequestParams<Operation, 'query'>, // query
  Locals // locals (middleware defined)
>;

export type OpenApiResponse<Operation, Locals extends Record<string, any>> = Response<
  ResponseList<Operation>['type'],
  Locals
>;

export type OpenApiContext<Operation, Locals extends Record<string, any>, GlobalMiddleware> = {
  req: OpenApiRequest<Operation, Locals>;
  res: OpenApiResponse<Operation, Locals>;
  openApi: {spec: any; operation: OpenAPIV3.OperationObject};
  globalMiddleware: GlobalMiddleware;
};

export type OpenApiHandlerResponse<O> = Promise<SuccessResponseType<ResponseList<O>>>;

export type OpenApiHandler<Operation, Locals extends Record<string, any>, GlobalMiddleware> = (
  context: OpenApiContext<Operation, Locals, GlobalMiddleware>
) => OpenApiHandlerResponse<Operation>;

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
export const initApi = async <Paths, Locals extends Record<string, any>, GlobalMiddleware>(
  options: InitOpenApiOptions<Paths, Locals, GlobalMiddleware>
) => {
  const {api} = options;

  const registerOperation = await createRegisterOperationFn(options);

  return (app: Express) => {
    // register passed in API
    if (api) {
      for (const path in api) {
        for (const method in api[path]) {
          registerOperation(app, path, method as any, api[path][method] as any);
        }
      }
    }
    return {
      options,
      registerOperation,
    };
  };
};

const createRegisterOperationFn = async <Paths, Locals extends Record<string, any>, GlobalMiddleware>(
  options: InitOpenApiOptions<Paths, Locals, GlobalMiddleware>
) => {
  const {baseUri, openApiSpec, globalMiddleware} = options;

  //todo: move out?
  const parsedSchema = await openApiSpec;

  const registerOperation = <P extends keyof Paths, M extends keyof Paths[P]>(
    app: Express,
    path: P,
    method: M,
    handler: OpenApiHandler<Paths[P][M], Locals, GlobalMiddleware>
  ) => {
    //TODO: normalize route based on baseUri + path?
    const route = `${baseUri}${path as string}`;

    //clean up these types
    const fn = async (
      req: OpenApiContext<Paths[P][M], Locals, GlobalMiddleware>['req'],
      res: OpenApiContext<Paths[P][M], Locals, GlobalMiddleware>['res'],
      next: NextFunction
    ) => {
      const operation = parsedSchema.paths[path as string][method as string];

      // build out context...
      const ctx: OpenApiContext<Paths[P][M], Locals, undefined | GlobalMiddleware> = {
        req,
        res,
        openApi: {spec: parsedSchema, operation},
        globalMiddleware: undefined,
      };

      try {
        // run global middleware
        if (globalMiddleware) {
          ctx.globalMiddleware = await globalMiddleware(ctx as any);
        }
        const responseBody = await handler(ctx as any);

        //TODO: need to probably provide some way for the handler to override...
        // Maybe giving an alternate return type: `T | {status: code, body: T}`
        res.status(findSuccessStatusCode(ctx.openApi.operation));

        res.json(responseBody);
      } catch (err: any) {
        console.error(err);
        if (options.errorHandler) {
          await options.errorHandler(err, ctx, fn as any);
        } else {
          //TODO do we need to check `res.headersSent`?
          const message = 'message' in err ? err.message : 'Unknown Error';
          const status = 'status' in err ? err.status : 500;
          res.status(status).json({message});
        }

        // not sure about how next() is handled here...
        // next(err);
      } finally {
        // next();
      }
    };

    if (['get', 'post', 'put', 'delete', 'patch'].includes(method as string)) {
      //NOTE: Express likes :param names, but OpenAPI uses {param} names
      //So we need to conver the route to express format
      const expressRoute = route.replace(/{/g, ':').replace(/}/g, '');
      return app[method as keyof Express](expressRoute, fn);
    }
    throw new Error(`Unsupported method: ${method as string}`);
  };
  return registerOperation;
};

/**
 * Finds the first 2xx status code in the operation response.
 * WARNING: This does not work if a request has multiple 2xx responses.
 * @param operation Open API operation object
 * @returns The first 2xx status code
 */
function findSuccessStatusCode(operation: OpenAPIV3.OperationObject) {
  const successStatusCodes = Object.keys(operation.responses).filter((statusCode) =>
    String(statusCode).startsWith('2')
  );
  if (successStatusCodes.length === 0) {
    return 200;
  }
  return Number(successStatusCodes[0]);
}

export const withMiddleware =
  <O, M, Locals extends Record<string, any>, GlobalMiddleware>(
    middleware: (ctx: OpenApiContext<O, Locals, GlobalMiddleware>) => Promise<M>,
    controller: (
      ctx: OpenApiContext<O, Locals, GlobalMiddleware> & {middleware: M} //TODO: reactor to DRY type
    ) => OpenApiHandlerResponse<O>
  ): OpenApiHandler<O, Locals, GlobalMiddleware> =>
  async (ctx) => {
    const middlewareResult = await middleware(ctx);

    return (await controller({
      ...ctx,
      middleware: middlewareResult as any,
    })) as any;
  };
