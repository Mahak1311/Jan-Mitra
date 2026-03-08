# System Design Document: AI-Powered Public Information Access System

**Design Phase**: Pilot Implementation & Feasibility Validation  
**Architecture Focus**: Serverless, scalable, and cost-effective design for Phase 1 deployment

This document describes the technical architecture and design decisions for a pilot system that validates the feasibility of using AI to make government scheme information accessible to underserved communities in India. The design prioritizes demonstrable functionality, responsible AI usage, and clear paths to scale based on pilot learnings.

## 1. System Overview

### What This System Is

An AI-powered conversational interface that enables citizens to discover and understand government schemes through natural language interaction in their preferred Indian language. The system is:

- **Serverless and cloud-native**: Built entirely on AWS managed services to minimize operational overhead and enable elastic scaling
- **Conversational AI-driven**: Uses large language models with retrieval-augmented generation to understand user needs and provide contextual, accurate information
- **Multilingual by design**: Supports Hindi, English, Tamil, and Telugu in Phase 1, with architecture designed for language expansion
- **Mobile-first and accessible**: Optimized for smartphone users with limited digital literacy, low bandwidth, and accessibility needs

### Problem It Addresses

Citizens, particularly in rural and semi-urban areas, struggle to discover relevant government schemes due to:
- Information scattered across multiple portals with complex navigation
- Language barriers (most portals primarily in English)
- Bureaucratic language that obscures eligibility and application processes
- Lack of awareness about which schemes they qualify for

This system addresses these barriers by providing a simple conversational interface that understands user context, searches across scheme information, and explains opportunities in plain language.

### Design Scope

This design focuses on **pilot validation and feasibility assessment**, not national-scale deployment. The architecture is intentionally modular and scalable, allowing validated components to evolve based on real-world usage data and user feedback from the pilot phase.

## 2. High-Level Architecture

