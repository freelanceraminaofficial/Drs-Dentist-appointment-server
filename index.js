const express = require('express');
const cors = require('cors');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();



const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;


  

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const doctorCollection = client.db("dochouse").collection("doctors");
    const userCollection = client.db("dochouse").collection("users");
    const addDoctorCollection = client.db("dochouse").collection("add-doctors");
    const appointmentCollection = client.db("dochouse").collection("appointments");


    // JWT token generation
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' });
      res.send({ token });
    });

    app.post('/manage-doctors', async (req, res) => {
      try {
        const doctor = req.body;
        if (!doctor || !doctor.name || !doctor.avatar || !doctor.specialty) {
          return res.status(400).send({ error: "Missing required fields." });
        }
        const result = await addDoctorCollection.insertOne(doctor);
        res.send(result);
      } catch (error) {
        console.error("Error inserting doctor:", error);
        res.status(500).send({ error: "Failed to insert doctor." });
      }
    });
    

    app.get('/doctors', async (req, res) => {
      const result = await doctorCollection.find().toArray();
      res.send(result);
    });

    app.get('/manage-doctors', async (req, res) => {
      const result = await addDoctorCollection.find().toArray();
      res.send(result);
    });
    

  app.delete('/add-doctors/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await addDoctorCollection.deleteOne(query);
  res.send(result);
});

    

    
const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'Unauthorized access' });
  }

  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized access' });
    }
    req.decoded = decoded;
    next();
  });
};


    // Middleware to verify admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    };

  

    // CRUD operations for users
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });


    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.get('/user', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      res.send({ admin });
    });


    

    app.patch('/users/role/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const { role } = req.body; // Accept role from request body
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: role,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });
    

    // CRUD operations for doctors
    

    app.get('/doctor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { id: parseInt(id) };
      const result = await doctorCollection.findOne(query);
      res.send(result);
    });

    // CRUD operations for appointments
    app.get('/appointments', verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await appointmentCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/appointments', verifyToken, async (req, res) => {
      const cartItem = req.body;
      const result = await appointmentCollection.insertOne(cartItem);
      res.send(result);
    });
    app.delete('/appointments/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await appointmentCollection.deleteOne(query);
      res.send(result);
    });


    // Check MongoDB connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  }
}

run().catch(console.dir);



// Root endpoint
app.get('/', (req, res) => {
  res.json('Server is running smoothly');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
