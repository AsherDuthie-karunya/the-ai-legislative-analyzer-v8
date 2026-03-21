import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LAWS_FILE = path.join(__dirname, "laws.json");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize laws file if it doesn't exist
  try {
    await fs.access(LAWS_FILE);
  } catch {
    const initialLaws = [
      {
        id: "dpdp-2023",
        title: "Digital Personal Data Protection Act, 2023",
        category: "Digital Law",
        date: "2023-08-11",
        oneLiner: "Protects personal data of Indian citizens and regulates its processing by entities.",
        shortSummary: [
          "Applies to digital personal data within India.",
          "Requires explicit consent for data processing.",
          "Establishes Data Protection Board of India.",
          "Penalties up to ₹250 crore for breaches.",
          "Right to access, correct, and erase data."
        ]
      },
      {
        id: "it-rules-2021",
        title: "Information Technology Rules, 2021",
        category: "Digital Law",
        date: "2021-02-25",
        oneLiner: "Guidelines for intermediaries and digital media ethics code.",
        shortSummary: [
          "Due diligence for social media intermediaries.",
          "Grievance redressal mechanism required.",
          "Traceability of first originator of information.",
          "Code of ethics for digital news and OTT platforms."
        ]
      },
      {
        id: "waqf-bill-2024",
        title: "The Waqf (Amendment) Bill, 2024",
        category: "Social Law",
        date: "2024-08-08",
        oneLiner: "Proposed changes to the management and regulation of Waqf properties in India.",
        shortSummary: [
          "Aims to enhance transparency in Waqf board operations.",
          "Proposes inclusion of women and non-Muslims in boards.",
          "Strengthens audit and monitoring of properties.",
          "Centralizes registration of Waqf assets."
        ]
      }
    ];
    await fs.writeFile(LAWS_FILE, JSON.stringify(initialLaws, null, 2));
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/laws", async (req, res) => {
    try {
      const data = await fs.readFile(LAWS_FILE, "utf-8");
      res.json(JSON.parse(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to read laws" });
    }
  });

  app.post("/api/laws", async (req, res) => {
    try {
      const newLaw = req.body;
      const data = await fs.readFile(LAWS_FILE, "utf-8");
      const laws = JSON.parse(data);
      laws.unshift(newLaw);
      await fs.writeFile(LAWS_FILE, JSON.stringify(laws, null, 2));
      res.json(newLaw);
    } catch (error) {
      res.status(500).json({ error: "Failed to save law" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
