const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5050
require('dotenv').config()

app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.blz8y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();



        const usersCollection = client.db('bistroBoss').collection('users')
        const menuCollection = client.db('bistroBoss').collection('menu')
        const cartsCollection = client.db('bistroBoss').collection('carts')


        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })
        //get add cart data from cartscolleciton
        app.get('/carts', async (req, res) => {
            const email = req.query.email
            const query = { email: email }
            const result = await cartsCollection.find(query).toArray()
            res.send(result)
        })

        //post users data
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: "user already exist", insertedId: null })
            }
            const result = await usersCollection.insertOne(user)
            res.send(result)
        })
        // post add cart data in cartsCollection
        app.post('/carts', async (req, res) => {

            const food = req.body
            const result = await cartsCollection.insertOne(food)
            res.send(result)
        })

        //delete cart
        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query)
            res.send(result)
        })
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
    res.send('server running on')
})

app.listen(port, () => {
    console.log(`server running on ${port}`);
})