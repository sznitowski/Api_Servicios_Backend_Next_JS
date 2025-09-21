import { MigrationInterface, QueryRunner } from "typeorm";

export class Init1758464378476 implements MigrationInterface {
    name = 'Init1758464378476'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`request_messages\` DROP FOREIGN KEY \`fk_msg_request\``);
        await queryRunner.query(`ALTER TABLE \`request_messages\` DROP FOREIGN KEY \`fk_msg_sender\``);
        await queryRunner.query(`ALTER TABLE \`request_messages\` ADD CONSTRAINT \`FK_41626149ddfb759408a1c66ed30\` FOREIGN KEY (\`request_id\`) REFERENCES \`service_requests\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`request_messages\` ADD CONSTRAINT \`FK_c91ecebab758b8604e5401cbd98\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_9a8a82462cab47c73d25f49261f\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_405532c368aba2c29129e583830\` FOREIGN KEY (\`request_id\`) REFERENCES \`service_requests\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`notifications\` ADD CONSTRAINT \`FK_f542150e3254230ddde7215da08\` FOREIGN KEY (\`transition_id\`) REFERENCES \`request_transitions\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_f542150e3254230ddde7215da08\``);
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_405532c368aba2c29129e583830\``);
        await queryRunner.query(`ALTER TABLE \`notifications\` DROP FOREIGN KEY \`FK_9a8a82462cab47c73d25f49261f\``);
        await queryRunner.query(`ALTER TABLE \`request_messages\` DROP FOREIGN KEY \`FK_c91ecebab758b8604e5401cbd98\``);
        await queryRunner.query(`ALTER TABLE \`request_messages\` DROP FOREIGN KEY \`FK_41626149ddfb759408a1c66ed30\``);
        await queryRunner.query(`ALTER TABLE \`request_messages\` ADD CONSTRAINT \`fk_msg_sender\` FOREIGN KEY (\`sender_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`request_messages\` ADD CONSTRAINT \`fk_msg_request\` FOREIGN KEY (\`request_id\`) REFERENCES \`service_requests\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
