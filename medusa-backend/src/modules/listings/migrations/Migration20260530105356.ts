import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260530105356 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "listing" ("id" text not null, "service_type" text not null, "poster_role" text not null, "poster_id" text not null, "poster_name" text not null, "poster_mobile" text null, "poster_email" text null, "title" text not null, "description" text null, "category" text null, "subcategory" text null, "locality" text null, "city" text not null default 'Rohtak', "state" text not null default 'Haryana', "pincode" text null, "lat" integer null, "lng" integer null, "price_min" integer null, "price_max" integer null, "price_unit" text null, "images" text null, "tags" text null, "attributes" text null, "status" text not null default 'active', "is_featured" boolean not null default false, "views_count" integer not null default 0, "responses_count" integer not null default 0, "expires_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "listing_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_listing_deleted_at" ON "listing" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "listing_response" ("id" text not null, "listing_id" text not null, "responder_id" text not null, "responder_name" text not null, "responder_mobile" text null, "responder_email" text null, "message" text null, "resume_url" text null, "attributes" text null, "status" text not null default 'pending', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "listing_response_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_listing_response_deleted_at" ON "listing_response" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "listing" cascade;`);

    this.addSql(`drop table if exists "listing_response" cascade;`);
  }

}
