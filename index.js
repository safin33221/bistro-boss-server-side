const express = require('express');
const app = express()
require('dotenv').config()
const jwt = require('jsonwebtoken')
const cors = require('cors');
const port = process.env.PORT || 5050
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
app.use(cors())
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.blz8y.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// 1st steps create token
// 2nd get token from cliend side
//3rd middle for very token



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
        const paymentsCollection = client.db('bistroBoss').collection('payments')

        //JWT related api's
        //3rd middle for very token
        const verifyToken = (req, res, next) => {

            if (!req?.headers?.authorization) {
                return res.status(401).send({ message: 'forbidden access' })
            }
            const token = req?.headers?.authorization.split(' ')[1]
            jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded
                next()
            })
        }

        //verify admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const isAdmin = user?.role === "admin"
            if (!isAdmin) {
                res.send(403).send({ message: 'forbidden error' })
            }
            next()
        }

        // 1st steps create token
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.SECRET_TOKEN, { expiresIn: '4h' })
            res.send({ token })
        })

        //get user data form usercollection
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            // console.log(req.headers); // 2nd get token from cliend side
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;

            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden  Access' })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })
        //menu item get by id
        app.get('/update/:id', async (req, res) => {
            const id = req.params.id;

            const filter = { _id: id }
            const result = await menuCollection.findOne(filter)
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
        app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
            const menuData = req.body;
            const result = await menuCollection.insertOne(menuData)
            res.send(result)
        })

        //user user role
        app.patch('/user/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        app.patch('/menu/:id', async (req, res) => {
            const menuData = req.body;
            const id = req.params.id;
            const query = { _id: id }
            const updateDoc = {
                $set: {
                    name: menuData.name,
                    category: menuData.category,
                    price: parseFloat(menuData.price),
                    recipe: menuData.recipe,
                    image: menuData.image
                }
            }
            const result = await menuCollection.updateOne(query, updateDoc)
            res.send(result)
        })


        //deleted user form usecollection
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })
        //delete cart
        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query)
            res.send(result)
        })
        //deleted menu item by admin and it's secure
        app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await menuCollection.deleteOne(query)
            res.send(result)
        })

        //create payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100)

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
                payment_method_types: ['card']
            });


            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })
        // payment history
        app.get('/payments/:email', async (req, res) => {
            const query = { email: req.params.email }
            // if (req.params.email !== req.decoded.email) {
            //     return res.status(403).send({ message: "forbidden access" })
            // }
            const result = await paymentsCollection.find(query).toArray()
            res.send(result)
        })
        app.post('/payments', async (req, res) => {
            const payment = req.body;

            const result = await paymentsCollection.insertOne(payment)

            const query = {
                _id: {
                    $in: payment.cartIds.map(id => new ObjectId(id))
                }
            }
            const deletedResult = await cartsCollection.deleteMany(query)
            res.send({ result, deletedResult })
        })
        //admin stats related api's
        app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
            const user = await usersCollection.estimatedDocumentCount()
            const menuitems = await menuCollection.estimatedDocumentCount()
            const orders = await paymentsCollection.estimatedDocumentCount()
            // const payments = await paymentsCollection.find().toArray()
            // const revinew = payments.reduce((total, item) => total + item.price, 0)
            const result = await paymentsCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        total_revenue: {
                            $sum: '$price'
                        }

                    }
                }
            ]).toArray()
            const revenue = result.length > 0 ? result[0].total_revenue : 0;
            res.send({
                user, menuitems, orders, revenue
            })
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