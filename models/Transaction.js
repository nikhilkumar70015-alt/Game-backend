const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: Number,
    type: { type: String, enum: ["join", "win"] },
    tournament: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament" }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);