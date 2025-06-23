import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import {
    Annotation,
    StateGraph,
    MemorySaver,
    END,
    START
} from '@langchain/langgraph';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from '@langchain/core/prompts';

import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError, RateLimitError } from '../utils/custom-errors';

import { getTraceFiles } from './tools';

const tools = [getTraceFiles];
const toolNode = new ToolNode(tools);
const memory = new MemorySaver();

const modelWithTools = new ChatOpenAI({
    model: config.openai.model,
    temperature: config.openai.temperature,
}).bindTools(tools);

const GraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: (x, y) => x.concat(y),
    }),
});

function shouldContinue (state: typeof GraphState.State) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];

    if ('tool_calls' in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
        logger.info('Continue tool calls');
        return 'tools';
    }

    logger.info('Exiting graph');
    return END;
}

async function callModel (state: typeof GraphState.State) {
    const prompt = ChatPromptTemplate.fromMessages([
        [
            'system',
            `You are a helpful AI assistant, collaborating with other assistants. Use the provided tools to progress towards answering the question. If you are unable to fully answer, that's OK, another assistant with different tools will help where you left off. Execute what you can to make progress. If you or any of the other assistants have the final answer or deliverable, prefix your response with FINAL ANSWER so the team knows to stop. You have access to the following tools: {tool_names}.\n{system_message}\nCurrent time: {time}.`,
        ],
        new MessagesPlaceholder('messages'),
    ]);

    const formattedPrompt = await prompt.formatMessages({
        system_message: 'You are helpful PW analyzer agent.',
        time: new Date().toISOString(),
        tool_names: tools.map((tool) => tool.name).join(', '),
        messages: state.messages,
    });

    const result = await modelWithTools.invoke(formattedPrompt);

    return { messages: [result] };
}

const workflow = new StateGraph(GraphState)
    .addNode('agent', callModel)
    .addNode('tools', toolNode)
    .addEdge(START, 'agent')
    .addConditionalEdges('agent', shouldContinue)
    .addEdge('tools', 'agent');

const graph = workflow.compile({ checkpointer: memory });

export async function analyzeTraceFile(traceFileId: string) {
    logger.info(`Analyze PW test trace, traceFileId: ${traceFileId}`);
    try {
        const finalState = await graph.invoke(
            {
                messages: [
                    new HumanMessage({
                        content: `You are an expert debugging assistant for Playwright tests with deep expertise in web automation, network protocols, browser internals, and test stability analysis.

Analyze ALL available trace data with forensic-level precision:

**PRIMARY TRACE SOURCES:**
1. **Main Playwright Trace**: Test execution flow, DOM interactions, page state changes, screenshots, action sequences, wait conditions, locator strategies, and browser events
2. **Network Trace**: HTTP/HTTPS requests/responses, timing waterfall, headers, cookies, redirects, failed requests, API calls, WebSocket connections, and resource loading
3. **Stack Trace**: Error call stack, function execution path, source code locations, exception details, async call chains, and error propagation

**ADVANCED ANALYSIS REQUIREMENTS:**
- **Timeline Correlation**: Precisely map events across all traces to identify the exact millisecond of failure
- **Network Deep Dive**: Analyze request/response patterns, status codes, content types, CORS issues, CSP violations, and SSL/TLS problems
- **Stack Trace Forensics**: Trace error propagation through async/await chains, identify source vs framework errors, and map to test code locations
- **Performance Analysis**: Examine load times, memory usage, CPU spikes, and resource contention
- **Concurrency Issues**: Detect race conditions, timing dependencies, and async operation overlaps
- **State Management**: Track page state changes, localStorage/sessionStorage modifications, and cookie mutations

**EXPERT-LEVEL CONTEXT AWARENESS:**
- **Framework Integration**: Understand Playwright-specific behaviors, timeout configurations, and retry mechanisms
- **Browser Specifics**: Account for Chrome/Firefox/Safari differences and browser version incompatibilities
- **Environment Factors**: Consider CI/CD environments, headless vs headed modes, and system resource constraints
- **Security Implications**: Identify HTTPS mixed content, certificate issues, and authentication token problems
- **Third-Party Dependencies**: Analyze external service failures, CDN issues, and API rate limiting
- **Test Flakiness Patterns**: Recognize common flaky test indicators and environmental sensitivities

**DIAGNOSTIC METHODOLOGY:**
- Establish precise failure timeline using cross-trace event correlation
- Distinguish between immediate causes and underlying systemic issues
- Identify whether failure is deterministic or probabilistic
- Assess test stability factors and environmental dependencies
- Evaluate error recovery possibilities and retry scenarios

**FAILURE CLASSIFICATION:**
- **Deterministic Failures**: Consistent, repeatable issues with clear causation
- **Intermittent Failures**: Timing-dependent, environmental, or race condition issues
- **Cascading Failures**: Single root cause triggering multiple downstream errors
- **Infrastructure Failures**: Network, DNS, SSL, or external service problems
- **Code Quality Issues**: Improper waits, flaky selectors, or test design problems

**Important:** Return only a raw, parsable JSON string — without markdown, backticks, escape sequences, or commentary. The output must be exactly like this format:

{
  "summary": "Brief overview of the test failure",
  "failedStep": "The specific action that failed",
  "errorReason": "Root cause of the failure",
  "networkIssues": "Network problems found or empty string",
  "stackTraceAnalysis": "Key stack trace insights",
  "suggestions": "Recommended fixes",
  "correlatedEvents": "Timeline event relationships"
}

Do not include \` characters, \\n, or any extra explanation.

Trace file id: ${traceFileId}`
                    })
                ],
            },
            { recursionLimit: 10, configurable: { thread_id: traceFileId } }
        );
        return finalState.messages[finalState.messages.length - 1].content;
    } catch (error: any) {
        logger.error(`Error during langgraph analysis for traceFileId ${traceFileId}:`, error);
        // Detect rate limit error (429)
        const message = error?.message || '';
        if (
            error?.statusCode === 429 ||
            message.includes('429') ||
            message.toLowerCase().includes('rate limit') ||
            message.toLowerCase().includes('quota')
        ) {
            throw new RateLimitError(
                'Analysis temporarily unavailable due to rate limiting. Please try again later.'
            );
        }

        throw new AppError(
            `Analysis failed: ${message.split('\n')[0]}`,
            500
        );
    }
}