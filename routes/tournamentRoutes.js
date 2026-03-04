const express = require("express");
const Tournament = require("../models/Tournament");
const User = require("../models/User");
const { protect, admin } = require("../middleware/authMiddleware");
const Transaction = require("../models/Transaction");
const WalletTransaction = require("../models/WalletTransaction");
const mongoose = require("mongoose");

const router = express.Router();

// Create Tournament (temporary without admin auth)
router.post("/create", protect, admin, async (req, res) => {
    try {
        const tournament = new Tournament(req.body);
        await tournament.save();
        res.json(tournament);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Tournaments
router.get("/", async (req, res) => {
    const tournaments = await Tournament.find()
      .populate("joinedUsers", "_id name")
      .populate("winner", "_id name");
    
    res.json(tournaments);
});

// Join Tournament
router.post("/join/:id", protect, async (req, res) => {
    try {
        const userId = req.user._id; // token se aa raha hai

        const tournament = await Tournament.findById(req.params.id);
        const user = await User.findById(userId);

        if (tournament.status !== "upcoming")
            return res.status(400).json({ message: "Tournament not joinable" });

        if (!tournament || !user)
            return res.status(400).json({ message: "Invalid Data" });

        if (tournament.joinedUsers.includes(user._id))
            return res.status(400).json({ message: "Already joined" });

        if (tournament.joinedUsers.length >= tournament.totalSlots)
            return res.status(400).json({ message: "Tournament Full" });

        if (user.coins < tournament.entryFee)
            return res.status(400).json({ message: "Not Enough Coins" });

        tournament.joinedUsers.push(user._id);
        user.coins -= tournament.entryFee;

        await tournament.save();
        await user.save();

        res.json({
            message: "Joined Successfully",
            updatedCoins: user.coins
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get Room Id
router.get("/:id/room", async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);

        if (!tournament)
            return res.status(404).json({ message: "Tournament not found" });

        if (tournament.status !== "live")
            return res.status(400).json({ message: "Room not available yet" });

        res.json({
            roomId: tournament.roomId,
            roomPassword: tournament.roomPassword
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put("/:id/status", protect, admin, async (req, res) => {
    try {
        const { status } = req.body;

        const tournament = await Tournament.findById(req.params.id);
        if (!tournament)
            return res.status(404).json({ message: "Not found" });

        tournament.status = status;
        await tournament.save();

        res.json({ message: "Status updated" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put("/:id/declare-winner", protect, admin, async (req, res) => {
    try {
        const { winnerId } = req.body;

        const tournament = await Tournament.findById(req.params.id);
        const winner = await User.findById(winnerId);

        if (tournament.status === "completed")
            return res.status(400).json({ message: "Winner already declared" });

        if (!tournament || !winner)
            return res.status(404).json({ message: "Invalid data" });

        if (tournament.status !== "live")
            return res.status(400).json({ message: "Tournament not live" });

        tournament.winner = winner._id;
        tournament.status = "completed";

        winner.coins += tournament.prize;

        await winner.save();
        await tournament.save();

        res.json({ message: "Winner declared & prize added" });
        await Transaction.create({
            user: winner._id,
            amount: tournament.prize,
            type: "win",
            tournament: tournament._id
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/my", protect, async (req, res) => {
    try {
        const tournaments = await Tournament.find({
            joinedUsers: req.user._id
        });

        res.json(tournaments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// User Deposit Request
router.post("/deposit", protect, async (req, res) => {
    try {
        const { amount, utrNumber } = req.body;

        if (!amount || !utrNumber)
            return res.status(400).json({ message: "All fields required" });
        if (amount < 10)
            return res.status(400).json({ message: "Minimum deposit ₹10" });
        if (amount > 50000)
            return res.status(400).json({ message: "Maximum deposit ₹50000" });
        const pendingDeposit = await WalletTransaction.findOne({
          user: req.user._id,
          type: "deposit",
          status: "pending"
        });

        if (pendingDeposit)
            return res.status(400).json({ message: "You already have a pending deposit" });
        const existingUTR = await WalletTransaction.findOne({ utrNumber });
        if (existingUTR)
            return res.status(400).json({ message: "UTR already used" });
        const transaction = new WalletTransaction({
            user: req.user._id,
            amount,
            type: "deposit",
            utrNumber
        });

        await transaction.save();

        res.json({ message: "Deposit request submitted" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Admin Deposit Approve
router.put("/deposit/:id/approve", protect, admin, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transaction = await WalletTransaction.findById(req.params.id).session(session);

        if (!transaction)
            throw new Error("Transaction not found");

        if (transaction.status !== "pending")
            throw new Error("Already processed");

        const user = await User.findById(transaction.user).session(session);

        user.coins += transaction.amount;
        transaction.status = "approved";

        await user.save({ session });
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ message: "Deposit approved & coins added" });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: error.message });
    }
});

router.put("/deposit/:id/reject", protect, admin, async (req, res) => {
    try {
        const transaction = await WalletTransaction.findById(req.params.id);

        if (!transaction)
            return res.status(404).json({ message: "Transaction not found" });

        transaction.status = "rejected";
        await transaction.save();

        res.json({ message: "Deposit rejected" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/deposits", protect, admin, async (req, res) => {
    try {
        const deposits = await WalletTransaction.find({ type: "deposit" })
            .populate("user");

        res.json(deposits);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get("/wallet/history", protect, async (req, res) => {
    try {
        const transactions = await WalletTransaction.find({
            user: req.user._id
        }).sort({ createdAt: -1 });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post("/withdraw", protect, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount } = req.body;

        if (!amount)
            throw new Error("Amount required");

        if (amount < 50)
            throw new Error("Minimum withdraw ₹50");

        const user = await User.findById(req.user._id).session(session);

        if (user.coins < amount)
            throw new Error("Not enough balance");

        const pendingWithdraw = await WalletTransaction.findOne({
            user: req.user._id,
            type: "withdraw",
            status: "pending"
        }).session(session);

        if (pendingWithdraw)
            throw new Error("You already have a pending withdraw");

        const todayWithdraw = await WalletTransaction.aggregate([
          {
            $match: {
              user: req.user._id,
              type: "withdraw",
              status: "approved",
              createdAt: {
                $gte: new Date(new Date().setHours(0,0,0,0))
              }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" }
            }
          }
        ]);

        if (todayWithdraw.length && todayWithdraw[0].total + amount > 5000)
          throw new Error("Daily withdraw limit ₹5000 exceeded");

        user.coins -= amount;
        await user.save({ session });

        const transaction = new WalletTransaction({
            user: req.user._id,
            amount,
            type: "withdraw"
        });

        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ message: "Withdraw request submitted" });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: error.message });
    }
});

router.put("/withdraw/:id/approve", protect, admin, async (req, res) => {
    try {
        const transaction = await WalletTransaction.findById(req.params.id);

        if (!transaction || transaction.type !== "withdraw")
            return res.status(400).json({ message: "Invalid transaction" });

        if (!transaction)
            return res.status(404).json({ message: "Transaction not found" });

        if (transaction.status !== "pending")
            return res.status(400).json({ message: "Already processed" });

        if (user.coins < transaction.amount)
            return res.status(400).json({ message: "User balance insufficient" });

        transaction.status = "approved";

        await transaction.save();

        res.json({ message: "Withdraw approved" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put("/withdraw/:id/reject", protect, admin, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transaction = await WalletTransaction.findById(req.params.id).session(session);

        if (!transaction)
            throw new Error("Transaction not found");

        if (transaction.status !== "pending")
            throw new Error("Already processed");

        const user = await User.findById(transaction.user).session(session);

        user.coins += transaction.amount;
        transaction.status = "rejected";

        await user.save({ session });
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ message: "Withdraw rejected & coins refunded" });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(400).json({ message: error.message });
    }
});

router.get("/withdraws", protect, admin, async (req, res) => {
    try {
        const withdraws = await WalletTransaction.find({
            type: "withdraw"
        }).populate("user");

        res.json(withdraws);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;