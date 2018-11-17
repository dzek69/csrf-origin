const express = require("express");
const createMiddleware = require("./index");

const app = express();

app.use("/end", createMiddleware({
    list: [
        "http://127.0.0.1:4500"
    ],
    requestFilter: req => {
        console.log(req.method);
        if (req.method === "POST") {
            return true;
        }
    }
}));

app.use("*", (req, res) => {
    res.send("<a href=/end>end</a><form method='post' action='/end'><button>submit</button></form>")
});

app.listen(4500, () => {
    console.log("ready");
});