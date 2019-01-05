module.exports = function(sequelize, Sequelize) {
    var Person = sequelize.define("Person", {
        person_name: {
            type: Sequelize.STRING
        }
    });

    Person.associate = function(models) {
        Person.hasMany(models.Reading, {
            onDelete: "cascade"
        });
    };

    return Person;
};




