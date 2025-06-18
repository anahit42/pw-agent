import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from "@langchain/openai";
import {
    StateGraph,
    MemorySaver,
    MessagesAnnotation,
    END,
    START
} from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import {
    ChatPromptTemplate,
    MessagesPlaceholder,
} from "@langchain/core/prompts";

import { config } from '../config';
import { logger } from '../utils/logger';

import { unzipTraceFile } from './tools';

const tools = [unzipTraceFile];
const toolNode = new ToolNode(tools);
const checkpointer = new MemorySaver();

const modelWithTools = new ChatOpenAI({
    model: config.openai.model,
    temperature: config.openai.temperature,
}).bindTools(tools);

function shouldContinue (state: typeof MessagesAnnotation.State) {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1];

    if ("tool_calls" in lastMessage && Array.isArray(lastMessage.tool_calls) && lastMessage.tool_calls?.length) {
        logger.info('Continue tool calls');
        return "tools";
    }

    logger.info('Exiting graph');
    return END;
}

async function callModel (state: typeof MessagesAnnotation.State) {
    const prompt = ChatPromptTemplate.fromMessages([
        [
            "system",
            `You are a helpful AI assistant, collaborating with other assistants. Use the provided tools to progress towards answering the question. If you are unable to fully answer, that's OK, another assistant with different tools will help where you left off. Execute what you can to make progress. If you or any of the other assistants have the final answer or deliverable, prefix your response with FINAL ANSWER so the team knows to stop. You have access to the following tools: {tool_names}.\n{system_message}\nCurrent time: {time}.`,
        ],
        new MessagesPlaceholder("messages"),
    ]);

    const formattedPrompt = await prompt.formatMessages({
        system_message: "You are helpful PW analyzer agent.",
        time: new Date().toISOString(),
        tool_names: tools.map((tool) => tool.name).join(", "),
        messages: state.messages,
    });

    const result = await modelWithTools.invoke(formattedPrompt);

    return { messages: [result] };
}

const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

const graph = workflow.compile({ checkpointer });

function extractUuid(filePath: string): string | null {
    const match = filePath.match(/traces\/([0-9a-fA-F-]{36})\//);
    return match ? match[1] : null;
}

export async function analyzeTraceFile(filePath: string) {
    const threadId = extractUuid(filePath);
    logger.info(`Analyze Trace File: ${filePath}, Thread: ${threadId}`);

    const finalState = await graph.invoke(
        {
            messages: [new HumanMessage(`Analyze Playwright trace file located in ${filePath}. Download it and unzip`)],
        },
        { recursionLimit: 10, configurable: { thread_id: threadId } }
    );

    return finalState.messages[finalState.messages.length - 1].content;
}