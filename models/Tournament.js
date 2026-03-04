const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema({
    title: String,
    entryFee: Number,
    prize: Number,
    totalSlots: Number,
    joinedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    roomId: String,
    roomPassword: String,
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { 
        type: String, 
        enum: ["upcoming", "live", "completed"],
        default: "upcoming" 
    }
}, { timestamps: true });

module.exports = mongoose.model("Tournament", tournamentSchema);