import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Proxy for US Treasury Data to bypass CORS
  app.get("/api/us-debt", async (req, res) => {
    try {
      const response = await axios.get('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_the_penny?sort=-record_date&limit=100');
      res.json(response.data);
    } catch (error) {
      console.error('US Debt Proxy Error:', error);
      res.status(500).json({ error: 'Failed to fetch US debt data' });
    }
  });

  // API Proxy for NASA Data
  app.get("/api/nasa/:indicator", async (req, res) => {
    try {
      const { indicator } = req.params;
      let url = '';
      if (indicator === 'temp') {
        url = 'https://climate.nasa.gov/system/internal_resources/details/original/647_Global_Temperature_Data_File.txt';
      } else if (indicator === 'co2') {
        url = 'https://climate.nasa.gov/system/internal_resources/details/original/2507_co2_data_mlo.txt';
      }
      
      if (!url) return res.status(404).json({ error: 'Indicator not found' });
      
      const response = await axios.get(url);
      res.send(response.data);
    } catch (error) {
      console.error('NASA Proxy Error:', error);
      res.status(500).json({ error: 'Failed to fetch NASA data' });
    }
  });

  // API Proxy for OWID Data
  app.get("/api/owid/:indicator", async (req, res) => {
    try {
      const { indicator } = req.params;
      const urls: { [key: string]: string } = {
        'life-expectancy': 'https://raw.githubusercontent.com/owid/owid-datasets/master/datasets/Life%20expectancy%20-%20OWID/Life%20expectancy%20-%20OWID.csv',
        'poverty': 'https://raw.githubusercontent.com/owid/owid-datasets/master/datasets/Poverty%20data%20-%20World%20Bank/Poverty%20data%20-%20World%20Bank.csv',
        'energy': 'https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv',
        'literacy': 'https://raw.githubusercontent.com/owid/owid-datasets/master/datasets/Literacy%20rates%20-%20OWID/Literacy%20rates%20-%20OWID.csv',
        'renewable-share': 'https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv'
      };
      
      const url = urls[indicator];
      if (!url) return res.status(404).json({ error: 'Indicator not found' });
      
      const response = await axios.get(url);
      res.send(response.data);
    } catch (error) {
      console.error('OWID Proxy Error:', error);
      res.status(500).json({ error: 'Failed to fetch OWID data' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
