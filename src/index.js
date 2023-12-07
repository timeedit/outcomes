import fs from "fs";
import Papa from "papaparse";
import { exec } from "child_process";
import express from "express";
import OpenAI  from 'openai';
import bp from 'body-parser';

const openai = new OpenAI({
  apiKey: "" // This is also the default, can be omitted
});

const parseAndWrite = () => {
  let csv = fs.readFileSync("WUR-modules.csv", "utf8");

  let data = Papa.parse(csv);

  //console.log("Parsed data: ", data);

  // fs.writeFileSync("WUR-modules.json", JSON.stringify(data));
  data.data.forEach((row, index) => {
    if (index > 0) {
      fs.writeFileSync(`${row[0]}.txt`, JSON.stringify(row));
    }
  });
};


const executeQuery = (outcome, callback) => {
  const cmd = `llm similar readmes -c '${outcome}' > answer.json`;

  // Execute command and print output
  exec(cmd, (error, stdout, stderr) => {
    if (error !== null) {
      console.log(stderr);
      console.log(`exec error: ${error}`);
    } else {
      let answerData = fs.readFileSync("answer.json", "utf8").split("\n");
      const results = [];
      answerData.forEach((row, index) => {
        if (row === "") {
          return;
        }
        try {
          let data = JSON.parse(row);
          results.push(data);
        } catch (error) {
          console.log("Parse error for ", row, error);
        }
      });
      callback(results);
    }
  });
};

// Read first command line argument
//const arg = process.argv[2];
//executeQuery(arg);

// Set up a server to listen to requests on port 3000/value
const app = express();
const port = 3000;

app.get("/:outcome", (req, res) => {
  const outcome = req.params.outcome;
  console.log("Outcome: ", outcome);
  executeQuery(outcome, (data) => {
    res.send(data);
  });
});

// Defining an endpoint to handle incoming requests
app.post('/converse', (req, res) => {
  // Extracting the user's message from the request body
  const message = req.body.message;
  // Calling the OpenAI API to complete the message
  openai.createCompletion({
    model: "text-davinci-003",
    // Adding the conversation context to the message being sent
    prompt: conversationContextPrompt + message,
    temperature: 0.9,
    max_tokens: 150,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0.6,
    stop: [" Human:", " AI:"],
  })
  .then((response) => {
    // Sending the response data back to the client
    res.send(response.data.choices);
  });
});

app.use(express.static("public"));

app.use(bp.urlencoded({ extended: true }));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
