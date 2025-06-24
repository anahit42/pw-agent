import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

import { config } from '../config';
import { AppError } from '../utils/custom-errors';

export function getModelWithTools(tools: any[]) {
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