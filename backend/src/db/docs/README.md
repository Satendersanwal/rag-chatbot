# Documentation Files for Database Seeding

This directory contains markdown files that are used to seed the RAG chatbot's vector database with knowledge about AI and machine learning topics.

## Purpose

These markdown files serve as the knowledge base for the chatbot. When the `seed-embeddings.ts` script runs, it:

1. Reads all `.md` files from this directory
2. Generates vector embeddings for each document using OpenAI's embedding model
3. Stores the documents and their embeddings in the PostgreSQL database with pgvector extension
4. Makes the content searchable via semantic similarity

## Current Topics

The knowledge base currently includes comprehensive documentation on:

- **Machine Learning Fundamentals** - Core concepts, types, and applications
- **Deep Learning** - Neural network architectures and training
- **Natural Language Processing** - Text processing and understanding
- **Computer Vision** - Image and video analysis
- **Reinforcement Learning** - Agent-based learning systems
- **Neural Networks** - Architecture and learning mechanisms
- **Transfer Learning** - Reusing pre-trained models
- **Large Language Models** - Modern transformer-based models
- **Retrieval-Augmented Generation (RAG)** - Combining retrieval with generation
- **Vector Databases** - Efficient similarity search
- **Prompt Engineering** - Optimizing LLM interactions
- **Transformers** - The architecture behind modern AI
- **Embeddings** - Vector representations of data
- **AI Ethics** - Responsible AI development
- **Model Training** - Training and optimization techniques

## Adding New Documents

To add new knowledge to the chatbot:

1. Create a new markdown file in this directory (e.g., `my-topic.md`)
2. Write your content using markdown formatting
3. Include a title as the first heading: `# Your Topic Title`
4. Run the seeding script: `npm run seed:embeddings`

The script will automatically detect and process the new file.

## File Format

Each markdown file should:
- Start with a level 1 heading (`# Title`)
- Use proper markdown formatting for readability
- Include comprehensive, accurate information
- Be self-contained (can be understood independently)

## Running the Seeder

From the backend directory:

```bash
# Seed the database with all documents
npm run seed:embeddings

# Or run directly with ts-node
npx ts-node src/db/seed-embeddings.ts
```

## Notes

- The seeder will show progress for each document
- Documents are chunked and embedded individually
- Existing documents won't be duplicated
- The script includes rate limiting to avoid API throttling
- Make sure your OpenAI API key is configured in the `.env` file

