import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1757900173293 implements MigrationInterface {
    name = 'Init1757900173293'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NOT NULL, \`name\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`refresh_token_hash\` varchar(255) NULL, \`role\` enum ('CLIENT', 'PROVIDER', 'ADMIN') NOT NULL DEFAULT 'CLIENT', \`active\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`categories\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`description\` text NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_8b0be371d28245da6e4f4b6187\` (\`name\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`service_types\` (\`id\` int NOT NULL AUTO_INCREMENT, \`name\` varchar(255) NOT NULL, \`active\` tinyint NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`category_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`service_requests\` (\`id\` int NOT NULL AUTO_INCREMENT, \`status\` enum ('PENDING', 'OFFERED', 'ACCEPTED', 'IN_PROGRESS', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'PENDING', \`title\` varchar(255) NULL, \`description\` text NULL, \`address\` varchar(255) NULL, \`lat\` double NULL, \`lng\` double NULL, \`scheduledAt\` datetime NULL, \`priceOffered\` decimal(10,2) NULL, \`priceAgreed\` decimal(10,2) NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`client_id\` int NULL, \`provider_id\` int NULL, \`service_type_id\` int NULL, INDEX \`IDX_1e810e93472038c6040e7c21f0\` (\`scheduledAt\`), INDEX \`IDX_f2bd4166e2e8f5804d7c459bc9\` (\`provider_id\`), INDEX \`IDX_0f0523ef455e70bfe9a330342c\` (\`client_id\`), INDEX \`IDX_80d4e9cce72ad92b06085b69b5\` (\`status\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`user_addresses\` (\`id\` int NOT NULL AUTO_INCREMENT, \`label\` varchar(60) NULL, \`address\` varchar(200) NOT NULL, \`lat\` decimal(10,6) NULL, \`lng\` decimal(10,6) NULL, \`is_default\` tinyint NOT NULL DEFAULT 0, \`notes\` varchar(200) NULL, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`user_id\` int NOT NULL, INDEX \`IDX_7a5100ce0548ef27a6f1533a5c\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`request_ratings\` (\`id\` int NOT NULL AUTO_INCREMENT, \`score\` int NOT NULL, \`comment\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`request_id\` int NULL, \`rater_id\` int NULL, \`ratee_id\` int NULL, UNIQUE INDEX \`REL_97706f18832522dce7237e328d\` (\`request_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`request_transitions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`fromStatus\` varchar(32) NOT NULL, \`toStatus\` varchar(32) NOT NULL, \`priceOffered\` decimal(10,2) NULL, \`priceAgreed\` decimal(10,2) NULL, \`notes\` text NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`request_id\` int NULL, \`actor_user_id\` int NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`provider_profiles\` (\`id\` int NOT NULL AUTO_INCREMENT, \`displayName\` varchar(120) NULL, \`phone\` varchar(32) NULL, \`photoUrl\` varchar(512) NULL, \`bio\` text NULL, \`ratingAvg\` decimal(3,2) NOT NULL DEFAULT '0.00', \`ratingCount\` int NOT NULL DEFAULT '0', \`verified\` tinyint(1) NOT NULL DEFAULT 0, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`user_id\` int NULL, UNIQUE INDEX \`REL_5d1880ed16ff13ea6fd9bca019\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`provider_service_types\` (\`id\` int NOT NULL AUTO_INCREMENT, \`basePrice\` decimal(10,2) NULL, \`active\` tinyint(1) NOT NULL DEFAULT 1, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`provider_id\` int NULL, \`service_type_id\` int NULL, UNIQUE INDEX \`IDX_28c49740eb14ad6896c1d2fd18\` (\`provider_id\`, \`service_type_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`service_type_translations\` (\`service_type_id\` int NOT NULL, \`locale\` varchar(8) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` text NULL, UNIQUE INDEX \`IDX_2840c9f1e375aa3910b3889de6\` (\`service_type_id\`, \`locale\`), PRIMARY KEY (\`service_type_id\`, \`locale\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`category_translations\` (\`category_id\` int NOT NULL, \`locale\` varchar(8) NOT NULL, \`name\` varchar(255) NOT NULL, \`description\` text NULL, UNIQUE INDEX \`IDX_0e9b8be8a7526b1726dfb8f83e\` (\`category_id\`, \`locale\`), PRIMARY KEY (\`category_id\`, \`locale\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`service_types\` ADD CONSTRAINT \`FK_c3f5113950eef9654b8fcb13f9e\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`service_requests\` ADD CONSTRAINT \`FK_0f0523ef455e70bfe9a330342cc\` FOREIGN KEY (\`client_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`service_requests\` ADD CONSTRAINT \`FK_f2bd4166e2e8f5804d7c459bc98\` FOREIGN KEY (\`provider_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`service_requests\` ADD CONSTRAINT \`FK_e0b22dfd82074364f7cf39de64d\` FOREIGN KEY (\`service_type_id\`) REFERENCES \`service_types\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`user_addresses\` ADD CONSTRAINT \`FK_7a5100ce0548ef27a6f1533a5ce\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`request_ratings\` ADD CONSTRAINT \`FK_97706f18832522dce7237e328d9\` FOREIGN KEY (\`request_id\`) REFERENCES \`service_requests\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`request_ratings\` ADD CONSTRAINT \`FK_1841daeb3df2fa83859f709e9ec\` FOREIGN KEY (\`rater_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`request_ratings\` ADD CONSTRAINT \`FK_ad48f8ba914ae25b4cb47e35953\` FOREIGN KEY (\`ratee_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`request_transitions\` ADD CONSTRAINT \`FK_efa1c701c5095b33dc3285391af\` FOREIGN KEY (\`request_id\`) REFERENCES \`service_requests\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`request_transitions\` ADD CONSTRAINT \`FK_f9823e23818b546e9da9dda7981\` FOREIGN KEY (\`actor_user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`provider_profiles\` ADD CONSTRAINT \`FK_5d1880ed16ff13ea6fd9bca019d\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`provider_service_types\` ADD CONSTRAINT \`FK_89bc42146354a428c725f56f0ba\` FOREIGN KEY (\`provider_id\`) REFERENCES \`provider_profiles\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`provider_service_types\` ADD CONSTRAINT \`FK_da688d4afeed104eece4be89083\` FOREIGN KEY (\`service_type_id\`) REFERENCES \`service_types\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`service_type_translations\` ADD CONSTRAINT \`FK_a9dd3213905e5008cec841f2da6\` FOREIGN KEY (\`service_type_id\`) REFERENCES \`service_types\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`category_translations\` ADD CONSTRAINT \`FK_87902f79e775e1c1b0082201d7e\` FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`category_translations\` DROP FOREIGN KEY \`FK_87902f79e775e1c1b0082201d7e\``);
        await queryRunner.query(`ALTER TABLE \`service_type_translations\` DROP FOREIGN KEY \`FK_a9dd3213905e5008cec841f2da6\``);
        await queryRunner.query(`ALTER TABLE \`provider_service_types\` DROP FOREIGN KEY \`FK_da688d4afeed104eece4be89083\``);
        await queryRunner.query(`ALTER TABLE \`provider_service_types\` DROP FOREIGN KEY \`FK_89bc42146354a428c725f56f0ba\``);
        await queryRunner.query(`ALTER TABLE \`provider_profiles\` DROP FOREIGN KEY \`FK_5d1880ed16ff13ea6fd9bca019d\``);
        await queryRunner.query(`ALTER TABLE \`request_transitions\` DROP FOREIGN KEY \`FK_f9823e23818b546e9da9dda7981\``);
        await queryRunner.query(`ALTER TABLE \`request_transitions\` DROP FOREIGN KEY \`FK_efa1c701c5095b33dc3285391af\``);
        await queryRunner.query(`ALTER TABLE \`request_ratings\` DROP FOREIGN KEY \`FK_ad48f8ba914ae25b4cb47e35953\``);
        await queryRunner.query(`ALTER TABLE \`request_ratings\` DROP FOREIGN KEY \`FK_1841daeb3df2fa83859f709e9ec\``);
        await queryRunner.query(`ALTER TABLE \`request_ratings\` DROP FOREIGN KEY \`FK_97706f18832522dce7237e328d9\``);
        await queryRunner.query(`ALTER TABLE \`user_addresses\` DROP FOREIGN KEY \`FK_7a5100ce0548ef27a6f1533a5ce\``);
        await queryRunner.query(`ALTER TABLE \`service_requests\` DROP FOREIGN KEY \`FK_e0b22dfd82074364f7cf39de64d\``);
        await queryRunner.query(`ALTER TABLE \`service_requests\` DROP FOREIGN KEY \`FK_f2bd4166e2e8f5804d7c459bc98\``);
        await queryRunner.query(`ALTER TABLE \`service_requests\` DROP FOREIGN KEY \`FK_0f0523ef455e70bfe9a330342cc\``);
        await queryRunner.query(`ALTER TABLE \`service_types\` DROP FOREIGN KEY \`FK_c3f5113950eef9654b8fcb13f9e\``);
        await queryRunner.query(`DROP INDEX \`IDX_0e9b8be8a7526b1726dfb8f83e\` ON \`category_translations\``);
        await queryRunner.query(`DROP TABLE \`category_translations\``);
        await queryRunner.query(`DROP INDEX \`IDX_2840c9f1e375aa3910b3889de6\` ON \`service_type_translations\``);
        await queryRunner.query(`DROP TABLE \`service_type_translations\``);
        await queryRunner.query(`DROP INDEX \`IDX_28c49740eb14ad6896c1d2fd18\` ON \`provider_service_types\``);
        await queryRunner.query(`DROP TABLE \`provider_service_types\``);
        await queryRunner.query(`DROP INDEX \`REL_5d1880ed16ff13ea6fd9bca019\` ON \`provider_profiles\``);
        await queryRunner.query(`DROP TABLE \`provider_profiles\``);
        await queryRunner.query(`DROP TABLE \`request_transitions\``);
        await queryRunner.query(`DROP INDEX \`REL_97706f18832522dce7237e328d\` ON \`request_ratings\``);
        await queryRunner.query(`DROP TABLE \`request_ratings\``);
        await queryRunner.query(`DROP INDEX \`IDX_7a5100ce0548ef27a6f1533a5c\` ON \`user_addresses\``);
        await queryRunner.query(`DROP TABLE \`user_addresses\``);
        await queryRunner.query(`DROP INDEX \`IDX_80d4e9cce72ad92b06085b69b5\` ON \`service_requests\``);
        await queryRunner.query(`DROP INDEX \`IDX_0f0523ef455e70bfe9a330342c\` ON \`service_requests\``);
        await queryRunner.query(`DROP INDEX \`IDX_f2bd4166e2e8f5804d7c459bc9\` ON \`service_requests\``);
        await queryRunner.query(`DROP INDEX \`IDX_1e810e93472038c6040e7c21f0\` ON \`service_requests\``);
        await queryRunner.query(`DROP TABLE \`service_requests\``);
        await queryRunner.query(`DROP TABLE \`service_types\``);
        await queryRunner.query(`DROP INDEX \`IDX_8b0be371d28245da6e4f4b6187\` ON \`categories\``);
        await queryRunner.query(`DROP TABLE \`categories\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
    }

}
