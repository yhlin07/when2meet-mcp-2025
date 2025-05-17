const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Hello from Express!" });
});

const PORT = 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
