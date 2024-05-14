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
    origin: ["http://localhost:5173",
      "https://hotel-booking-server-psi.vercel.app",
      "https://fascinating-tapioca-72af1c.netlify.app"
    ],
    credentials: true,
  })
);
// app.use(cors());
app.use(express.json());
app.use(cookieParser());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
  // console.log("token in middleware: ", token);
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKN_SECRET, (err, decoded) => {
    // error
    if (err) {
      // console.log(err);
      return res.status(401).send({ message: "unauthorized access" });
    }
    // if token is valid then it woult be decoded
    // console.log("value in the token", decoded);
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

    const roomsCollection = client.db("hotelBookingDB").collection("rooms");
    const roomBookingCollection = client.db("hotelBookingDB").collection("bookings");
    const bookingReviewCollection = client.db("hotelBookingDB").collection("reviews");

    // auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log("user for token", user);
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
      // console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });


    // app.get('/rooms',async(req,res)=>{
    //   const cursor = roomsCollection.find();
    //   const result = await cursor.toArray();
    //   res.send(result);
    // })

    app.get('/rooms', async (req, res) => {
      const minPrice = parseInt(req.query.minPrice);
      const maxPrice = parseInt(req.query.maxPrice);
      let query = {};
      if (!isNaN(minPrice) && !isNaN(maxPrice)) {
        // If both minPrice and maxPrice are provided, filter by price range
        query = {
          $and: [
            { minPrice: { $lte: maxPrice } },
            { maxPrice: { $gte: minPrice } }
          ]
        };
      }
      const cursor = roomsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    


    app.get('/rooms/:room_type',async(req,res)=>{
      const roomType = req.params.room_type;
      // console.log(roomType)
      const query = {room_type : roomType}
      const r = roomsCollection.find(query);
      const result = await r.toArray()
      // console.log(result)
      res.send(result);
    })

    app.get("/room/:id",verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = {_id : new ObjectId(id)};
      const result = await roomsCollection.findOne(query);
      res.send(result);
    });

    // patch vailable status
    app.patch('/rooms/:id',async(req,res)=>{
      const id = req.params.id;
      const availability = req.body;
      const query = { _id : new ObjectId(id) }
      const updateDoc = { 
        $set: availability,
      }
      const result = await roomsCollection.updateOne(query,updateDoc)
      res.send(result)
    })


        // Post bookings
        app.post("/bookings", async (req, res) => {
          const newBooking = req.body;
          // console.log(newBooking);
          const result = await roomBookingCollection.insertOne(newBooking);
          // console.log(result)
          res.send(result);
        });

    // booking
    app.get('/bookings',verifyToken,async(req,res)=>{
      const cursor = roomBookingCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    // get booking data using user email
    app.get('/bookings/:email',verifyToken,async(req,res)=>{
      const email = req.params.email;
      // console.log(email)
      const query = {email : email};
      const r = roomBookingCollection.find(query);
      const result = await r.toArray()
      // console.log(result)
      res.send(result);
    })

    //get bookings by id
    app.get('/booking/:room_id',verifyToken,async(req,res)=>{
      const id = req.params.room_id;
      // console.log(email)
      const query = { room_id: id };
      const result =  await roomBookingCollection.findOne(query);
      // console.log(result)
      res.send(result);
    })

    // delete booking by id
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await roomBookingCollection.deleteOne(query);
      res.send(result);
    });

    // update by patch booking date
    app.patch('/bookings/:id',async(req,res)=>{
      const id = req.params.id;
      // console.log(id)
      const date = req.body;
      const query = { _id : new ObjectId(id) }
      const updateDoc = { 
        $set: date,
      }
      const result = await roomBookingCollection.updateOne(query,updateDoc)
      res.send(result)
    })

    //get review 
    app.get('/reviews',async(req,res)=>{
      const cursor = bookingReviewCollection.find().sort({timestamp:-1});
      const result = await cursor.toArray();
      res.send(result);
    })
    //get review by id
    app.get("/review/:room_id", async (req, res) => {
      const room_id = req.params.room_id;
      const query = {room_id : room_id};
      const cursor = bookingReviewCollection.find(query);
      const result = await cursor.toArray()
      res.send(result);
    });

    // post booking review 
    app.post("/reviews", async (req, res) => {
      const newReview = req.body;
      // console.log(newReview);
      const result = await bookingReviewCollection.insertOne(newReview);
      // console.log(result)
      res.send(result);
    });

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
