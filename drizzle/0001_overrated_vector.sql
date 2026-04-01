CREATE TABLE `summary_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`inputText` text NOT NULL,
	`outputType` enum('summary','bullets','rewrite') NOT NULL,
	`outputLength` enum('short','medium') NOT NULL DEFAULT 'medium',
	`outputTone` enum('formal','casual') NOT NULL DEFAULT 'formal',
	`rewriteStyle` enum('eli5','formal'),
	`result` text NOT NULL,
	`charCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `summary_history_id` PRIMARY KEY(`id`)
);
