const mongoose = require("mongoose");

const walletTransactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    amount: Number,
    type: { type: String, enum: ["deposit", "withdraw"] },
    utrNumber: { type: String, unique: true },
    status: { 
        type: String, 
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    }
}, { timestamps: true });

module.exports = mongoose.model("WalletTransaction", walletTransactionSchema);