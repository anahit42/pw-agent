import { ToolNode } from '@langchain/langgraph/prebuilt';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
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
import { playwrightDebugPrompt } from './prompts';

const tools = [getTraceFiles];
const toolNode = new ToolNode(tools);
const memory = new MemorySaver();

function getModelWithTools() {
    if (config.llmProvider === 'openai') {
        if (!config.openai.apiKey) {
            throw new AppError('OPENAI_API_KEY is required for OpenAI provider', 500);
        }

        return new ChatOpenAI({
            model: config.openai.model,
            temperature: config.openai.temperature,
            maxTokens: config.openai.maxTokens,
        }).bindTools(tools);
    } else if (config.llmProvider === 'anthropic') {
        if (!config.anthropic.apiKey) {
            throw new AppError('ANTHROPIC_API_KEY is required for Anthropic provider', 500);
        }

        return new ChatAnthropic({
            model: config.anthropic.model,
            temperature: config.anthropic.temperature,
            maxTokens: config.anthropic.maxTokens,
        }).bindTools(tools);
    } else {
        throw new AppError(`Unknown LLM provider: ${config.llmProvider}`, 500);
    }
}

const modelWithTools = getModelWithTools();

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
        const promptText = await playwrightDebugPrompt.format({ traceFileId });
        const finalState = await graph.invoke(
            {
                messages: [
                    new HumanMessage({
                        content: promptText
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