The system follows a three-tier serverless architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                          │
│  Mobile-optimized web interface (React/Next.js)             │
│  - Text and voice input                                     │
│  - Multilingual UI rendering                                │
│  - Progressive web app for offline capability               │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                  API & ORCHESTRATION LAYER                  │
│  AWS API Gateway + Lambda Functions                         │
│  - Request validation and routing                           │
│  - Session management                                       │
│  - AI workflow orchestration                                │
│  - Response formatting                                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        ↓                                       ↓
┌──────────────────────┐            ┌──────────────────────┐
│   AI PROCESSING      │            │   DATA LAYER         │
│   LAYER              │            │                      │
│                      │            │  - Scheme corpus     │
│  - Speech-to-text    │←──────────→│    (S3 + vector DB)  │
│  - Language detect   │            │  - Session state     │
│  - Intent extraction │            │    (DynamoDB)        │
│  - RAG pipeline      │            │  - Cache layer       │
│  - Response gen      │            │    (ElastiCache)     │
│  - Text-to-speech    │            │                      │
└──────────────────────┘            └──────────────────────┘
```

### Architectural Principles

1. **Stateless request handling**: Each API request is self-contained; session context retrieved from DynamoDB as needed
2. **Managed services first**: Leverage AWS-managed AI, database, and compute services to reduce operational complexity
3. **Modular AI pipeline**: Each AI processing step (language detection, intent extraction, retrieval, generation) is independently testable and replaceable
4. **Cost-aware design**: Implement caching, request batching, and tiered AI model usage to control per-conversation costs
5. **Graceful degradation**: System remains functional when individual components (voice, translation) fail


## 3. Frontend Design Considerations

### Design Philosophy

The frontend is designed for users who may be interacting with a digital government service for the first time. Every design decision prioritizes simplicity, clarity, and accessibility over feature richness.

### Key Design Choices

**Mobile-First, Touch-Optimized Interface**
- Large touch targets (minimum 48x48px) for users unfamiliar with precise touch interaction
- Single-column layout that eliminates horizontal scrolling
- Minimal navigation chrome—conversation is the primary interface
- Bottom-anchored input area for thumb-zone accessibility on smartphones

**Why**: Rural users primarily access internet via smartphones; complex multi-screen navigation creates abandonment.

**Voice-First Interaction Model**
- Prominent voice input button as primary interaction method
- Visual feedback during voice recording (waveform animation)
- Automatic fallback to text input if voice processing fails
- Text-to-speech playback of responses with pause/resume controls

**Why**: Many target users have low text literacy or prefer speaking over typing; voice removes a significant barrier to engagement.

**Progressive Enhancement for Bandwidth**
- Core text conversation works on 2G networks
- Images, icons, and voice features load progressively
- Aggressive asset compression and lazy loading
- Offline mode for FAQ content using service workers

**Why**: Rural connectivity is often slow and intermittent; system must remain usable under poor network conditions.

**Language-Aware Rendering**
- Automatic font selection based on detected language (Noto Sans for Indic scripts)
- Right-to-left and complex script support where needed
- Language switcher accessible but not required (system auto-detects from input)
- Consistent UI element positioning across languages

**Why**: Each Indian language has specific rendering requirements; poor typography creates trust issues and readability problems.

**Accessibility Considerations**
- WCAG 2.1 AA compliance for screen reader compatibility
- High contrast mode for low vision users
- Keyboard navigation support for all interactive elements
- Semantic HTML for assistive technology compatibility

**Why**: Persons with disabilities are disproportionately excluded from digital services; accessible design is inclusive design.

### What We Deliberately Avoid

- Multi-step forms or wizards (replaced with conversational flow)
- Dropdown menus with many options (replaced with natural language)
- Login requirements for basic information access (authentication only for saving preferences)
- Heavy JavaScript frameworks that increase load time (using optimized React with code splitting)

## 4. Backend & API Orchestration

### Request Flow Architecture

The backend orchestrates a multi-step workflow that coordinates AI processing, data retrieval, and response delivery while maintaining low latency and high reliability.

**Request Processing Pipeline**:

1. **API Gateway Entry Point**
   - Receives HTTPS requests from frontend
   - Performs initial validation (rate limiting, request size, authentication token if present)
   - Routes to appropriate Lambda function based on endpoint

2. **Session Context Retrieval**
   - Lambda function retrieves conversation history and user profile from DynamoDB
   - Session includes: previous messages, inferred user attributes (location, occupation), language preference
   - Cache check: If query is similar to recent query, return cached response

3. **AI Processing Orchestration**
   - Invokes AI pipeline (detailed in Section 5)
   - Manages timeouts and retries for AI service calls
   - Implements circuit breaker pattern for external service failures

4. **Response Assembly**
   - Combines AI-generated response with structured metadata (scheme links, source attribution)
   - Formats response based on client capabilities (text-only vs. rich media)
   - Updates session state in DynamoDB

5. **Response Delivery**
   - Returns JSON response to frontend via API Gateway
   - Logs interaction for analytics and quality monitoring
   - Triggers async processes (feedback collection, error reporting) if needed

### Why Serverless Lambda Functions

**Scalability**: Automatically scales from zero to thousands of concurrent requests without capacity planning
**Cost Efficiency**: Pay only for actual compute time; no idle server costs during low usage
**Operational Simplicity**: No server patching, monitoring, or infrastructure management
**Regional Deployment**: Easy to deploy across multiple AWS regions for latency reduction

### State Management Strategy

**Session State (DynamoDB)**:
- Stores conversation history (last 10 messages) for context continuity
- Stores inferred user profile (location, occupation, age bracket) for personalization
- TTL-based expiration (7 days) for automatic cleanup
- Partition key: session_id; enables fast single-item lookups

**Why DynamoDB**: Single-digit millisecond latency, automatic scaling, built-in TTL for data lifecycle management

**Cache Layer (ElastiCache/Redis)**:
- Caches frequently asked questions and responses
- Caches scheme information to reduce database lookups
- Caches AI model responses for identical queries (cache key: hash of query + user context)
- 1-hour TTL for most cached data

**Why Caching**: Reduces AI API costs (most expensive component), improves response time, handles traffic spikes

### API Design Principles

- **Idempotency**: POST requests include idempotency keys to prevent duplicate processing
- **Versioning**: API versioned (/v1/) to allow non-breaking changes
- **Error Responses**: Structured error codes with user-friendly messages in appropriate language
- **Request Validation**: Input sanitization and validation before AI processing to prevent prompt injection

## 5. AI Architecture & Workflow

This section describes the core AI processing pipeline—the most critical component of the system.

### Why Retrieval-Augmented Generation (RAG)

Pure large language models, while powerful, have fundamental limitations for this use case:

1. **Hallucination Risk**: LLMs can generate plausible but incorrect information about schemes, eligibility, or deadlines
2. **Knowledge Cutoff**: Models don't know about schemes launched after their training data cutoff
3. **Lack of Attribution**: Pure generation doesn't provide source links for verification
4. **Inconsistency**: Same query may produce different answers across sessions

**RAG solves these problems** by grounding AI responses in retrieved, verified documents:
- Retrieves relevant scheme documents from curated corpus before generation
- LLM generates response based on retrieved content, not just parametric knowledge
- Enables source attribution (every response cites official scheme documents)
- Ensures consistency (same retrieval + same prompt = same response)

### AI Processing Workflow

**Step 1: Input Processing**

```
User Input (text or voice)
    ↓
