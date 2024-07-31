const mongoose = require("mongoose");
require("dotenv").config();

exports.connection = () => {
    mongoose.connect(process.env.DATABASE_URL)
    .then(()=> console.log("Connection of Database is Success"))
    .catch((err)=> {
        console.log("Connection Failed!");
        console.error(err);
        process.exit(1);
    })
}