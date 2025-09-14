import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { AppTestingModule } from '../src/app.testing.module';
import { User, UserRole } from '../src/modules/users/user.entity';
import supertest from 'supertest';

describe('Providers (e2e)', () => {
    let app: INestApplication;
    let http: supertest.SuperTest<supertest.Test>;
    let users: Repository<User>;
    let token: string;

    const email = `prov_${Date.now()}@test.com`;
    const password = '123456';

    beforeAll(async () => {
        const mod = await Test.createTestingModule({
            imports: [AppTestingModule],
        }).compile();

        app = mod.createNestApplication();
        await app.init();
        http = supertest(app.getHttpServer());
        users = mod.get(getRepositoryToken(User));

        // seed: usuario proveedor
        const hash = await bcrypt.hash(password, 10);
        await users.save(
            users.create({
                email,
                name: 'Proveedor Test',
                password: hash,
                role: UserRole.PROVIDER,
                active: true,
            }),
        );

        // login
        const r = await http
            .post('/auth/login')
            .send({ email, password })
            .expect(200);
        token = r.body.access_token;
        expect(token).toBeDefined();
    });

    afterAll(async () => {
        await app.close();
    });

    const H = () => ({ Authorization: `Bearer ${token}` });

    it('GET /providers/me -> 200 (perfil del proveedor)', async () => {
        const res = await http.get('/providers/me').set(H()).expect(200);
        expect(res.body).toBeDefined();
        // si el servicio crea el profile on-demand, al menos debería devolver userId o algo similar
    });

    it('PATCH /providers/me -> 200 (actualiza perfil)', async () => {
        const res = await http
            .patch('/providers/me')
            .set(H())
            .send({ displayName: 'Prov Actualizado', lat: -34.6, lng: -58.4, radiusKm: 15 })
            .expect(200);

        expect(res.body.displayName).toBe('Prov Actualizado');
        expect(Number(res.body.lat)).toBeCloseTo(-34.6, 3);
        expect(Number(res.body.lng)).toBeCloseTo(-58.4, 3);
    });

    it('GET /providers/me/ratings -> 200 (paginado)', async () => {
        const res = await http.get('/providers/me/ratings?page=1&limit=5').set(H()).expect(200);
        // estructura mínima: items y meta
        expect(res.body).toBeDefined();
        // toleramos que aún no haya ratings
    });

    it('GET /providers/me/ratings/summary -> 200 (resumen)', async () => {
        const res = await http.get('/providers/me/ratings/summary').set(H()).expect(200);
        // debería traer al menos promedio y conteo por estrellas, o lo que devuelva tu servicio
        expect(res.body).toBeDefined();
    });
});
