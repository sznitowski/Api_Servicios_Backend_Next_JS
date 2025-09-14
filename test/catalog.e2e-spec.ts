import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppTestingModule } from '../src/app.testing.module';
import { Category } from '../src/modules/catalog/categories/category.entity';
import { ServiceType } from '../src/modules/catalog/service-types/service-type.entity';
import supertest from 'supertest';

describe('Catalog (e2e)', () => {
    let app: INestApplication;
    let http: supertest.SuperTest<supertest.Test>;

    let cats: Repository<Category>;
    let types: Repository<ServiceType>;

    beforeAll(async () => {
        const mod = await Test.createTestingModule({
            imports: [AppTestingModule],
        }).compile();

        app = mod.createNestApplication();
        await app.init();
        http = supertest(app.getHttpServer());

        cats = mod.get(getRepositoryToken(Category));
        types = mod.get(getRepositoryToken(ServiceType));

        // seed mínimo
        const cat = await cats.save(cats.create({ name: 'Hogar', active: true }));
        await types.save(
            types.create({ name: 'Plomería', active: true, category: cat }),
        );
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /catalog/categories -> 200 y trae categorías con serviceTypes', async () => {
        const res = await http.get('/catalog/categories').expect(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThanOrEqual(1);
        const hogar = res.body.find((c: any) => c.name === 'Hogar');
        expect(hogar).toBeTruthy();
        expect(Array.isArray(hogar.serviceTypes)).toBe(true);
        expect(hogar.serviceTypes.some((t: any) => t.name === 'Plomería')).toBe(true);
    });

    it('GET /catalog/service-types?q=plo -> 200 y filtra por nombre (ILIKE)', async () => {
        const res = await http.get('/catalog/service-types?q=plo').expect(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some((t: any) => t.name === 'Plomería')).toBe(true);
    });

    it('GET /catalog/service-types?categoryId=... -> 200 y filtra por categoría', async () => {
        const cat = await cats.findOneByOrFail({ name: 'Hogar' });
        const res = await http
            .get(`/catalog/service-types?categoryId=${cat.id}`)
            .expect(200);
        expect(res.body.every((t: any) => t.category?.id === cat.id)).toBe(true);
    });
});
