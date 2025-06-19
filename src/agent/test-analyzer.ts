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

import { getMainTraceFile } from './tools';

const tools = [getMainTraceFile];
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

    const finalState = await graph.invoke(
        {
            messages: [
                new HumanMessage({
                    content: `You are a debugging assistant for Playwright tests.

Analyze the contents of Playwright trace files and identify the cause of the test failure.

**Important:** Return only a raw, parsable JSON string — without markdown, backticks, escape sequences, or commentary. The output must be exactly like this format:

{
  "summary": "...",
  "failedStep": "...",
  "errorReason": "...",
  "suggestions": "..."
}

Do not include \` characters, \\\\n, or any extra explanation.

Main trace file key: "traces/${traceFileId}/test.txt"`
                })
            ],
        },
        { recursionLimit: 10, configurable: { thread_id: traceFileId } }
    );

    return finalState.messages[finalState.messages.length - 1].content;
}