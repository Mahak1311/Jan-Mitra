# 🤝 JanMitra  
### AI-Powered Public Information Access System 🇮🇳

JanMitra is an AI-powered, conversational public information system designed to help citizens discover and understand government schemes and public services in their preferred Indian language. The system focuses on improving **accessibility**, **comprehension**, and **awareness** for underserved communities through a simple, voice-first, and multilingual interface.

🧪 **Project Stage:** Phase 1 – Pilot Implementation & Feasibility Validation  
🎯 **Theme:** AI for Communities, Access & Public Impact

---

## 🌍 Problem Context

Despite India’s rapid digital transformation, millions of citizens still struggle to access government schemes due to:

- 🗂️ **Fragmented Information** across multiple portals (MyScheme, UMANG, state & ministry websites)
- 🌐 **Language Barriers** and limited high-quality vernacular support
- 📄 **Complex Bureaucratic Language** and unclear eligibility rules
- 📶 **Low Digital Literacy & Connectivity Constraints**
- ❓ **Lack of Awareness** about schemes citizens qualify for

**JanMitra bridges this gap** by enabling natural, conversational access to verified public information—without requiring users to navigate complex portals.

---

## 🎯 Project Scope

| Aspect | Description |
|------|------------|
| 🧭 Phase | Pilot Implementation & Feasibility Validation |
| 🔍 Focus | Technical clarity, responsible AI usage |
| 🚫 Out of Scope | National-scale deployment, full scheme coverage |

⚠️ All metrics and architectural choices are intended for **pilot validation**, not guaranteed national outcomes.

---

## 👥 Target Users

- 🚜 Rural & semi-urban citizens seeking government benefits  
- 📱 First-time or low-literacy digital users  
- 🎓 Students from Tier 2/3 cities exploring scholarships  
- 🧑‍💼 Small business owners & informal entrepreneurs  
- ♿ Senior citizens & persons with disabilities  

---

## ✨ Key Features (Phase 1)

- 💬 Conversational text & 🎙️ voice-based interaction  
- 🌐 Multilingual support (Hindi, English, Tamil, Telugu)  
- 🧠 Context-aware scheme discovery  
- 🧾 Simple explanations of eligibility & application steps  
- 🔗 Official source attribution for transparency  
- 📉 Low-bandwidth optimized experience  

---

## 🧠 Why AI?

Traditional keyword search and rule-based systems fail to handle:

- 🌍 Multilingual and code-mixed queries  
- 🤔 Incomplete or ambiguous user input  
- 🧩 Context-dependent eligibility conditions  
- 🔄 Frequently changing government schemes  

JanMitra uses **AI-driven Natural Language Understanding** and **Retrieval-Augmented Generation (RAG)** to deliver accurate, explainable, and context-aware responses grounded in verified government data.

---

## 🏗️ High-Level Architecture

```text
User (Text / Voice)
        ↓
📱 Mobile-First Web Interface
        ↓
🌐 API Gateway
        ↓
⚙️ Serverless Backend (Request Orchestration)
        ↓
🧠 AI Processing Layer (NLU + RAG)
        ↓
📚 Verified Scheme Data
        ↓
💬 Simplified Response + Source Links
