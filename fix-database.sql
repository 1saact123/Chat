-- Script para limpiar las tablas problemáticas
-- Ejecutar en MySQL para resolver el error "Too many keys specified"

-- Eliminar tablas problemáticas
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `webhook_stats`;
DROP TABLE IF EXISTS `service_configurations`;
DROP TABLE IF EXISTS `chat_messages`;
DROP TABLE IF EXISTS `chat_threads`;

-- Recrear tablas con estructura limpia
CREATE TABLE `chat_threads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thread_id` varchar(255) NOT NULL,
  `openai_thread_id` varchar(255),
  `jira_issue_key` varchar(50),
  `service_id` varchar(100),
  `last_activity` datetime,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `thread_id` (`thread_id`)
);

CREATE TABLE `chat_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `thread_id` varchar(255) NOT NULL,
  `role` enum('user','assistant') NOT NULL,
  `content` text NOT NULL,
  `timestamp` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `thread_id` (`thread_id`),
  FOREIGN KEY (`thread_id`) REFERENCES `chat_threads` (`thread_id`) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE `service_configurations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `service_id` varchar(100) NOT NULL,
  `service_name` varchar(255) NOT NULL,
  `assistant_id` varchar(255) NOT NULL,
  `assistant_name` varchar(255) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `last_updated` datetime,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `service_id` (`service_id`)
);

CREATE TABLE `webhook_stats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `total_webhooks` int NOT NULL DEFAULT 0,
  `successful_responses` int NOT NULL DEFAULT 0,
  `failed_responses` int NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `date` (`date`)
);

CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
);
