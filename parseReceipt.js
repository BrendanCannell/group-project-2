let parseReceipt = str => parsers.map(p => p(str)).filter(Boolean)

let decimalParser = (type, rx) => str => {
  let m = str.match(rx)

  return m && { [type]: `${m[1]}.${m[2]}` }
}

let parsers = [
  decimalParser('perGallon', /\$ *(\d+)[\.\, ](\d\d\d)\b/),
  decimalParser('perGallon', /(\d+)[\.\, ](\d\d\d) *\/ *G/),
  decimalParser('price', /\$ *(\d+)[\.\, ](\d\d)\b/),
  decimalParser('gallons', /(\d+)[\.\, ](\d\d\d)[G06]\b/),
  decimalParser('gallons', /(?:^ *|[A-Z:] *|\d +)(\d+)[\.\,](\d\d\d)\b/m),
  str => {
    let m = str.match(/(0?\d|1[0-2])\/(0?\d|[1-2]\d|3[0-1])\/((?:19|20)?\d\d)/)

    return m && { date: [toYYYY(m[3]), toMMorDD(m[1]), toMMorDD(m[2])].join("-") }
  }
]

let toYYYY = str => str.length === 4 ? str : "20" + str
let toMMorDD = str => str.length === 2 ? str : "0" + str

module.exports = parseReceipt