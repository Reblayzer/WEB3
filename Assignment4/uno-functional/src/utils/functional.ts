// Functional programming utilities for UNO game
// Demonstrates: currying, composition, higher-order functions

/**
 * Pipe function - left to right composition
 * Takes functions and returns a new function that applies them in sequence
 * 
 * Example: pipe(f, g, h)(x) === h(g(f(x)))
 */
export const pipe = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduce((acc, fn) => fn(acc), value)

/**
 * Compose function - right to left composition (mathematical order)
 * 
 * Example: compose(h, g, f)(x) === h(g(f(x)))
 */
export const compose = <T>(...fns: Array<(arg: T) => T>) => (value: T): T =>
  fns.reduceRight((acc, fn) => fn(acc), value)

/**
 * Curry a binary function (2 parameters)
 * Transforms f(a, b) into f(a)(b)
 */
export const curry2 = <A, B, R>(fn: (a: A, b: B) => R) =>
  (a: A) => (b: B): R => fn(a, b)

/**
 * Curry a ternary function (3 parameters)
 * Transforms f(a, b, c) into f(a)(b)(c)
 */
export const curry3 = <A, B, C, R>(fn: (a: A, b: B, c: C) => R) =>
  (a: A) => (b: B) => (c: C): R => fn(a, b, c)

/**
 * Partial application helper
 * Fixes the first argument of a function
 */
export const partial = <A, B, R>(fn: (a: A, b: B) => R, a: A) =>
  (b: B): R => fn(a, b)

/**
 * Identity function - returns its input unchanged
 * Useful in functional composition
 */
export const identity = <T>(x: T): T => x

/**
 * Constant function - returns a function that always returns the same value
 * Useful for default values in functional chains
 */
export const constant = <T>(value: T) => (): T => value

/**
 * Predicate combinators
 */
export const not = <T>(predicate: (x: T) => boolean) =>
  (x: T): boolean => !predicate(x)

export const and = <T>(p1: (x: T) => boolean, p2: (x: T) => boolean) =>
  (x: T): boolean => p1(x) && p2(x)

export const or = <T>(p1: (x: T) => boolean, p2: (x: T) => boolean) =>
  (x: T): boolean => p1(x) || p2(x)

/**
 * Maybe/Optional monad for safe null handling
 */
export type Maybe<T> = { readonly value: T | undefined }

export const Maybe = {
  of: <T>(value: T | undefined): Maybe<T> => ({ value }),

  map: <T, U>(fn: (x: T) => U) => (maybe: Maybe<T>): Maybe<U> => ({
    value: maybe.value !== undefined ? fn(maybe.value) : undefined
  }),

  flatMap: <T, U>(fn: (x: T) => Maybe<U>) => (maybe: Maybe<T>): Maybe<U> =>
    maybe.value !== undefined ? fn(maybe.value) : { value: undefined },

  getOrElse: <T>(defaultValue: T) => (maybe: Maybe<T>): T =>
    maybe.value !== undefined ? maybe.value : defaultValue,

  filter: <T>(predicate: (x: T) => boolean) => (maybe: Maybe<T>): Maybe<T> => ({
    value: maybe.value !== undefined && predicate(maybe.value) ? maybe.value : undefined
  })
}

/**
 * Array utility functions in functional style
 */
export const head = <T>(arr: readonly T[]): T | undefined => arr[0]
export const tail = <T>(arr: readonly T[]): readonly T[] => arr.slice(1)
export const last = <T>(arr: readonly T[]): T | undefined => arr[arr.length - 1]
export const init = <T>(arr: readonly T[]): readonly T[] => arr.slice(0, -1)

/**
 * Range function - creates array of numbers
 */
export const range = (start: number, end: number): number[] =>
  Array.from({ length: end - start }, (_, i) => start + i)

/**
 * Repeat function - creates array with repeated value
 */
export const repeat = <T>(value: T, times: number): T[] =>
  Array.from({ length: times }, () => value)
