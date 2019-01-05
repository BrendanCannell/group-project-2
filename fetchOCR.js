require('dotenv').config();
let R = require('ramda')
let vision = require('@google-cloud/vision');
let client = new vision.ImageAnnotatorClient();
let { get, avg, deepRemoveNullProps, isSingleton } = require("./util")

module.exports = async input => {
  try {
    let rawOCR = await client.documentTextDetection(input)

    return fromRaw(rawOCR)
  } catch (e) {
    return null
  }
}

let fromRaw = googleVisionOCRData => {
  let denullified = deepRemoveNullProps(googleVisionOCRData),

      allWords = R.flatten(denullified[0].fullTextAnnotation.pages.map(p => p.blocks.map(b => b.paragraphs.map(p => p.words)))),

      orientations = allWords.map(w => w.boundingBox.vertices).map(toVerticesOrientation),

      orientationCounts = get(orientations,
        R.groupBy(R.identity),
        R.map(R.length)),

      mainOrientation = get(orientationCounts,
        R.toPairs(),
        R.reduce(R.maxBy(pair => pair[1]), [undefined, 0]),
        0),

      correctingXform = correctingXforms[mainOrientation],

      correctlyOrientedWords = allWords.filter(w => mainOrientation === toVerticesOrientation(w.boundingBox.vertices)),
      
      data = {}

  data.words = correctlyOrientedWords.map(xformWord(correctingXform))

  data.symbols = R.flatten(data.words.map(w => w.children))

  data.lines = lineify(data.words).map(ws => OCRText({
    type: 'line',
    children: ws,
    string: ws.map(w => {
      let br = R.last(w.children).break

      return (
          !br             ? w.string
        : br === 'HYPHEN' ? w.string + "-"
        :                   w.string + " "
      )
    }).join("").trim()
  }))

  data.blocks = blockify(data.lines).map(ls => OCRText({
    type: 'block',
    children: ls,
    string: ls.map(l => l.string).join("\n")
  }))

  data.string = data.blocks.map(b => b.string).join("\n\n")

  return data
}

let toVerticesOrientation = ([tl, _, br, __]) =>
    (tl.x < br.x && tl.y < br.y) ? '0'
  : (tl.x > br.x && tl.y < br.y) ? '90'
  : (tl.x > br.x && tl.y > br.y) ? '180'
  :                                '270'

let correctingXforms = {
  '0':   R.identity,
  '90':  ({ x, y }) => ({ x: y, y: 0 - x }),
  '180': ({ x, y }) => ({ x: 0 - x, y: 0 - y }),
  '270': ({ x, y }) => ({ x: 0 - y, y: x })
}

let xformSymbol = correctingXform => s => OCRText({
  type: 'symbol',
  vertices: s.boundingBox.vertices.map(correctingXform),
  string: s.text,
  ...(R.hasPath(['property', 'detectedBreak', 'type'], s)
        ? { break: s.property.detectedBreak.type }
        : {})
})

let xformWord = correctingXform => w => {
  let children = w.symbols.map(xformSymbol(correctingXform))
  
  return OCRText({
    type: 'word',
    vertices: w.boundingBox.vertices.map(correctingXform),
    string: children.map(c => c.string).join(""),
    children
  })
}

let lineify = words => {
  let wordsTopToBottom = R.sort(R.ascend(w => w.bottomY), words)

  return wttbToLines(wordsTopToBottom)
}

let wttbToLines = wordsTopToBottom => {
  if (isSingleton(wordsTopToBottom)) return [wordsTopToBottom]

  let [topWord, ...restWords] = wordsTopToBottom,

      [topRestLine, ...restRestLines] = wttbToLines(restWords),

      distanceFromTopWord = word => horizontalDistance(word, topWord),

      closest = topRestLine.reduce(R.minBy(distanceFromTopWord)) // The annotation in `topRestLine` that is horizontally closest to `topWord`

  return sameLine(topWord, closest)
    ? [[...topRestLine, topWord].sort(R.ascend(w => w.leftX)),
       ...restRestLines]
    : [[topWord],
       topRestLine,
       ...restRestLines]
}

let horizontalDistance = (word1, word2) => {
  let [leftmost, rightmost] =
    word1.leftX < word2.leftX
      ? [word1, word2]
      : [word2, word1]

  return Math.abs(leftmost.rightX - rightmost.leftX)
}

let sameLine = (word1, word2) => {
  let [leftmost, rightmost] =
        word1.leftX < word2.leftX
          ? [word1, word2]
          : [word2, word1],

      [lt, lb, rt, rb] = [leftmost.topY, leftmost.bottomY, rightmost.topY, rightmost.bottomY],

      dist = (y1, y2) => Math.abs(y1 - y2)

  return dist(lb, rb) < dist(lb, rt)
      && dist(rb, lb) < dist(rb, lt)
}

// Splits `array` into sub-arrays such that adjacent pairs of `array` elements that pass `predicate` form the last and first elements of adjacent sub-arrays
// Ex: breakWhen((a, b) => a > b)([8, 11, 4, 3, 5, 8, 1]) => [[8, 11], [4], [3, 5, 8], [1]]
let breakWhen = predicate => {
  let go = array => {
    if (array.length === 0) throw new Error("array must be non-empty")

    let [first, second, ...rest] = array

    return (
        isSingleton(array)
          ? [array]
      : predicate(first, second)
          ? [[first], ...go([second, ...rest])]
      : (() => {
          let tailSubarrays = go([second, ...rest])
          let [tsFirst, ...tsRest] = tailSubarrays

          return [[first, ...tsFirst], ...tsRest]
        })()
    )
  }

  return go;
}

let blockify = breakWhen((l1, l2) => {
      let heights = [l1, l2].map(l => Math.max(...l.children.map(a => a.height))),
          minHeight = Math.min(...heights),
          bottom1 = avg(l1.children.map(a => a.bottomY)),
          top2 = avg(l2.children.map(a => a.topY))

      return top2 - bottom1 > minHeight / 3 // TODO: Refine this threshold
    })

let memoize = (obj, propsToMemoize) =>
  get(propsToMemoize,
    R.mapObjIndexed((value, key) => Object.defineProperty(obj, key, { value })))

let OCRText = obj =>
  Object.create(
    OCRText.prototype,
    get(obj, R.map(val => ({ value: val, enumerable: true }))))

let verticesDerivedData = (() => {
  let fns = {
    leftX: vs => (vs[0].x + vs[3].x) / 2,
    rightX: vs => (vs[1].x + vs[2].x) / 2,
    topY: vs => (vs[0].y + vs[1].y) / 2,
    bottomY: vs => (vs[3].y + vs[2].y) / 2,
    width: vs => fns.rightX(vs) - fns.leftX(vs),
    height: vs => fns.bottomY(vs) - fns.topY(vs)
  }

  return fns
})()

OCRText.prototype = {}

Object.defineProperties(
  OCRText.prototype,
  R.map(
    fn => ({
      get: function () { return fn(this.vertices) },
      configurable: true
    }),
    verticesDerivedData))

module.exports.fromRaw = fromRaw