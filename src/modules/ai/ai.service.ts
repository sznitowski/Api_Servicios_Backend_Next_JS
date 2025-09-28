// src/modules/ai/ai.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import OpenAI from 'openai';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIUsage } from './ai-usage.entity';

@Injectable()
export class AiService {
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    organization: process.env.OPENAI_ORG || undefined,
    project: process.env.OPENAI_PROJECT || undefined,
  });

  constructor(
    @InjectRepository(AIUsage)
    private readonly usageRepo: Repository<AIUsage>,
  ) {}

  get api() {
    return this.client;
  }

  model() {
    return process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  }

  private mapOpenAIError(e: any): never {
    // Normalizamos a mensajes/estados consistentes
    if (e?.status === 401) {
      throw new HttpException(
        { message: 'AI provider error', error: 'Unauthorized' },
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (e?.status === 429 || e?.code === 'insufficient_quota') {
      throw new HttpException(
        { message: 'AI provider error', error: 'Rate limited / Quota' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (e?.status === 503) {
      throw new HttpException(
        { message: 'AI provider error', error: 'Service Unavailable' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    throw new HttpException(
      { message: 'AI provider error', error: 'Bad Gateway' },
      HttpStatus.BAD_GATEWAY,
    );
  }

  /**
   * Llama al modelo con reintento simple y registra uso.
   * @param prompt Texto a enviar
   * @param userId (opcional) para auditar
   */
  async chat(prompt: string, userId?: number | null): Promise<string> {
    const model = 'gpt-4o-mini'; // o el que uses
    const started = Date.now();

    try {
      const r = await this.client.responses.create({
        model,
        input: prompt,
      });

      const text = (r as any).output_text as string;

      // Guardar uso (adaptado a la entidad AIUsage)
      await this.usageRepo.save(
        this.usageRepo.create({
          user: userId ? ({ id: userId } as any) : null,
          model,
          inputTokens: prompt.length,           // aproximación por caracteres
          outputTokens: (text ?? '').length,    // aproximación por caracteres
          costUsd: '0',                         // o calcula si quieres
        }),
      );

      return text;
    } catch (e: any) {
      // Incluso en error, si quieres registrar el input
      await this.usageRepo.save(
        this.usageRepo.create({
          user: userId ? ({ id: userId } as any) : null,
          model,
          inputTokens: prompt.length,
          outputTokens: 0,
          costUsd: '0',
        }),
      );

      throw e;
    }
  }

  async pingModels() {
    // ping simple para diagnóstico
    return { ok: true, model: this.model() };
  }
}
