require('dotenv').config();
let vision = require('@google-cloud/vision');
let client = new vision.ImageAnnotatorClient();

module.exports = path => client.documentTextDetection(path);