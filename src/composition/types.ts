import { Await } from 'ts-toolbelt/out/Any/Await';
import { Function } from 'ts-toolbelt/out/Function/Function';

export declare type AsyncSequence = {
  <P0 extends {}, R0>(...fns: [Function<[P0], R0>]): Function<
    [P0],
    Promise<Await<R0>>
  >;
  <P0 extends {}, R0, R1>(
    ...fns: [Function<[P0], R0>, Function<[P0 & Await<R0>], R1>]
  ): Function<[P0], Promise<Await<R0> & Await<R1>>>;
  <P0 extends {}, R0, R1, R2>(
    ...fns: [
      Function<[P0], R0>,
      Function<[P0 & Await<R0>], R1>,
      Function<[P0 & Await<R0> & Await<R1>], R2>
    ]
  ): Function<[P0], Promise<Await<R0> & Await<R1> & Await<R2>>>;
  <P0 extends {}, R0, R1, R2, R3>(
    ...fns: [
      Function<[P0], R0>,
      Function<[P0 & Await<R0>], R1>,
      Function<[P0 & Await<R0> & Await<R1>], R2>,
      Function<[P0 & Await<R0> & Await<R1> & Await<R2>], R3>
    ]
  ): Function<[P0], Promise<Await<R0> & Await<R1> & Await<R2> & Await<R3>>>;
  <P0 extends {}, R0, R1, R2, R3, R4>(
    ...fns: [
      Function<[P0], R0>,
      Function<[P0 & Await<R0>], R1>,
      Function<[P0 & Await<R0> & Await<R1>], R2>,
      Function<[P0 & Await<R0> & Await<R1> & Await<R2>], R3>,
      Function<[P0 & Await<R0> & Await<R1> & Await<R2> & Await<R4>], R4>
    ]
  ): Function<
    [P0],
    Promise<Await<R0> & Await<R1> & Await<R2> & Await<R3> & Await<R4>>
  >;
  //TODO: Keep going :)
};
