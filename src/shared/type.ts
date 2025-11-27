export type Result<T, U> =
  | ({ success: true } & ([T] extends [never] ? {} : { value: T }))
  | ({ success: false } & ([U] extends [never] ? {} : { error: U }));
