const express = require('express');
const app = express();
const port = 3001;

app.get('/', (req, res) => {
  res.send('Hello from robot-fish backend!');
});

app.listen(port, () => {
  console.log(`robot-fish backend listening at http://localhost:${port}`);
});
