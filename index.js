const express = require('express');
const app = express();
const cors = require('cors');
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

var uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const doctorCollection = client.db("dochouse").collection("doctors");
    const userCollection = client.db("dochouse").collection("users");
    const reviewCollection = client.db("dochouse").collection("reviews");
    const appointmentCollection = client.db("dochouse").collection("appointments");


    app.get('/appointments', async (req, res) => {
      // const email = req.query.email;
      // const query = { email: email };
      const result = await appointmentCollection.find().toArray();
      res.send(result);
    });

    app.post('/appointments', async (req, res) => {
      const cartItem = req.body;
      const result = await appointmentCollection.insertOne(cartItem);
      res.send(result);
    });
    app.delete('/appointments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await appointmentCollection.deleteOne(query);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.json('boos is sitting');
});

app.listen(port, () => {
  console.log(`Drs dentist is sitting on port ${port}`);
});