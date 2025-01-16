const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const bcrypt = require('bcrypt');


const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

  

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
    const reviewCollection = client.db("dochouse").collection("reviews");
    const appointmentCollection = client.db("dochouse").collection("appointments");

    const appRouter = express.Router();
    // JWT token generation
    appRouter.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' });
      res.send({ token });
    });

    // Middleware to verify token
    const verifyToken = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ message: 'Unauthorized access' });
      }
    
      const token = authHeader.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: 'Token invalid or expired' });
        }
        req.decoded = decoded;
        next();
      });
    };
    
    // const verifyToken = (req, res, next) => {
    //   if (!req.headers.authorization) {
    //     return res.status(401).send({ message: 'unauthorized access' });
    //   }
    //   const token = req.headers.authorization.split(' ')[1];
    //   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //     if (err) {
    //       return res.status(401).send({ message: 'unauthorized access' });
    //     }
    //     req.decoded = decoded;
    //     next();
    //   });
    // };

    // Logout Route
    appRouter.post('/logout', async (req, res) => {
      try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
          return res.status(400).json({ message: 'No token provided' });
        }

        // Optionally: Invalidate the token (e.g., store in a blacklist or cache)
        res.status(200).json({ message: 'Logout successful' });
      } catch (error) {
        res.status(500).json({ message: 'Failed to logout', error: error.message });
      }
    });


    // Middleware to verify admin
    // const verifyAdmin = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   const isAdmin = user?.role === 'admin';
    //   if (!isAdmin) {
    //     return res.status(403).send({ message: 'forbidden access' });
    //   }
    //   next();
    // };

     // Register User
    appRouter.post('/register', async (req, res) => {
      try {
        const { username, email, password, photoURL } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = { username, email, password: hashedPassword, photoURL };
        const result = await userCollection.insertOne(newUser);
        res.status(201).send({ message: 'User registered successfully', userId: result.insertedId });
      } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

     // User Login
     appRouter.post('/login', async (req, res) => {
      try {
        const { identifier, password } = req.body;
        let user;
    
        if (identifier.includes('@')) {
          user = await userCollection.findOne({ email: identifier });
        } else {
          user = await userCollection.findOne({ username: identifier });
        }
    
        if (user && await bcrypt.compare(password, user.password)) {
          const token = jwt.sign(
            { id: user._id, username: user.username, email: user.email },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1h' }
          );
          res.cookie('token', token, { httpOnly: true });
          return res.json({ message: 'Login successful', token });
        } else {
          res.status(401).json({ message: 'Invalid credentials' });
        }
      } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    appRouter.get('/auth/status', verifyToken, async (req, res) => {
      try {
        const user = await userCollection.findOne({ _id: new ObjectId(req.decoded.id) });
        if (user) {
          res.json({ user });
        } else {
          res.status(404).json({ message: 'User not found' });
        }
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch user', error: error.message });
      }
    });
    
    
    //  appRouter.post('/login', async (req, res) => {
    //   try {
    //     const { identifier, password } = req.body; // Use 'identifier' to accept either email or username
    //     let user;
    
    //     // Check if the identifier is an email or username
    //     if (identifier.includes('@')) {
    //       user = await userCollection.findOne({ email: identifier });
    //     } else {
    //       user = await userCollection.findOne({ username: identifier });
    //     }
    
    //     if (user && await bcrypt.compare(password, user.password)) {
    //       // Generate a JWT token
    //       const token = jwt.sign(
    //         { username: user.username, email: user.email },
    //         process.env.ACCESS_TOKEN_SECRET,
    //         { expiresIn: '1hr' }
    //       );
    
    //       res.json({ message: 'Login successful', token });
    //     } else {
    //       res.status(401).json({ message: 'Invalid credentials' });
    //     }
    //   } catch (error) {
    //     console.error('Login error:', error);
    //     res.status(500).json({ message: 'Internal Server Error' });
    //   }
    // });

    // user login with username and password
    //  appRouter.post('/login', async (req, res) => {
    //   try {
    //     const { username, password } = req.body;
    //     const user = await userCollection.findOne({ username });

    //     if (user && await bcrypt.compare(password, user.password)) {
    //       const token = jwt.sign({ username: user.username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' });
    //       res.json({ message: 'Login successful', token });
    //     } else {
    //       res.status(401).json({ message: 'Invalid credentials' });
    //     }
    //   } catch (error) {
    //     res.status(500).json({ message: 'Internal Server Error' });
    //   }
    // })

    // CRUD operations for users
    appRouter.get('/users', verifyToken, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    // Delete User
    appRouter.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });
   

    appRouter.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    appRouter.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    appRouter.get('/user', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    });

    // appRouter.get('/users/admin/:email', async (req, res) => {
    //   const email = req.params.email;
    //   if (email !== req.decoded.email) {
    //     return res.status(403).send({ message: 'forbidden access' });
    //   }
    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   let admin = false;
    //   if (user) {
    //     admin = user?.role === 'admin';
    //   }
    //   res.send({ admin });
    // });
    appRouter.get('/users/admin/:email', async (req, res) => {
      try {
        const email = req.params.email;
    
        // Check if req.decoded is undefined or not
        if (!req.decoded || !req.decoded.email) {
          return res.status(403).send({ message: 'JWT not verified or invalid' });
        }
    
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: 'Forbidden access' });
        }
    
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === 'admin';
        }
        res.send({ admin });
      } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ message: 'Internal Server Error' });
      }
    });
    

    appRouter.patch('/users/admin/:id',  async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // CRUD operations for doctors
    appRouter.get('/doctors', async (req, res) => {
      const result = await doctorCollection.find().toArray();
      res.send(result);
    });

    appRouter.get('/doctor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { id: parseInt(id) };
      const result = await doctorCollection.findOne(query);
      res.send(result);
    });

    // CRUD operations for appointments
    appRouter.get('/appointments', async (req, res) => {
      const email = req.query.email;
      const query = email ? { email } : {};
      const result = await appointmentCollection.find(query).toArray();
      res.send(result);
    });

    appRouter.post('/appointments', async (req, res) => {
      const appointment = req.body;
      const result = await appointmentCollection.insertOne(appointment);
      res.send(result);
    });

    appRouter.delete('/appointments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await appointmentCollection.deleteOne(query);
      res.send(result);
    });

    // Check MongoDB connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    app.use('/api', appRouter);
  } catch (error) {
    console.error("Error connecting to MongoDB", error);
  }
}

run().catch(console.dir);



// Root endpoint
// app.get('/', (req, res) => {
//   res.json('Server is running smoothly');
// });

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
