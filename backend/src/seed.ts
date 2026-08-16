import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Validate critical environment variables early
if (!process.env.FEATHERLESS_API_KEY) {
  console.warn("⚠️ Warning: FEATHERLESS_API_KEY is not set in environment variables.");
}

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Initialize Featherless AI using OpenAI compatible endpoint
const featherless = new OpenAI({
  baseURL: 'https://api.featherless.ai/v1',
  apiKey: process.env.FEATHERLESS_API_KEY || 'dummy-key'
});

// Datasets configuration for Hugging Face ingestion
const DATASETS = [
  { name: 'electricsheepasia/asia-owid-annual-carbon-dioxide-emissions', label: 'Asia' },
  { name: 'electricsheepeurope/europe-owid-annual-carbon-dioxide-emissions', label: 'Europe' }
];

// Endpoint: Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint: Trigger Dataset Ingestion Directly from Hugging Face Server API
app.post('/api/ingest', async (req, res) => {
  try {
    console.log('Starting dynamic ingestion from Hugging Face via API endpoint...');
    let totalProcessed = 0;

    for (const dataset of DATASETS) {
      const url = `https://datasets-server.huggingface.co/rows?dataset=${dataset.name}&config=default&split=train&offset=0&length=500`;
      const response = await fetch(url);
      const data: any = await response.json();

      if (!data.rows) continue;

      const payload = data.rows.map((row: any) => ({
        entity: row.row.Entity || row.row.country,
        year: parseInt(row.row.Year || row.row.year, 10),
        co2: parseFloat(row.row['Annual CO2 emissions'] || row.row.co2 || 0),
        dataset: dataset.label
      })).filter((item: any) => !isNaN(item.year) && !isNaN(item.co2));

      await prisma.emission.createMany({
        data: payload,
        skipDuplicates: true
      });

      totalProcessed += payload.length;
    }

    res.json({ success: true, message: "Ingestion triggered and completed successfully.", recordsProcessed: totalProcessed });
  } catch (error: any) {
    console.error('Ingestion error:', error);
    res.status(500).json({ error: 'Ingestion failed.', details: error.message });
  }
});

// Endpoint: Fetch Aggregated Data for Dashboard
app.get('/api/emissions', async (req, res) => {
  try {
    const data = await prisma.emission.findMany({
      orderBy: { year: 'desc' },
      take: 100
    });
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch emissions:', error);
    res.status(500).json({ error: 'Internal server error while fetching emissions.' });
  }
});

// Endpoint: Agent Chat with Database Memory & Featherless AI Inference
app.post('/api/chat', async (req, res) => {
  const { sessionId, prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required and must be a string.' });
  }

  try {
    // 1. Ensure Session Exists
    let session = sessionId ? await prisma.chatSession.findUnique({ where: { id: sessionId } }) : null;
    if (!session) {
      session = await prisma.chatSession.create({ data: {} });
    }

    // 2. Save User Prompt to Memory
    await prisma.message.create({
      data: { sessionId: session.id, role: 'user', content: prompt }
    });

    // 3. Retrieve Conversational History
    const history = await prisma.message.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: 10 // Retain last 10 turns of context
    });

    // Extract recent database context
    const recentData = await prisma.emission.findMany({ take: 5, orderBy: { year: 'desc' } });
    const systemPrompt = `You are an expert climate data assistant. Context Emissions Data: ${JSON.stringify(recentData)}. Answer the user accurately based on this data and conversation history.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map(msg => ({ role: msg.role as 'user' | 'assistant', content: msg.content }))
    ];

    // 4. Query Featherless AI Inference
    const completion = await featherless.chat.completions.create({
      model: 'featherless/Qwen/Qwen3-32B',
      messages: messages,
      max_tokens: 500,
    });

    const aiResponse = completion.choices[0]?.message?.content || "No response generated.";

    // 5. Save AI Response to Memory
    await prisma.message.create({
      data: { sessionId: session.id, role: 'assistant', content: aiResponse }
    });

    res.json({ sessionId: session.id, response: aiResponse });
  } catch (error: any) {
    console.error('Agent execution error:', error?.response?.data || error.message || error);
    res.status(500).json({ error: 'Agent execution failed during inference.' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));