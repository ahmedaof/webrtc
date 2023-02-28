const mongoose = require("mongoose");

const startSchema = new mongoose.Schema(
    {
      
        name:{
            type: String,
        },
        
        start_time: {
            type: Date,
        },  
    },
    { timestamps: true }
);

module.exports = mongoose.model("Start", startSchema);