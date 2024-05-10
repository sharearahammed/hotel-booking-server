const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

app.use(
  cors({
    // origin: ["http://localhost:5173"],
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
// app.use(cors());
app.use(express.json());
app.use(cookieParser());

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.netgysa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = async (req, res, next) => {
  const token = req?.cookies?.token;
  console.log("token in middleware: ", token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKN_SECRET, (err, decoded) => {
    // error
    if (err) {
      console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    // if token is valid then it woult be decoded
    console.log("value in the token", decoded);
    req.user = decoded;
    next();
  });
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const hotelCollection = client.db("hotelBookingDB").collection("featuredRooms");
    const roomsCollection = client.db("hotelBookingDB").collection("rooms");

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, cookieOptions)
        .send({ success: true });
    });
    //clearing Token
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });


    app.get('/featuredRoom',async(req,res)=>{
      const cursor = hotelCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/rooms',async(req,res)=>{
      const cursor = roomsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/rooms/:room_type',async(req,res)=>{
      const roomType = req.params.room_type;
      console.log(roomType)
      const query = {room_type : roomType}
      const r = roomsCollection.find(query);
      const result = await r.toArray()
      console.log(result)
      res.send(result);
    })







    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hotel Booking Platform!");
});

app.listen(port, () => {
  console.log(`Hotel Booking Platform on port ${port}`);
});
