import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260530134004 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "listing" alter column "poster_id" type text using ("poster_id"::text);`);
    this.addSql(`alter table if exists "listing" alter column "poster_id" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "listing" alter column "poster_id" type text using ("poster_id"::text);`);
    this.addSql(`alter table if exists "listing" alter column "poster_id" set not null;`);
  }

}
