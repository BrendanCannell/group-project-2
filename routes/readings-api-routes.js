require('dotenv').config();
var db = require("../models");
var multer = require('multer');
var path = require('path');

module.exports = function(app) {

    // Init Upload
    const upload = multer({
      storage: multer.memoryStorage(),
      //limits:{fileSize: 1500000},
      fileFilter: function(req, file, cb){
        checkFileType(file, cb);
      }
    }).single('myImage');

    // Check File Type
    function checkFileType(file, cb){
      // Allowed ext
      const filetypes = /jpeg|jpg|png|gif/;
      // Check ext
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      // Check mime
      const mimetype = filetypes.test(file.mimetype);

      if(mimetype && extname){
        return cb(null,true);
      } else {
        cb('Error: Images Only!');
      }
    }

    app.post('/api/image', (req, res) => {
      upload(req, res, async (error) => {
        if(error){
          console.log(error);
          res.json({ error })
        } 
        else {
          if(req.file == undefined){
            res.json({ error: "No file present" })
          } else {
            console.log('Requesting OCR...')

            let ocr = await require('../fetchOCR')(req.file.buffer)

            console.log('Response received')

            if (!ocr) { res.json({}); return }

            let parsed = require('../parseReceipt')(ocr.string),
                place = await require('../fetchPlace')(ocr)

            res.json(Object.assign( place ? { place } : {}, ...parsed))
          }
        }
      });
    });
    
    
    app.post("/api/readings", function(req, res) {
       db.Reading.create({
           place:  req.body.place,
           address: req.body.address,
           gallons: req.body.gallons,
           price: req.body.total,
           perGallon: req.body.perGallon
       }).then(function(result) {
           res.json(result);
       });
    });

    app.get("/", function(req, res) {
        db.Reading.findAll({
           ////look to order in descend
           order: [['id', 'DESC']]
        }).then(function(data) {
           console.log(data);
           res.render("index", { readings: data });
            
        });
    });

    app.delete("/api/delete/:id", function(req, res) {
        db.Reading.destroy({
          where: {
              id: req.params.id
          }
        }).then(function(dbReadings){
          res.json(dbReadings)
        });
    });

    app.get("/api/find/:id", function(req, res) {
        db.Reading.findOne({
        where: {
            id: req.params.id
        }
      }).then(function(dbReadings) {
        res.json(dbReadings);
      });
    });
    
    app.put("/api/update/:id", function(req, res) {
        db.Reading.update({
          place: req.body.place,
          address: req.body.address,
          gallons: req.body.gallons,
          price: req.body.total,
          perGallon: req.body.perGallon
        }, 
    { where: { id: req.params.id }
            
        }).then(function(result) {
            res.json(result);
        });
    });
};