[If voice] Speech-to-Text (AWS Transcribe)
    ↓
Text normalization (remove filler words, correct common errors)
    ↓
Language Detection (AWS Comprehend or embedded model)
```

**Why separate language detection**: Enables language-specific processing pipelines and accurate translation if needed.

**Step 2: Intent Classification & Entity Extraction**

```
Normalized text
    ↓
Intent Classification (fine-tuned model or LLM with few-shot prompting)
    → Intents: scheme_search, eligibility_check, application_guidance, 
              general_question, clarification_needed
    ↓
Entity Extraction
    → Extract: location, occupation, age, income bracket, scheme category
    → Merge with session context (previously mentioned entities)
```

**Why explicit intent classification**: Allows routing to specialized handlers; not all queries need full RAG pipeline (e.g., "thank you" doesn't need scheme retrieval).

**Step 3: Contextual Query Formulation**

```
Intent + Entities + Conversation History
    ↓
Query Reformulation (LLM-based)
    → Convert conversational query to search-optimized query
    → Example: "मुझे बेटी की पढ़ाई के लिए मदद चाहिए" 
              → "education scholarship schemes for girl child"
    ↓
Generate embedding vector for semantic search
```

**Why query reformulation**: User queries are often ambiguous or incomplete; reformulation creates better search queries while preserving intent.

**Step 4: Semantic Retrieval**

```
Query embedding
    ↓
Vector similarity search (AWS OpenSearch with k-NN)
    → Search across scheme corpus (documents pre-embedded)
    → Retrieve top 5-10 most relevant scheme documents
    ↓
Reranking (optional, based on user profile)
    → Boost schemes matching user's state, occupation, age
    ↓
Top 3-5 schemes selected for context
```

**Why vector search over keyword search**: Handles semantic similarity ("farming loan" matches "agricultural credit"), works across languages, handles synonyms naturally.

**Step 5: Response Generation**

```
Retrieved scheme documents + User query + Conversation context
    ↓
Prompt Construction
    → System prompt: "You are a helpful assistant explaining government 
                      schemes in simple language..."
    → Context: Retrieved scheme documents (truncated to fit context window)
    → User query: Original user question
    → Instructions: "Explain in [detected language], use simple words, 
                     cite sources, ask clarifying questions if needed"
    ↓
LLM Generation (AWS Bedrock or managed LLM service)
    → Temperature: 0.3 (low for consistency)
    → Max tokens: 300 (concise responses)
    ↓
Generated response
```

**Why low temperature**: Reduces creativity/hallucination, increases consistency and factual accuracy.

**Step 6: Post-Processing & Validation**

```
Generated response
    ↓
Fact Verification
    → Check if response contains information not in retrieved documents
    → Flag potential hallucinations for human review
    ↓
Source Attribution
    → Append links to official scheme pages
    → Add "Last updated: [date]" timestamp
    ↓
Simplification Check
    → Verify reading level appropriate for target audience
    → Flag complex sentences for revision
    ↓
[If voice output requested] Text-to-Speech (AWS Polly)
```

**Why post-processing**: Adds safety layer; catches hallucinations before user sees them; ensures every response is verifiable.

### Handling Low-Confidence Scenarios

The system explicitly handles cases where AI confidence is insufficient:

**Ambiguous Intent**:
- If intent classification confidence < 70%, ask clarifying question
- Example: "I need help" → "Are you looking for employment schemes, education support, or something else?"

**No Relevant Schemes Found**:
- If vector search returns no results above similarity threshold (0.6), acknowledge limitation
- Response: "I couldn't find schemes matching your exact situation. Can you tell me more about [missing information]?"

**Conflicting Information**:
- If retrieved documents contain contradictory eligibility criteria, present both with sources
- Recommend user verify on official portal

**Outdated Information**:
- If scheme document timestamp > 6 months old, add disclaimer: "This information may be outdated. Please verify on official website."

### Multilingual Processing Strategy

**Approach**: Translate-then-process for non-English languages

```
User query in Hindi/Tamil/Telugu
    ↓
Translate to English (AWS Translate)
    ↓
Process in English (intent, retrieval, generation)
    ↓
Translate response back to source language
    ↓
Return to user
```

**Why this approach**:
- Scheme corpus is primarily in English (government documents)
- English LLMs are more capable and cost-effective than multilingual models
- Translation quality for Indian languages has improved significantly
- Allows single retrieval corpus instead of maintaining parallel corpora

**Alternative for Phase 2**: Native multilingual models that process directly in Indian languages, eliminating translation step.

