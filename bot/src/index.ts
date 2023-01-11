import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import cors from "cors";
import ws from "./ws";
import { run } from "./bot";
import cron from "node-cron";

dotenv.config();
const app: Express = express();

app.use(express.json());
app.use(cors());

app.get("/", (req: Request, res: Response) => {
	res.send("<h1>Hello World From the Typescript Server!</h1>");
});

const port = process.env.PORT || 8000;

app.listen(port, () => {
	console.log(`Listening on port ${port}`);
});

ws.initialise();

let runNew = false;
run(true).catch(() => { runNew = true });

function thread() {
	if (runNew) {
		runNew = false;
		run().catch(() => { runNew = true });
	}
}

cron.schedule('* * * * * *', () => {
  thread();
});
