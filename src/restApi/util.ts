export type ConcreteParam<O> = {
  parameters: O extends { parameters: any } ? Required<O['parameters']> : O;
};

type Operation = {
  responses: Record<string, { content: { 'application/json': any } }>;
  requestBody?: { content: Record<string, any> };
};

export type RequestParams<
  O,
  K extends 'path' | 'query' | 'headers'
> = O extends {
  parameters: Record<K, any>;
}
  ? O['parameters'][K]
  : Record<string, never>;

type ReqBodyContent<T extends string> = {
  requestBody: { content: Record<T, any> };
};

export type RequestBody<O> = O extends ReqBodyContent<'application/json'>
  ? O['requestBody']['content']['application/json']
  : O extends ReqBodyContent<'multipart/form-data'>
  ? O['requestBody']['content']['multipart/form-data']
  : undefined;

// type ResBodyContent<T extends string> =

// export type ResponseBody<O> = O extends ResBodyContent<'application/json'>
//   ? O['200']['content']['application/json']
//   : O extends ResBodyContent<'multipart/form-data'>
//   ? O['20']['content']['multipart/form-data']
//   : undefined;

//TODO: fix this to only get the success status codes?
type ResponseTypes<R extends Operation> = {
  [K in keyof R['responses']]: {
    code: K extends number ? K : undefined;
    type: R['responses'][K]['content']['application/json'];
  };
};

export type SuccessResponseType<R extends { code?: number; type: any }> =
  R extends {
    code: 200 | 201 | 203 | 204;
  }
    ? R['type']
    : void;

export type ResponseList<R> = R extends Operation
  ? ResponseTypes<R>[keyof ResponseTypes<R>]
  : any;
