// src/modules/ai/ai.service.ts
import {
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly client: OpenAI;

  constructor() {
    // Lee la API key del entorno (.env.dev / .env.docker)
    // Si no está definida, el SDK fallará al primer uso.
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /** Modelo por defecto configurable por env */
  model() {
    return process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  }

  /** Llamada simple con retry para 429 (rate limit / cuota) */
  async chat(prompt: string): Promise<{ text: string }> {
    for (let i = 0; i < 2; i++) {
      try {
        const r = await this.client.responses.create({
          model: this.model(),
          input: prompt,
        });
        // En el SDK v4, el texto directo viene como `output_text`
        return { text: (r as any).output_text ?? '' };
      } catch (e: any) {
        // Reintento simple ante 429 (rate limit / insuficient_quota transitorio)
        if (e?.status === 429 && i < 1) {
          await new Promise((res) => setTimeout(res, 1500));
          continue;
        }
        if (e?.status === 401) {
          throw new UnauthorizedException('OpenAI API key rechazada.');
        }
        if (e?.status === 503) {
          throw new ServiceUnavailableException('AI provider error');
        }
        // Propaga otros errores para que Nest los serialice
        throw e;
      }
    }
    throw new ServiceUnavailableException('AI provider error');
  }

  /** Mini “analizador” para logs/errores */
  async diagnose(text: string) {
    const prompt =
      `Sos un asistente técnico. Dado este log/mensaje, devolvé 3 bullets: ` +
      `(1) hipótesis del problema, (2) pasos para verificar, (3) fix sugerido.\n\n` +
      text;
    return this.chat(prompt);
  }
}
