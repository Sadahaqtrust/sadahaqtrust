const express = require("express");
const { getConfigFile } = require("medusa-core-utils");
const { Medusa } = require("@medusajs/medusa");

const app = express();

async function start() {
  const { configModule } = getConfigFile(process.cwd(), "medusa-config");
  const medusa = await Medusa({ directory: process.cwd(), configModule });
  
  app.use(medusa.app);
  
  const PORT = process.env.PORT || 9000;
  app.listen(PORT, () => {
    console.log(`🚀 Medusa server running on http://localhost:${PORT}`);
    console.log(`📊 Admin dashboard: http://localhost:${PORT}/app`);
  });
}

start();
