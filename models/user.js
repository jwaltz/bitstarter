module.exports = function(sequelize, DataTypes) {
    return sequelize.define("User", {
        id: {type: DataTypes.STRING,
             unique: true,
             allowNull: false,
             primaryKey: true},
        username: {type: DataTypes.STRING,
                   allowNull: false},
        displayName: {type: DataTypes.STRING,
                      allowNull: false},
        gender: {type: DataTypes.STRING,
                 allowNull: false},
        profileUrl: {type: DataTypes.STRING,
                     allowNull: false},
        email: {type: DataTypes.STRING, 
                 allowNull: false}
    });
};