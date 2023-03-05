const mongoose = require("mongoose");

const logSchema = new mongoose.Schema(
    {
        message: {
            type: String,
            trim: true,
            required: true,
            maxlength: 32,
            unique: true
        },
        from: {
            type: String,
            trim: true,
            maxlength: 32
        },
        name: {
            type: String,
            trim: true,
            maxlength: 32
        },
        type: String,
        
        start_time: {
            type: Date,
        },
        end_time: {
            type: Date,
        },
        endedBy: {
            type: String,
            trim: true,
            required: false,
        }
            
    },
    { timestamps: true }
);

module.exports = mongoose.model("Log", logSchema);