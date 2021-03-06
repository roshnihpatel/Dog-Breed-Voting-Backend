import { Client } from "pg";
import { config } from "dotenv";
import express from "express";
import cors from "cors";

config(); //Read .env file lines as though they were env vars.

//Call this script with the environment variable LOCAL set if you want to connect to a local db (i.e. without SSL)
//Do not set the environment variable LOCAL if you want to connect to a heroku DB.

//For the ssl property of the DB connection config, use a value of...
// false - when connecting to a local DB
// { rejectUnauthorized: false } - when connecting to a heroku DB
const herokuSSLSetting = { rejectUnauthorized: false }
const sslSetting = process.env.LOCAL ? false : herokuSSLSetting
const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: sslSetting,
};

const app = express();

app.use(express.json()); //add body parser to each following route handler
app.use(cors()) //add CORS support to each following route handler

const client = new Client(dbConfig);
client.connect();

app.get("/dogs", async (req, res) => {
  const dbres = await client.query('select breed from dogs');
  res.set('Access-Control-Allow-Origin', '*')
  res.status(200).json(dbres.rows);
});

app.get("/topten", async (req, res) => {
  const dbres = await client.query(`SELECT * FROM dogs ORDER BY votes DESC, breed ASC LIMIT 10`)
  res.set('Access-Control-Allow-Origin', '*')
  res.status(200).json(dbres.rows)
})

app.post("/", async (req, res) => {
  try{
  if(req.body.breedNames.length>0){
  await client.query('insert into dogs (votes, breed) values ($1,$2) on conflict (breed) do nothing', ['0', req.body.breedNames[0]])
  await client.query('insert into dogs (votes, breed) values ($1,$2) on conflict (breed) do nothing', ['0', req.body.breedNames[1]])
  res.set('Access-Control-Allow-Origin', '*')
  res.status(200).send({success: true, data: req.body.breedNames})
  }
  else{
    res.status(100).send("connection with server secured")
  }}
  catch(err){
    res.send(err.message)
  }
});

app.put("/" ,async (req, res) => {
  try {
    const response = await client.query('update dogs set votes = votes + 1 where breed = $1 RETURNING * ', [req.body.breedName])
    res.set('Access-Control-Allow-Origin', '*')
    res.status(200).send({success: true, data: response.rows})
     
  } catch (err) {
    res.send(err.message)
    
  }
})


//Start the server on the given port
const port = process.env.PORT;
if (!port) {
  throw 'Missing PORT environment variable.  Set it in .env file.';
}
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}`);
});
