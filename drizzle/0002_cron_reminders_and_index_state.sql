CREATE TABLE `expense_indexed` (
	`expense_id` text PRIMARY KEY NOT NULL,
	`indexed_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expense`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `reminder` (
	`group_id` text NOT NULL,
	`debtor_id` text NOT NULL,
	`creditor_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text NOT NULL,
	`owed_since` text NOT NULL,
	`checked_on` text NOT NULL,
	PRIMARY KEY(`group_id`, `debtor_id`, `creditor_id`),
	FOREIGN KEY (`group_id`) REFERENCES `group`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`debtor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`creditor_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "reminder_amount_positive" CHECK("reminder"."amount_cents" > 0),
	CONSTRAINT "reminder_distinct_parties" CHECK("reminder"."debtor_id" <> "reminder"."creditor_id")
);
--> statement-breakpoint
CREATE INDEX `reminder_debtor_idx` ON `reminder` (`debtor_id`);--> statement-breakpoint
-- Hand-added (ADR-0026 §3): every expense that exists before this migration had
-- its vectors written by the old path, so it counts as indexed. Without this, the
-- first cron run would re-embed all history. Idempotent: OR IGNORE.
INSERT OR IGNORE INTO `expense_indexed` (`expense_id`, `indexed_at`) SELECT `id`, `created_at` FROM `expense`;
