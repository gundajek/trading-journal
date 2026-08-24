import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://nomroom_db_user:d3RjpQg9MfxAd7RK@cluster0.mkctzxt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const options = {};

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export default clientPromise;