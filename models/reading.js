module.exports = function(sequelize, Sequelize) {
    var Reading = sequelize.define("Reading", {
    place: { 
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            len: [1]
        }
    },
    address: { 
        type: Sequelize.STRING,
        allowNull: false,
        validate: {
            len: [1]
        }
    },
        gallons: {
        type: Sequelize.DOUBLE(5, 1),
        allowNull: false,
    },
        price: {
            type: Sequelize.DOUBLE(6, 2),
            allowNull: false,
        },
        perGallon: {
            type: Sequelize.DOUBLE(6, 2),
            allowNull: false,
        }
    
    });

    Reading.associate = function(models) {
        Reading.belongsTo(models.Person, {
          foreignKey: {
              allowNull: true
          }
        });
    };
    return Reading;
};