// threeDecimalPlaces = /(?:0|[1-9]\d*)\.\d\d\d/gi

// phoneNumber = /\(?\d\d\d\)?\W\d\d\d\W\d\d\d\d/gi

// gallonCount = /(?:0|[1-9]\d*)\.\d\d\d?/gi
// dollarCount = /\$\s*(?:0|[1-9]\d*)\.\d\d\d?/gi

// regularunleaded = /^re?g|unl/gi
// midgrade = /^mid/gi
// premium = /^pre?m/gi
// diesel = /^dies|dsl/gi
// pricePerGallon = /(?:price|\$) *\/ *(?:gallon|gal|g)|price|ppg/gi
// mmddyear = /(?:0?\d|1[0-2])\/(?:0?\d|[1-2]\d|3[0-1])\/(?:19|20)\d\d/gi
// twelveHourTime = /(?:0?[1-9]|1[0-2])\:(?:[0-5]\d)(?:\:(?:[0-5]\d))?\s*(?:am|pm)/gi
// twentyFourHourTime = /(?:[0-1]\d|2[0-3])\:(?:[0-5]\d)(?:\:(?:[0-5]\d))?/gi

let range = (match) => [match.index, match.index + match[0].length];

let parsers = [

  {
    regex: /([1-9]|[0-1][0-9]|2[0-3]):([0-5]\d)(?::([0-5]\d))? *(am|pm)?/i,
    matchToObj: (m) => ({
      type: 'time',
      value: {
        hour: m[1],
        minute: m[2],
        second: m[3],
        meridiem: m[4]
      },
      range: range(m)
    })
  },

  {
    regex: /(0?\d|1[0-2])\/(0?\d|[1-2]\d|3[0-1])\/((?:19|20)?\d\d)/i,
    matchToObj: (m) => ({
      type: 'date',
      value: {
        year: m[3],
        month: m[1],
        day: m[2]
      },
      range: range(m)
    })
  },

  // "PUMP# 3\nMIDGRADE      0.087G\nPRICE/GAL     $2.999\n\nFUEL TOTAL   $  0.25"
  // 14: "PUMP# 2         SELF\nUNLEAD        4.069G\nPRICE/GAL     $2.849\nFUEL TOTAL   $  11.59"
  // 21: "PUMP# 3\nUNLEAD REG CR27.160G\nPRICE/GAL     $2.899\n\nDISCOUNTS BEFORE\n FUELING\n10 Cents/GAL $-0.100\n\nFUEL TOTAL   $  78.74"
  // 22: "PUMP# 5\nUNLEAD REG    2.812G\nPRICE/GAL     $2.489\n\nFUEL TOTAL   $  7.00"
  {
    regex: /^PUMP\S[^\n]*\n([^\d\n]+?) *([0-9\.\,]+)\S\nPRICE\/GAL:? *\S(\S+)(?:.*\n)*?FUEL +TOTAL:? *\S *(\S*)/im,
    matchToObj: (m) => ({
      type: 'purchase',
      value: {
        product: m[1],
        quantity: m[2],
        pricePerUnit: m[3],
        price: m[4],
        unit: 'gallon',
        currency: 'dollar'
      },
      range: range(m)
    })
  },

  // "PRODUCT: UNLD\nGALLONS:       0.186\nPRICE/G:   $   2.399\nFUEL SALE  $    0.25"
  // 18: "PRODUCT: REGUNL\nGALLONS:       0.931\nPRICE/G:    $  3.599\nFUEL  SALE   $  3.35"
  // 19: "PRODUCT:UNLD\nVOLUME:      0.858G\nPRICE/G:    $ 3.339\nFUEL SALE:  $  2.92"
  // 20: "PRODUCT:UNLD\nVOLUME:    0.916G\nPRICE/G: $ 3.899\nFUEL SALE:   $  3.57"
  {
    regex: /^PRODUCT:? *(\S+)\n(?:GALLONS|VOLUME):? *(\S+\.\S{3})\S?\nPRICE\/G:? *\S *(\S+)(?:.*\n)*?FUEL +SALE:? *\S *(\S+)/im,
    matchToObj: (m) => ({
      type: 'purchase',
      value: {
        product: m[1],
        quantity: m[2],
        pricePerUnit: m[3],
        price: m[4],
        unit: 'gallon',
        currency: 'dollar'
      },
      range: range(m)
    })
  },

  // "PUMP  PRODUCT  PPG\n 03    UNLD   $2.299\n\nGALLONS   FUEL TOTAL\n  0.106      $0.24"
  // 15: "PUMP PRODUCT   $/G\n 07    UNLD   $3.899\n\nGALLONS   FUEL TOTAL\n 18.764      $ 73.16" 
  {
    regex: /^PUMP +PRODUCT +(?:PPG|\S\/G)\n *\S+ +(\S+) +\S(\S+)\n+GALLONS +FUEL +TOTAL\n *(\S+) +\S *(\S+)/im,
    matchToObj: (m) => ({
      type: 'purchase',
      value: {
        product: m[1],
        quantity: m[3],
        pricePerUnit: m[2],
        price: m[4],
        unit: 'gallon',
        currency: 'dollar'
      },
      range: range(m)
    })
  },

  // "Pump  Gallons  Price\n 04   9.483  $ 2.739\n\nProduct       Amount\nUnleaded     $ 25.97"
  // 16: "Pump  Gallons  Price\n 07   18.562 $ 2.099\n\n\nProduct       Amount\nUnleaded     $ 38.96"
  {
    regex: /^PUMP +GALLONS +PRICE\n *\S+ +(\S+) +\S (\S+)\n+PRODUCT +AMOUNT\n *(\S+) +\S (\S+)/im,
    matchToObj: (m) => ({
      type: 'purchase',
      value: {
        product: m[3],
        quantity: m[1],
        pricePerUnit: m[2],
        price: m[4],
        unit: 'gallon',
        currency: 'dollar'
      },
      range: range(m)
    })
  },

  {
    regex: /^Desc\S* +Qty +Amount\n.*?\n([^\n]+?) +[A-Z]{2} +#\d+ +(\d+[\.,]\d\d\d)\S + (\d+[\.,]\d\d)\n.*?\S +\S +(\d+[\.,]\d\d\d)\/ *G/im,
    matchToObj: (m) => ({
      type: 'purchase',
      value: {
        product: m[0],
        quantity: m[1],
        pricePerUnit: m[3],
        price: m[2],
        unit: 'gallon',
        currency: 'dollar'
      },
      range: range(m)
    })
  },

  {
    regex: /^(\S+) +[A-Z]{2} +PUMP\S +\d+\n(\d+[\.,]\d\d\d) +GAL +\S *\$(\d+[\.,]\d\d\d)\/GAL +\$(\d+[\.,]\d\d)/im,
    matchToObj: (m) => ({
      type: 'purchase',
      value: {
        product: m[0],
        quantity: m[1],
        pricePerUnit: m[2],
        price: m[3],
        unit: 'gallon',
        currency: 'dollar'
      },
      range: range(m)
    })
  }
]

// Take the receipt prefix, ending at the first valid State+Zip or at the end of the sixth non-empty line, whichever comes first.
// Remove
// * dates
// * times
// * phone numbers
// * "welcome to our store", "welcome to", "welcome", "sales receipt"
// * digit and digit+space sequences with more than five digits
// * words with both letters and digits
// Search Google Maps or equivalent with what's left and use the first result as the location:
// https://maps.googleapis.com/maps/api/place/textsearch/json?query=<text>&key=AIzaSyAx88PbP9QZr81yzm8B4smh2TJ7lZgwbB0
// { place_id, name, formatted_address } = data.results[0]
// This does fail for Costco receipts because the address doesn't have state or zip. Search "costco" + the second line

let parse = str =>
  parsers
    .map(p => {
      let match = str.match(p.regex);

      return match && p.matchToObj(match);
    })
    .filter(Boolean)

module.exports = parse