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
  async chat(prompt: string, userId?: number | null) {
    const started = Date.now();
    const model = this.model();
    const promptChars = (prompt ?? '').length;

    // ---- Retry / backoff (tu bloque) ----
    for (let i = 0; i < 2; i++) {
      try {
        const r = await this.client.responses.create({
          model,
          input: prompt,
        });

        const text = (r as any).output_text as string;
        // Log OK
        await this.usageRepo.save(
          this.usageRepo.create({
            user: userId ? ({ id: userId } as any) : null,
            model,
            promptChars,
            responseChars: (text ?? '').length,
            status: 'ok',
            latencyMs: Date.now() - started,
          }),
        );
        return text;
      } catch (e: any) {
        // 429 => un intento más
        if ((e?.status === 429 || e?.code === 'insufficient_quota') && i < 1) {
          await new Promise((res) => setTimeout(res, 1500));
          continue;
        }
        // Log ERROR y propagar normalizado
        await this.usageRepo.save(
          this.usageRepo.create({
            user: userId ? ({ id: userId } as any) : null,
            model,
            promptChars,
            responseChars: 0,
            status: 'error',
            latencyMs: Date.now() - started,
          }),
        );
        this.mapOpenAIError(e);
      }
    }

    // Si por alguna razón cae acá:
    throw new HttpException(
      { message: 'AI provider error', error: 'Unknown' },
      HttpStatus.BAD_GATEWAY,
    );
  }

  async pingModels() {
    // ping simple para diagnóstico
    return { ok: true, model: this.model() };
  }
}
