import Link from 'next/link';

import Layout from '@/components/layout/Layout';
import JoinCTA from '@/components/sections/JoinCTA';
import UpcomingEvents from '@/components/sections/UpcomingEvents';
import SEO from '@/components/SEO';
import { getUpcomingEvents } from '@/sanity/queries';
import type { Event } from '@/sanity/queries';
import { generateOrganizationSchema, generateFAQSchema } from '@/utils/structuredData';

interface Props {
  upcomingEvents: Event[];
}

export default function AIMLZurich({ upcomingEvents }: Props) {
  const faqs = [
    {
      question: 'Are there AI and Machine Learning meetups in Zurich?',
      answer:
        'Yes! ZurichJS regularly features AI and Machine Learning talks focusing on practical JavaScript/TypeScript implementations. We cover topics like OpenAI API integration, LangChain, vector databases, RAG systems, AI-powered applications, and machine learning in the browser with TensorFlow.js. Our meetups welcome both AI enthusiasts and web developers looking to integrate AI into their applications.',
    },
    {
      question: 'What AI topics does ZurichJS cover?',
      answer:
        'ZurichJS covers practical AI implementation in JavaScript including: OpenAI & Anthropic API integration, LangChain.js, vector databases (Pinecone, Weaviate), RAG (Retrieval Augmented Generation), AI agents, ChatGPT plugins, prompt engineering, LLM fine-tuning, TensorFlow.js, ONNX.js, AI-powered web applications, and Edge AI.',
    },
    {
      question: 'Do I need AI experience to attend AI talks at ZurichJS?',
      answer:
        'No! Our AI talks cater to all levels. We feature beginner-friendly introductions to AI concepts, practical tutorials for integrating AI APIs, and advanced topics for experienced practitioners. Many talks focus on how web developers can leverage AI without deep ML knowledge.',
    },
    {
      question: 'How can I learn about AI development with JavaScript in Zurich?',
      answer:
        'Join ZurichJS meetups to learn from practitioners building real AI applications with JavaScript and TypeScript. Our speakers share practical experience with OpenAI, Anthropic Claude, LangChain, vector databases, and modern AI frameworks. We also host workshops on AI integration and best practices.',
    },
  ];

  const structuredData = [generateOrganizationSchema(), generateFAQSchema(faqs)];

  return (
    <Layout>
      <SEO
        title="AI & Machine Learning Meetups in Zurich | ZurichJS - JavaScript AI Development"
        description="Join AI and Machine Learning meetups in Zurich with ZurichJS. Learn practical AI implementation in JavaScript & TypeScript: OpenAI API, LangChain, RAG systems, vector databases, AI agents, and modern AI frameworks. Free monthly meetups for developers interested in AI, ML, and LLM integration."
        keywords={[
          'AI Zurich',
          'Machine Learning Zurich',
          'AI meetup Zurich',
          'AI development Zurich',
          'OpenAI Zurich',
          'LangChain meetup',
          'AI JavaScript Zurich',
          'ML TypeScript Zurich',
          'ChatGPT development Zurich',
          'LLM Zurich',
          'Artificial Intelligence Zurich',
          'TensorFlow.js Zurich',
          'AI engineering Zurich',
          'AI events Switzerland',
          'Machine Learning events Zurich',
          'AI community Zurich',
          'RAG systems Zurich',
          'Vector databases Zurich',
          'AI agents Zurich',
        ]}
        geo={{
          region: 'CH-ZH',
          placename: 'Zurich',
          position: '47.3769;8.5417',
        }}
        structuredData={structuredData}
        openGraph={{
          title: 'AI & Machine Learning Meetups in Zurich | ZurichJS',
          description:
            'Learn practical AI development with JavaScript & TypeScript. Monthly meetups covering OpenAI, LangChain, RAG, and AI integration.',
          image: 'https://zurichjs.com/api/og/home',
          type: 'website',
          url: 'https://zurichjs.com/meetups/ai-ml-zurich',
        }}
      />

      <div className="pt-20 bg-gradient-to-br from-js to-js-dark">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-black">
              AI Development Meetups in Zurich
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-800 max-w-4xl">
              When we started ZurichJS in late 2024, we noticed something: most AI meetups in Zurich focused on
              Python and data science. But web developers needed practical answers for integrating AI into
              real applications. So we started hosting talks on OpenAI APIs, LangChain, RAG systems—the stuff
              you actually use in production JavaScript.
            </p>

            <div className="bg-white p-8 rounded-lg shadow-lg mb-12">
              <h2 className="text-2xl font-bold mb-4">Why AI at a JavaScript Meetup?</h2>
              <p className="text-gray-700 mb-4">
                Because that&apos;s where the real integration happens. Most companies aren&apos;t training their own
                models. They&apos;re using APIs. They&apos;re building interfaces. They&apos;re connecting LLMs to existing
                systems. And all of that lives in the web stack.
              </p>
              <p className="text-gray-700 mb-4">
                Our AI talks come from people building this in production: ChatGPT-style interfaces, RAG
                systems for documentation, AI agents for workflow automation. Not theoretical—practical.
              </p>
              <p className="text-gray-700">
                Plus, Zurich has Google&apos;s AI labs, ETH research, and AI startups. The knowledge is here. We&apos;re
                just creating the space for web developers to access it.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="font-bold text-xl mb-2">Production-Ready</h3>
                <p className="text-gray-700">
                  Talks from people shipping AI features in real products. Not demos—actual implementation
                  stories with lessons learned.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-3">🧠</div>
                <h3 className="font-bold text-xl mb-2">Web-First Approach</h3>
                <p className="text-gray-700">
                  OpenAI/Claude APIs, LangChain.js, vector databases, streaming responses—the stack web
                  developers actually use.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-bold text-xl mb-2">Free Events</h3>
                <p className="text-gray-700">
                  All AI talks are free. Same non-profit model, same community funding. No barriers to learning
                  this tech.
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-lg shadow-lg mb-12">
              <h2 className="text-3xl font-bold mb-6">What AI Looks Like for Web Developers</h2>

              <div className="prose prose-lg max-w-none">
                <p className="mb-4">
                  We&apos;re not training models. We&apos;re integrating them. The practical reality of AI for most web
                  developers is: call an API, manage prompts, handle streaming, deal with rate limits, build
                  interfaces that users actually understand.
                </p>
                <p className="mb-4">
                  Our AI talks reflect that. They come from people who&apos;ve debugged token limits at 2am. Who&apos;ve
                  figured out how to do RAG without blowing their budget. Who&apos;ve built chat interfaces that
                  don&apos;t feel clunky. This is implementation knowledge, not hype.
                </p>

                <h3 className="text-2xl font-bold mt-6 mb-4">What You&apos;ll Learn</h3>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-bold text-lg mb-2">LLM Integration</h4>
                    <ul className="text-gray-700 space-y-1 text-sm">
                      <li>• OpenAI API (GPT-4, GPT-3.5)</li>
                      <li>• Anthropic Claude API</li>
                      <li>• LangChain.js framework</li>
                      <li>• Prompt engineering</li>
                      <li>• Function calling</li>
                      <li>• Streaming responses</li>
                      <li>• Token optimization</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-bold text-lg mb-2">Vector Databases & RAG</h4>
                    <ul className="text-gray-700 space-y-1 text-sm">
                      <li>• Pinecone integration</li>
                      <li>• Weaviate setup</li>
                      <li>• Embeddings generation</li>
                      <li>• Semantic search</li>
                      <li>• RAG systems</li>
                      <li>• Context retrieval</li>
                      <li>• Document Q&A</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-green-500 pl-4">
                    <h4 className="font-bold text-lg mb-2">AI Agents & Automation</h4>
                    <ul className="text-gray-700 space-y-1 text-sm">
                      <li>• LangChain agents</li>
                      <li>• Tool integration</li>
                      <li>• Multi-step reasoning</li>
                      <li>• AutoGPT patterns</li>
                      <li>• Workflow automation</li>
                      <li>• Agent monitoring</li>
                      <li>• Error handling</li>
                    </ul>
                  </div>

                  <div className="border-l-4 border-yellow-500 pl-4">
                    <h4 className="font-bold text-lg mb-2">Browser ML & Edge AI</h4>
                    <ul className="text-gray-700 space-y-1 text-sm">
                      <li>• TensorFlow.js</li>
                      <li>• ONNX.js runtime</li>
                      <li>• WebNN API</li>
                      <li>• Client-side inference</li>
                      <li>• Model optimization</li>
                      <li>• Privacy-preserving ML</li>
                      <li>• WebGPU acceleration</li>
                    </ul>
                  </div>
                </div>

                <h3 className="text-2xl font-bold mt-8 mb-4">Popular AI Topics at ZurichJS</h3>
                <ul className="space-y-3 mb-6">
                  <li>
                    ✓ <strong>Building ChatGPT-like Interfaces</strong> - Create conversational AI
                    applications with modern frameworks
                  </li>
                  <li>
                    ✓ <strong>RAG Systems</strong> - Implement Retrieval Augmented Generation for
                    context-aware AI
                  </li>
                  <li>
                    ✓ <strong>AI-Powered Code Assistants</strong> - Build developer tools with OpenAI Codex
                    and GPT-4
                  </li>
                  <li>
                    ✓ <strong>Semantic Search</strong> - Vector embeddings and similarity search
                    implementations
                  </li>
                  <li>
                    ✓ <strong>AI Content Generation</strong> - Automated content creation and summarization
                  </li>
                  <li>
                    ✓ <strong>Computer Vision in the Browser</strong> - Object detection and image
                    classification with TensorFlow.js
                  </li>
                  <li>
                    ✓ <strong>Natural Language Processing</strong> - Sentiment analysis, named entity
                    recognition, text classification
                  </li>
                  <li>
                    ✓ <strong>AI Ethics & Best Practices</strong> - Responsible AI development, bias
                    mitigation, privacy
                  </li>
                </ul>

                <h3 className="text-2xl font-bold mt-8 mb-4">AI Tech Stack We Cover</h3>
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-bold mb-2">LLM Providers</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• OpenAI (GPT-4, GPT-3.5)</li>
                        <li>• Anthropic Claude</li>
                        <li>• Google PaLM</li>
                        <li>• Cohere</li>
                        <li>• Hugging Face</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold mb-2">Frameworks & Tools</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• LangChain.js</li>
                        <li>• Vercel AI SDK</li>
                        <li>• TensorFlow.js</li>
                        <li>• ONNX.js</li>
                        <li>• Transformers.js</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-bold mb-2">Vector Databases</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Pinecone</li>
                        <li>• Weaviate</li>
                        <li>• Qdrant</li>
                        <li>• Chroma</li>
                        <li>• Milvus</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold mt-8 mb-4">Who Should Attend?</h3>
                <ul className="space-y-2 mb-6">
                  <li>
                    • <strong>Web Developers</strong> - Learn to add AI capabilities to your applications
                  </li>
                  <li>
                    • <strong>Full-Stack Engineers</strong> - Build end-to-end AI-powered features
                  </li>
                  <li>
                    • <strong>Frontend Developers</strong> - Implement browser-based ML and AI interfaces
                  </li>
                  <li>
                    • <strong>Backend Developers</strong> - Integrate LLM APIs and manage AI workflows
                  </li>
                  <li>
                    • <strong>Product Managers</strong> - Understand AI capabilities and limitations
                  </li>
                  <li>
                    • <strong>Data Scientists</strong> - Bridge ML models and production web applications
                  </li>
                  <li>
                    • <strong>AI Enthusiasts</strong> - Explore practical AI implementations with JavaScript
                  </li>
                </ul>

                <h3 className="text-2xl font-bold mt-8 mb-4">Zurich&apos;s AI Ecosystem</h3>
                <p className="mb-4">
                  Zurich is emerging as a major AI hub in Europe. ZurichJS connects with the broader AI
                  community including ETH Zurich AI research, Google Zurich&apos;s AI teams, and numerous AI
                  startups. Our meetups bridge academic AI research with practical industry applications.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Upcoming Events */}
        <UpcomingEvents events={upcomingEvents} />

        {/* FAQ Section */}
        <section className="py-16 px-4 bg-white">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-md">
                  <h3 className="font-bold text-xl mb-3">{faq.question}</h3>
                  <p className="text-gray-700">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-6">Join Zurich&apos;s AI Developer Community</h2>
            <p className="text-xl mb-8">
              Learn practical AI development with JavaScript & TypeScript. Connect with developers building
              real AI applications.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/events"
                className="bg-black text-js px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-800 transition-colors"
              >
                View AI Meetups
              </Link>
              <Link
                href="/cfp"
                className="bg-white text-black px-8 py-4 rounded-lg font-bold text-lg border-2 border-black hover:bg-gray-100 transition-colors"
              >
                Share Your AI Knowledge
              </Link>
            </div>
          </div>
        </section>

        <JoinCTA />
      </div>
    </Layout>
  );
}

export async function getStaticProps() {
  const upcomingEvents = await getUpcomingEvents();

  return {
    props: {
      upcomingEvents,
    },
    revalidate: 3600,
  };
}
