// connectMongoDB.js
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://omondoclinton0:oflatkZzNnlVvJK5@cluster0.juksq8h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

let db;

async function connectMongoDB() {
  if (db) return db;
  const client = new MongoClient(uri);
  await client.connect();
  db = client.db("InvestmentDB"); // Make sure this matches your database name
  console.log("✅ Connected to MongoDB");
  return db;
}

module.exports = connectMongoDB;
