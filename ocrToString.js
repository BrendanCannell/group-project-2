let R = require('ramda');

let get = (x, ...ops) => ops.reduce(
  (acc, op) =>
    acc === null || acc === undefined ? acc
      : typeof op === 'string' || typeof op === 'number' ? acc[op]
        : op(acc),
  x);

let sum = (arr) => arr.reduce(R.add, 0);

let toAnnotations = result => {
  let annos = [];

  let pushAnnotation = (anno, type, parent) => {
    annos.push(anno);
    anno.id = annos.length;
    anno.type = type;
    if (parent) anno.parent = parent;
    if (anno.words) anno.children = anno.words; delete anno.words;
    if (anno.symbols) anno.children = anno.symbols; delete anno.symbols;
  }

  result[0].fullTextAnnotation.pages.forEach(p =>
    p.blocks.forEach(b =>
      b.paragraphs.forEach(p => {
        pushAnnotation(p, 'paragraph');
        p.children.forEach(w => {
          pushAnnotation(w, 'word', p);
          w.children.forEach(s =>
            pushAnnotation(s, 'symbol', w));
        });
      })
    ));

  return annos;
};

let addLocation = (anno, box) => {
  let a = anno;
  let [tl, tr, br, bl] = box;

  a.box = box;

  a.left = (tl.x + bl.x) / 2;
  a.right = (tr.x + br.x) / 2;
  a.center = (a.left + a.right) / 2;

  a.width = a.right - a.left;
  a.height = a.right - a.left;
}

let addSiblings = (anno) => {
  let siblingPairs = R.aperture(2, anno.children);

  siblingPairs.forEach(([previous, next]) => {
    previous.nextSibling = next;
    next.previousSibling = previous;
  })
}

let fuse = words => {
  let isHead = w => !w.previousSibling || R.path(['property', 'detectedBreak'], R.last(w.previousSibling.children));
  let fusionHeads = words.filter(isHead);

  let iterate = fn => seed =>
    R.unfold(next =>
      !(next === null || next === undefined || next === false)
        ? [next, fn(next)]
        : false,
      seed);
  let toTail = iterate(w => !get(w.children, R.last, 'property', 'detectedBreak') && w.nextSibling);

  let headsPlusTails = fusionHeads.map(toTail);
  let fused = headsPlusTails.map(words => ({
    text: R.flatten(words.map(w => w.children.map(R.prop('text')))).join(''),
    children: words
  }));

  fused.forEach(f => addLocation(f, f.children.map(w => w.box).reduce((a, b) => [a[0], b[1], b[2], a[3]])))

  return fused;
}

let sameLine = (a, b) => {
  let [left, right] = a.box[3].x < b.box[3].x ? [a, b] : [b, a];

  let [lt, lb, rt, rb] = [left.box[1].y, left.box[2].y, right.box[0].y, right.box[3].y];

  let dist = (y1, y2) => Math.abs(y1 - y2);

  return dist(lb, rb) < dist(lb, rt) && dist(rb, lb) < dist(rb, lt);
}

let distance = a => b => {
  let [left, right] = a.box[3].x < b.box[3].x ? [a, b] : [b, a];

  return Math.abs(left.box[2].y - right.box[3].y);
}

let toLines = words => {
  let sorted = R.sort(R.descend(w => w.box[3].y), words);
  let lines = [[]];

  while (sorted.length !== 0) {
    let lastLine = R.last(lines);
    let nextWord = sorted.pop();

    if (lastLine.length === 0) {
      lastLine.push(nextWord);
    } else {
      let closest = lastLine.reduce(R.minBy(distance(nextWord)));

      if (sameLine(nextWord, closest)) {
        lastLine.push(nextWord);
      } else {
        lines.push([nextWord]);
      }
    }
  }

  return lines.map(l => l.sort(R.ascend(w => w.box[3].x)));
}

let fill = line => {
  let widths = line.map(w => (w.box[2].x - w.box[3].x) * (1 + 0.2 / w.text.length));
  let charCounts = line.map(w => w.text.length);
  let estFontWidth = sum(widths) / sum(charCounts)

  let spacesBetween = ([before, after]) => Math.max(1, Math.round((after.box[3].x - before.box[2].x) / estFontWidth - 0.5));

  let texts = line.map(s => s.text);
  let spacings = R.aperture(2, line).map(spacesBetween).map(n => " ".repeat(n));

  return R.flatten(R.zip(texts, [...spacings, ""])).join('');
}

module.exports = ocr => {
  annos = toAnnotations(ocr);
  annos.forEach(s => {
    addLocation(s, s.boundingBox.vertices);
    delete s.boundingBox;

    if (s.children) addSiblings(s);
  });

  let [words, paragraphs] = ['word', 'paragraph'].map(type => annos.filter(a => a.type === type));

  [...words, ...paragraphs].forEach(w => w.text = w.children.map(s => s.text).join(''));

  let fusedWords = fuse(words);
  let lines = toLines(fusedWords);
  let filled = lines.map(fill);

  return filled.join('\n');
}