import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

type DbRequestRow = {
  id: number;
  title: string | null;
  priceOffered: number | null;
  priceAgreed: number | null;
  clientId: number;
  providerId: number | null;
  clientEmail: string | null;
};

function safeJson(v: any) {
  try { return JSON.stringify(v); }
  catch {
    try { return JSON.stringify({ error: 'circular', preview: String(v) }); }
    catch { return 'null'; }
  }
}

@Injectable()
export class PaymentsService {
  private mp: MercadoPagoConfig;

  constructor(
    private readonly config: ConfigService,
    private readonly ds: DataSource,
  ) {
    const token = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN no definido');
    this.mp = new MercadoPagoConfig({ accessToken: token });
  }

  /** Crea preferencia e inicia pago */
  async createIntent(requestId: number) {
    const req = await this.getRequestById(requestId);
    if (!req) throw new Error('Request no encontrado');

    const amount = Number(req.priceAgreed ?? req.priceOffered ?? 0);
    if (!amount || amount <= 0) throw new Error('Monto inválido');

    const frontUrl = this.config.get('APP_URL') ?? 'http://localhost:3000';
    const webhookSecret = this.config.get('MP_WEBHOOK_SECRET') ?? '';
    const backUrl = this.config.get('BACKEND_URL') ?? frontUrl;
    const notificationUrl = `${backUrl}/api/payments/webhook?secret=${webhookSecret}`;

    const mpFake = (this.config.get<string>('MP_FAKE') ?? '') === '1';

    // 1) Crear preferencia (real o fake)
    let pref: any;
    if (mpFake) {
      const now = Date.now();
      pref = {
        id: `FAKE-pref-${now}`,
        init_point: `${frontUrl}/fake-checkout?pref=${now}`,
        sandbox_init_point: `${frontUrl}/fake-checkout?pref=${now}&env=sandbox`,
      };
    } else {
      try {
        pref = await new Preference(this.mp).create({
          body: {
            items: [
              {
                id: `req-${requestId}`,
                title: req.title ?? `Pedido #${requestId}`,
                unit_price: amount,
                quantity: 1,
                currency_id: 'ARS',
              },
            ],
            back_urls: {
              success: `${frontUrl}/requests/${requestId}?pay=success`,
              failure: `${frontUrl}/requests/${requestId}?pay=failure`,
              pending: `${frontUrl}/requests/${requestId}?pay=pending`,
            },
            auto_return: 'approved',
            notification_url: notificationUrl,
            payer: { email: req.clientEmail ?? undefined },
            metadata: { requestId },
            external_reference: String(requestId),
          },
        });
      } catch (e: any) {
        const status = e?.status || e?.cause?.[0]?.code || e?.name;
        const msg = e?.message || e?.cause?.[0]?.description || e?.error;
        // eslint-disable-next-line no-console
        console.error('MP Preference.create FAILED:', { status, msg, raw: e });
        throw e;
      }
    }

    // 2) Persistencia (NO debe romper la respuesta del endpoint)
    try {
      // 2.a) Insertar intento PENDING
      await this.insertPendingPayment({
        requestId,
        payerId: req.clientId,
        payeeId: req.providerId ?? null,
        prefId: String(pref.id),
        amount,
        title: req.title ?? `Pedido #${requestId}`,
        currency: 'ARS',
      });

      // 2.b) En FAKE aprobamos en caliente, pero si falla NO se relanza
      if (mpFake) {
        const fakePayId = `FAKE-pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        try {
          // eslint-disable-next-line no-console
          console.log('[payments] FAKE approving last row for request', requestId, 'as', fakePayId);
          await this.markPaymentApproved(requestId, {
            externalPaymentId: fakePayId,
            feeAmount: 0,
            netAmount: amount,
            raw: { fake: true, note: 'MP_FAKE=1' },
          });
        } catch (e: any) {
          // eslint-disable-next-line no-console
          console.warn('[payments] FAKE approve failed, leaving as PENDING:', e?.code || e?.name, e?.message);
        }
      }
    } catch (e: any) {
      // Cualquier error de DB se loguea pero NO se corta el flujo HTTP
      // eslint-disable-next-line no-console
      console.warn('[payments] post-preference persistence failed:', e?.code || e?.name, e?.message);
    }

    // 3) Siempre devolvemos la preferencia al caller
    return {
      id: pref.id,
      init_point: (pref as any).init_point,
      sandbox_init_point: (pref as any).sandbox_init_point,
    };
  }

  /** Procesa un pago desde el Webhook (id de pago de MP) */
  async processWebhookPayment(paymentId: string) {
    const p = await new Payment(this.mp).get({ id: paymentId });
    const requestId = Number(p.metadata?.requestId || p.external_reference);
    if (!requestId) return;

    const status = p.status; // approved | pending | rejected | in_process | refunded | cancelled
    if (status === 'approved') {
      await this.markPaymentApproved(requestId, {
        externalPaymentId: String(p.id),
        feeAmount:
          (Array.isArray((p as any).fee_details) && (p as any).fee_details[0]?.amount) ??
          (Array.isArray((p as any).charges_details) && (p as any).charges_details[0]?.amount) ??
          null,
        netAmount: (p as any).transaction_details?.net_received_amount ?? null,
        raw: p,
      });
    } else if (status === 'pending' || status === 'in_process') {
      await this.markPaymentInProcess(requestId, { raw: p, paymentId: String(p.id) });
    } else {
      await this.markPaymentFailed(requestId, { status, raw: p, paymentId: String(p.id) });
    }
  }

  /* ===================== Helpers DB (SQL crudo) ===================== */

  private async getRequestById(id: number): Promise<DbRequestRow | null> {
    const [row] = await this.ds.query(
      `SELECT sr.id,
              sr.title,
              sr.price_offered   AS priceOffered,
              sr.price_agreed    AS priceAgreed,
              sr.client_id       AS clientId,
              sr.provider_id     AS providerId,
              u.email            AS clientEmail
         FROM service_requests sr
    LEFT JOIN users u ON u.id = sr.client_id
        WHERE sr.id = ? LIMIT 1`,
      [id],
    );
    return (row as DbRequestRow) ?? null;
  }

  private async insertPendingPayment(args: {
    requestId: number;
    payerId: number;
    payeeId: number | null;
    prefId: string;
    amount: number;
    title: string;
    currency: string;
  }) {
    await this.ds.query(
      `INSERT INTO request_payments
         (request_id, payer_id, payee_id, provider, method, intent_id, status, amount, currency, description, created_at, updated_at)
       VALUES
         (?, ?, ?, 'MP', 'card', ?, 'PENDING', ?, ?, ?, NOW(), NOW())`,
      [
        args.requestId,
        args.payerId,
        args.payeeId,
        args.prefId,
        args.amount,
        args.currency,
        args.title,
      ],
    );
    await this.tryUpdateRequestPaymentStatus(args.requestId, 'PENDING');
  }

  /** Última fila de pagos del request */
  private async getLastPaymentRowId(requestId: number): Promise<number | null> {
    const [row] = await this.ds.query(
      `SELECT id
         FROM request_payments
        WHERE provider='MP' AND request_id=?
        ORDER BY id DESC
        LIMIT 1`,
      [requestId],
    );
    return row?.id ?? null;
  }

  private async markPaymentInProcess(
    requestId: number,
    data: { raw: any; paymentId?: string },
  ) {
    const lastId = await this.getLastPaymentRowId(requestId);
    if (!lastId) return;

    await this.ds.query(
      `UPDATE request_payments
          SET status='IN_PROCESS',
              raw=?,
              updated_at=NOW()
        WHERE id=?`,
      [safeJson(data.raw), lastId],
    );

    await this.tryUpdateRequestPaymentStatus(requestId, 'PENDING');
  }

  private async markPaymentApproved(
    requestId: number,
    data: { externalPaymentId: string; feeAmount?: number | null; netAmount?: number | null; raw: any },
  ) {
    const lastId = await this.getLastPaymentRowId(requestId);
    if (!lastId) return;

    const doUpdate = async (externalId: string) => {
      await this.ds.query(
        `UPDATE request_payments
            SET status='APPROVED',
                external_payment_id=?,
                fee_amount=?,
                net_amount=?,
                approved_at=NOW(),
                raw=?,
                updated_at=NOW()
          WHERE id=?`,
        [
          externalId,
          data.feeAmount ?? null,
          data.netAmount ?? null,
          safeJson(data.raw),
          lastId,
        ],
      );
    };

    try {
      await doUpdate(data.externalPaymentId);
    } catch (e: any) {
      if (e?.code === 'ER_DUP_ENTRY' || e?.errno === 1062) {
        const altId = `${data.externalPaymentId}-${Math.random().toString(36).slice(2, 6)}`;
        await doUpdate(altId);
      } else {
        throw e;
      }
    }

    await this.tryUpdateRequestPaymentStatus(requestId, 'APPROVED');
  }

  private async markPaymentFailed(
    requestId: number,
    data: { status?: string; raw: any; paymentId?: string },
  ) {
    const lastId = await this.getLastPaymentRowId(requestId);
    if (!lastId) return;

    const status =
      (data.status ?? '').toUpperCase() === 'CANCELLED' ? 'CANCELLED' : 'REJECTED';

    await this.ds.query(
      `UPDATE request_payments
          SET status=?,
              raw=?,
              updated_at=NOW()
        WHERE id=?`,
      [status, safeJson(data.raw), lastId],
    );

    await this.tryUpdateRequestPaymentStatus(requestId, status);
  }

  async listPaymentsByRequest(requestId: number) {
    return this.ds.query(
      `SELECT id, provider, method, status, amount, currency,
              approved_at, created_at, external_payment_id, intent_id
         FROM request_payments
        WHERE request_id=?
        ORDER BY id DESC`,
      [requestId],
    );
  }

  /** Update del agregado; si la columna no existe, ignora el error */
  private async tryUpdateRequestPaymentStatus(requestId: number, status: string) {
    try {
      await this.ds.query(
        `UPDATE service_requests SET payment_status=? WHERE id=?`,
        [status, requestId],
      );
    } catch (e: any) {
      if (e?.code === 'ER_BAD_FIELD_ERROR' || e?.errno === 1054) {
        console.warn('[payments] service_requests.payment_status no existe; se omite UPDATE');
        return;
      }
      throw e;
    }
  }
}
