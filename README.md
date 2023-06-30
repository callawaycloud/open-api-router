# Overview

A lightly opinionated framework for "contract first" development of Rest API with express, adding "guardrails" in the form of TS types. The library uses types generated from an OpenAPI spec to configure express routes, request & response types.

## Features

- Type-safe routing, request & response types based on OpenAPI spec
- Type-safe middleware support
- Access to OpenAPI operation spec in handler context
- Simple and reliable error handling

## Setup

- install (TBD)
- `npm i -D express-openapi-guardrail-router`
- in package.json add a script to generate types. A basic example might look like this: `generate:api-types": "openapi-typescript v1/oapi.json --output v1/openApiTypes.ts`

## Getting Started:

1. Write an OpenAPI spec:

```yml
openapi: 3.0.1
paths:
  /greet:
    post:
      summary: Greet a person.
      requestBody:
        content:
          application/json:
            schema:
              properties:
                firstName:
                  type: string
                lastName:
                  type: string
              required:
                - firstName
                - lastName
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                properties:
                  greeting:
                    type: string
```

2. Generate your API typescript types (see "setup")
3. Use SwaggerParser to create a runtime representation of your OpenAPI spec
4. Define your API using the `initApi` function

```typescript
import { paths } from './openApiTypes'; //generated
import { validate } from 'SwaggerParser';

const openApiSpec = validate('./v1/oapi.json', {
  dereference: { circular: false },
});

export const v1Api = initApi<any, Locals, GlobalMiddleware>({
  openApiSpec,
  baseUri: '/v1',
  api: {
    '/hello': {
      post: async ({ req }) => {
        return { message: `Hello ${req.body.name}` };
      },
    },
  },
});
```

_Things to note:_

- `api` requires all routes & operations to be defined
- `req` and `res` objects are typed via the OpenAPI spec
- the `api->hello->post` function returns a `Promise` that resolves to the response type defined in the OpenAPI spec

5. setup an express app and register the api:

```typescript
import express from 'express';
import { v1Api } from './v1';

const app: Express = express();
const port = process.env.PORT || 8000;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

//register the api
(async () => {
  (await v1Api)(app);
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });
})().catch(console.error);
```

### Global & Operation level middleware

You can define middleware at the API level using the `initApi.middleware` option. The middleware receives the `context` and the `fn` to run the entire request. The example below shows how you might implement a simple global retry mechanism for outbound requests failures.

```typescript
export const authMiddleware = async (
  ctx: OpenApiContext<any, Locals, GlobalMiddleware>
) => {
  //do some auth
  const user = getUser(req.headers['x-auth']);

  if (!user) {
    throw new HttpError(401, 'Unauthorized');
  }
  return user;
};

export const v1Api = initApi<paths, Locals, GlobalMiddleware>({
  globalMiddleware: authMiddleware,
  api: {
    '/hello': {
      post: withMiddleware(
        validateBodyMiddleware,
        async ({ globalMiddleware: { user } }) => {
          return { message: `Hello ${user.name}` };
        }
      ),
    },
  },
});
```

You can also add middleware to the operation via the `withMiddleware` function:

```typescript
withMiddleware(
  async (ctx) => {
    return { foo: 'bar' };
  },
  ({ req, middleware: { foo } }) => {
    return foo;
  }
);
```

In both instances, middleware can be combine using functional composition. The framework provides some helper functions to make this easier.

`sequence`: executes functions in sequence, combining the result with the input and passing it to the next function. The results of all functions are merged and returned as a single object.
`parallel`: executes a set of middleware in parallel and returns the results as an object.

```typescript
const combinedMiddleware = sequence(
  async (ctx) =>
    parallel({
      m1: () => 'hello',
      m2: () => 'world',
    }),
  ({ m1, m2 }) => ({ m3: `${m1} ${m2}` })
);
```

A full on functional library like `fp-ts` is recommended for more complex middleware composition.

### Returning an error

In your request handler or middleware, you can return an error by throwing an instance of `HttpError`:

```typescript
import { HttpError } from '{tbd}';

export const handler = async ({ req, res }) => {
  throw new HttpError(400, 'Bad Request');
};
```

You can define a custom error handler at the API level using the `initApi.errorHandler` option. The handler receives the `error`, the `context` and the `fn` to run the entire request.

The example below shows how you might implement a simple global retry mechanism for outbound requests failures.

```typescript
export const errorHandler = (
  err: any,
  ctx: OpenApiContext<any, Locals, GlobalMiddleware>,
  fn: RequestHandler
) => {
  if (err instanceof HttpError) {
    return ctx.res.status(err.status).json({
      message: err.message,
    });
  }

  //retry any 500 errors from dependent services up to 3 times
  if (err instanceof OutboundHttpError && err.status >= 500) {
    if ((ctx.res.locals.retryAttempts ?? 0) > 3) {
      return ctx.res.status(500).json({
        message: 'Unable to connect to dependent service',
      });
    }

    if ((ctx.res.locals.retryAttempts ?? 0) < 3) {
      console.log('rerunning request', ctx.res.locals.retryAttempts);
      ctx.res.locals.retryAttempts = (ctx.res.locals.retryAttempts ?? 0) + 1;
      return fn(ctx.req, ctx.res, () => {});
    }
  }

  //catch anything else
  return ctx.res.status(500).json({
    message: 'unknown error',
  });
};

export class OutboundHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
```

```typescript
// /v1/index.ts
import { initApi } from '{tbd}';
import { errorHandler } from './errorHandler';

export const v1Api = initApi<paths, { retryAttempts: number }, {}>({
  openApiSpec,
  baseUri: '/v1',
  errorHandler,
  //...
});
```

### Defining a "Partial API"

You can easily break up the implementation of your API by first defining the full type of the: API

```typescript
// /v1/index.ts

import { APIDef, initApi } from '{tbd}';
import { paths } from './openApiTypes';

import { invoices } from './resources/invoices';
import { orders } from './resources/orders';

export type V1ApiDef = APIDef<paths, Locals, GlobalMiddleware>;

export const v1Api = initApi<paths, Locals, GlobalMiddleware>({
  openApiSpec,
  baseUri: '/v1',
  api: {
    '/ping': {
      post: async () => {
        return {
          uptime: process.uptime(),
        };
      },
    },
    ...invoices,
    ...orders,
  },
});
```

Use `Pick` to choose the subset of the API you want to implement:

```typescript
// /v1/resources/invoices.ts
export const invoices: Pick<V1ApiDef, '/invoices' | '/invoices/:id'> = {
  '/invoices': {
    get: async ({ req, res }) => {},
  },
  '/invoice/:id': {
    get: async ({ req, res }) => {},
    //...
  },
};
```

Or index types to implement just the operations you want:

```typescript
export const invoiceOperations: V1ApiDef['/invoices'] = {
  get: ({ req, res }) => {
    //...
  },
};

export const getInvoices: V1ApiDef['/invoices']['get'] = ({ req, res }) => {
  //...
};
```

## Limitations

- Only supports OpenAPI 3.x
- Currently only supports json response types
- Currently only supports 1 successful status code per operation (TODO: Document workaround)
- Error Responses are currently not type restricted by OpenAPI doc. Recommended using a single, standard, response type if possible.
