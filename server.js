const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: "*"
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});

app.use(limiter);

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.log(err));

let maintenanceMode = false;

app.use((req, res, next) => {
  if (maintenanceMode)
    return res.status(503).json({ message: "Maintenance mode" });
  next();
});

app.use((req, res, next) => {
  console.log(req.method, req.url, req.ip);
  next();
});

app.get("/", (req, res) => {
    res.send("Tournament API Running");
});
const path = require("path");

app.use("/admin-panel", express.static(path.join(__dirname, "admin-panel")));

const authRoutes = require("./routes/authRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/tournaments", tournamentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));