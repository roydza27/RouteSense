import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

app.use(async (req, res) => {
  const start = Date.now();
  const targetPort = 8081; // Change this later to whatever port you want to observe

  try {
    const response = await axios({
      method: req.method,
      url: `http://localhost:${targetPort}${req.url}`,
      data: req.body
    });

    const responseTime = Date.now() - start;

    // Send metrics to 3002 collector
    await axios.post("http://localhost:3002/api/metrics/forward", {
      id: Date.now().toString(),
      route: req.url,
      method: req.method,
      status: response.status,
      responseTime,
      isError: response.status >= 400
    });

    res.status(response.status).send(response.data);

  } catch (err) {
    const responseTime = Date.now() - start;
    await axios.post("http://localhost:3002/api/metrics/forward", {
      id: Date.now().toString(),
      route: req.url,
      method: req.method,
      status: err.response?.status || 500,
      responseTime,
      isError: true
    });

    res.status(err.response?.status || 500).send(err.message);
  }
});

app.listen(4001, () => console.log("Proxy running on 4001"));
