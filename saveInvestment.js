const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://omondoclinton0:oflatkZzNnlVvJK5@cluster0.juksq8h.mongodb.net/InvestmentDB?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const database = client.db("InvestmentDB"); // Case matches your existing DB
    const collection = database.collection("investments");

    const investment = {
      investor: "John Doe",
      amount: 5000,
      date: new Date(),
    };

    const result = await collection.insertOne(investment);
    console.log("✅ Investment saved with ID:", result.insertedId);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
  }
}

run();

