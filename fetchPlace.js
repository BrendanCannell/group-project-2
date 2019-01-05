let request = require('request-promise-native')

let fetchPlace = async ocr => {
  try {
    let query = toQuery(ocr),
        placesData = JSON.parse(await (request.get({
          uri: "https://maps.googleapis.com/maps/api/place/textsearch/json",
          qs: { query, key: process.env.GOOGLE_PLACES_API_KEY }
        })))
    
    return store = formatPlace(placesData)
  } catch (e) {
    return null
  }
}

let toQuery = ocr => {
  let cleaned = ocr.blocks
                    .map(b => b.string)
                    .map(removeJunk),
      firstLocation = cleaned.map(locationByStateAndZip)
                              .filter(Boolean)
                              [0]
  
  if (firstLocation) return clean(firstLocation)

  let firstNontrivialBlock = cleaned.filter(atLeastTwoNonemptyLines)
                                    .filter(atLeastOneDigit)[0]

  return firstNontrivialBlock ? clean(firstNontrivialBlock) : null
}

let clean = str => str.replace(/\n/g, " ")

let removeJunk = str =>
  str.replace(rxWelcome, "")
     .replace(rxSixOrMoreDigits, "")
     .replace(rxAdjacentLettersAndDigits, "")
     .replace(rxTime, "")
     .replace(rxDate, "")
     .replace(rxPhone, "")
     .replace(rxPunctuation, " ")
     .replace(rxLeadingTrailingSpaces, "")
     .replace(rxMultipleSpaces, " ")
     .replace(rxBlankLine, "")

let rxWelcome = /\bwelcome(\s+to)?(\s+our\s+store)?\b/gi;
let rxSixOrMoreDigits = /\b[A-Z\d-]*?\d{6}[A-Z\d-]*\b/g;
let rxAdjacentLettersAndDigits = /\b[A-Z\d-]*?([A-Z]+\d+|\d+[A-Z]+)[A-Z\d-]*/g;
let rxTime = /([1-9]|[0-1][0-9]|2[0-3]):([0-5]\d)(?::([0-5]\d))? *(am|pm)?/gi
let rxDate = /(0?\d|1[0-2])\/(0?\d|[1-2]\d|3[0-1])\/((?:19|20)?\d\d)/g
let rxPhone = /\(?\d\d\d\)?\W\d\d\d\W\d\d\d\d/g
let rxBlankLine = /^ *\n/gm
let rxPunctuation = /[^0-9A-Z \n-]/gi
let rxMultipleSpaces = /  +/g
let rxLeadingTrailingSpaces = /(^ +)|( +$)/gm

let locationByStateAndZip = str => {
  let match = str.match(/^(?:.*\n){0,2}.*?\W *[A-Z]{2}\W*\d{5}\b/im);

  return match && match[0]
}

let atLeastTwoNonemptyLines = str => str.match(/\S.*\n.*\S/)
let atLeastOneDigit = str => str.match(/\d/)

let formatPlace = placesData => {
  try {
    let result = placesData.results[0],
        name = result.name.replace(/#\d+/, ""),
        addr = result.formatted_address.match(/(.*?),/)[1]

    return `${name} @ ${addr}`
  } catch (e) {
    return null
  }
}

module.exports = fetchPlace