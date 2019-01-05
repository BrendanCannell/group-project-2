let R = require('ramda')

// Chains `ops`, which can be functions or object/array lookups
// e.g., get({ squares: [1, 4, 9] }, 'squares', 1, Math.sqrt) => 2
let get = (x, ...ops) => ops.reduce(
  (acc, op) =>
    acc === null || acc === undefined
      ? acc
  : typeof op === 'string' || typeof op === 'number'
      ? acc[op]
      : op(acc),
  x)

let sum = arr => arr.reduce(R.add, 0)
let avg = arr => sum(arr) / arr.length

// Filter out any object property with value null
let removeNullProps = R.pipe(R.toPairs, R.reject(([_, v]) => v === null), R.fromPairs)

// Remove null properties at any level of nested data
let deepRemoveNullProps = data =>
    isArray(data)
      ? R.map(deepRemoveNullProps, data)
  : isObject(data)
      ? R.map(deepRemoveNullProps, removeNullProps(data))
      : data

let isArray = Array.isArray

let isSingleton = a => a.length === 1

let isObject = data => data && typeof data === 'object'

let type = x => typeof x

let log = (arg1, arg2) =>
  arg2
    ? console.log(arg1 + ":", arg2) || arg2
    : console.log(arg1) || arg1

let logBy = (fn, x) => console.log(fn(x)) || x

module.exports = {
  get,
  sum,
  avg,
  removeNullProps,
  deepRemoveNullProps,
  isArray,
  isSingleton,
  isObject,
  type,
  log,
  logBy
}