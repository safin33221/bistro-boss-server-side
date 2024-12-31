const express = require('express');
const app = express()
const cors = require('cors');
const port = process.env.PORT || 5050

app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {
    res.send('server running on')
})

app.listen(port,()=>{
    console.log(`server running on ${port}`);
})