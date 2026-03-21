# The AI Legislative Analyzer 🇮🇳

A citizen-centric dashboard for analyzing and simplifying complex Indian legal documents using **Hierarchical Token Compression** and **Retrieval-Augmented Generation (RAG)**.

## 🎯 The Problem
Legal documents in India are often 100k+ tokens long, filled with archaic jargon, and inaccessible to the average citizen. Sending these full documents to LLMs is expensive, slow, and often hits context window limits.

## 🧩 The Solution
This system implements a sophisticated AI pipeline:
1. **Hierarchical Compression**: Large documents are broken into semantic chunks and compressed into high-density JSON representations (Key Provisions, Penalties, Obligations).
2. **Semantic RAG**: Compressed data is stored in a vector store. User queries retrieve only the most relevant "information-dense" blocks.
3. **Citizen Transformation**: Technical legal data is translated into plain English with actionable "What this means for me" insights.

## 🚀 Features
- **Analyze New Laws**: Paste raw legal text to generate an instant AI summary and impact analysis.
- **RAG-Powered Chat**: Ask specific questions (e.g., "What are the penalties for data breach?") and get answers grounded in the document.
- **Citizen Dashboard**: Browse latest legislation with one-liner summaries and expandable details.
- **Token Efficient**: Reduces context size by up to 95% before LLM processing.

## 🛠️ Tech Stack
- **Frontend**: React, Tailwind CSS, Framer Motion, Lucide Icons.
- **Backend**: Node.js (Express) with Vite integration.
- **AI**: Google Gemini 2.0 Flash (via `@google/genai`).
- **Embeddings**: Text Embedding 004.
- **Vector Store**: Custom in-memory implementation (scalable to Pinecone/Chroma).

## 📦 Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/ai-legislative-analyzer.git
   cd ai-legislative-analyzer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_google_gemini_api_key_here
   ```
   *Get your free API key at [aistudio.google.com](https://aistudio.google.com/)*

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

## 📝 License
This project is licensed under the Apache-2.0 License.
