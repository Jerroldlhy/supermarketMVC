-- MySQL dump 10.13  Distrib 8.0.21, for Win64 (x86_64)
--
-- Host: localhost    Database: c372_supermarketdb
-- ------------------------------------------------------
-- Server version	8.0.21

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `cart`
--

DROP TABLE IF EXISTS `cart`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `cart_user_id_fk` (`user_id`),
  KEY `cart_product_id_fk` (`product_id`),
  CONSTRAINT `cart_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `cart_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart`
--

LOCK TABLES `cart` WRITE;
/*!40000 ALTER TABLE `cart` DISABLE KEYS */;
/*!40000 ALTER TABLE `cart` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fraud_events`
--

DROP TABLE IF EXISTS `fraud_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fraud_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `risk_score` int NOT NULL DEFAULT '0',
  `flags` varchar(255) DEFAULT NULL,
  `action` varchar(20) NOT NULL DEFAULT 'allow',
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fraud_events_user_id_idx` (`user_id`),
  CONSTRAINT `fraud_events_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fraud_events`
--

LOCK TABLES `fraud_events` WRITE;
/*!40000 ALTER TABLE `fraud_events` DISABLE KEYS */;
INSERT INTO `fraud_events` VALUES (1,1,70,'velocity','block','::1','2026-01-28 17:52:51'),(2,1,70,'velocity','block','::1','2026-01-28 17:54:01'),(3,1,70,'velocity','block','::1','2026-01-28 17:54:03'),(4,1,70,'velocity','block','::1','2026-01-28 17:54:05'),(5,7,40,'high_amount','review','::1','2026-01-28 18:10:37'),(6,1,0,'','allow','::1','2026-01-28 18:11:09'),(7,1,0,'','allow','::1','2026-01-28 18:11:35'),(8,7,40,'high_amount','review','::1','2026-01-28 18:12:30'),(9,1,0,'','allow','::1','2026-01-28 18:13:16'),(10,1,0,'','allow','::1','2026-01-28 18:14:59'),(11,1,0,'','allow','::1','2026-01-28 18:15:02'),(12,1,0,'','allow','::1','2026-01-28 18:15:03'),(13,1,0,'','allow','::1','2026-01-28 18:15:05'),(14,NULL,0,'','allow','::1','2026-01-28 18:21:06'),(15,9,0,'','allow','::1','2026-01-28 18:37:11'),(16,NULL,0,'','allow','::1','2026-01-28 19:01:45'),(17,2,0,'','allow','::1','2026-01-28 19:02:13');
/*!40000 ALTER TABLE `fraud_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `channel` varchar(20) COLLATE utf8mb4_general_ci NOT NULL,
  `destination` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payload` text COLLATE utf8mb4_general_ci,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'QUEUED',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `notifications_user_id_idx` (`user_id`),
  CONSTRAINT `notifications_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notifications`
--

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
INSERT INTO `notifications` VALUES (1,2,'email','mary@mary.com','{\"orderId\":52,\"status\":\"completed\",\"amount\":\"1.50\",\"message\":\"Payment completed for order #52.\"}','SENT','2026-01-27 23:48:10'),(2,2,'sms','12345678','{\"orderId\":52,\"status\":\"completed\",\"amount\":\"1.50\",\"message\":\"Order #52 payment completed.\"}','SENT','2026-01-27 23:48:10'),(3,2,'email','mary@mary.com','{\"orderId\":53,\"status\":\"completed\",\"amount\":\"1.50\",\"message\":\"Payment completed for order #53.\"}','SENT','2026-01-27 23:50:02'),(4,2,'sms','12345678','{\"orderId\":53,\"status\":\"completed\",\"amount\":\"1.50\",\"message\":\"Order #53 payment completed.\"}','SENT','2026-01-27 23:50:02'),(5,9,'email','b@b.com','{\"orderId\":54,\"status\":\"completed\",\"amount\":\"3.00\",\"message\":\"Payment completed for order #54.\"}','SENT','2026-01-28 13:52:54'),(6,9,'sms','12345678','{\"orderId\":54,\"status\":\"completed\",\"amount\":\"3.00\",\"message\":\"Order #54 payment completed.\"}','SENT','2026-01-28 13:52:54'),(7,2,'email','mary@mary.com','{\"orderId\":55,\"status\":\"completed\",\"amount\":\"8.00\",\"message\":\"Payment completed for order #55.\"}','SENT','2026-01-28 15:07:57'),(8,2,'sms','12345678','{\"orderId\":55,\"status\":\"completed\",\"amount\":\"8.00\",\"message\":\"Order #55 payment completed.\"}','SENT','2026-01-28 15:07:57'),(9,2,'email','mary@mary.com','{\"orderId\":56,\"status\":\"completed\",\"amount\":\"4.00\",\"message\":\"Payment completed for order #56.\"}','SENT','2026-01-28 15:33:52'),(10,2,'sms','12345678','{\"orderId\":56,\"status\":\"completed\",\"amount\":\"4.00\",\"message\":\"Order #56 payment completed.\"}','SENT','2026-01-28 15:33:52'),(11,2,'email','mary@mary.com','{\"orderId\":57,\"status\":\"completed\",\"amount\":\"3.50\",\"message\":\"Payment completed for order #57.\"}','SENT','2026-01-28 15:45:41'),(12,2,'sms','12345678','{\"orderId\":57,\"status\":\"completed\",\"amount\":\"3.50\",\"message\":\"Order #57 payment completed.\"}','SENT','2026-01-28 15:45:41'),(13,2,'email','mary@mary.com','{\"orderId\":58,\"status\":\"completed\",\"amount\":\"5.00\",\"message\":\"Hi Mary Tan,\\n\\nThanks for your purchase! Here is your invoice.\\nInvoice: INV-20260128-58\\nOrder ID: 58\\nDate: 28/01/2026, 16:00:46\\n\\nItems:\\n- Milk x1 @ $3.50 = $3.50\\n\\nSubtotal: $3.50\\nDelivery fee: $1.50\\nTotal: $5.00\\n\\nCurrency: SGD\\n\\nThank you for shopping with us!\",\"subject\":\"Invoice INV-20260128-58 - Supermarket App\",\"html\":\"\\n        <div style=\\\"font-family:Arial, sans-serif; color:#222;\\\">\\n            <h2 style=\\\"margin:0 0 8px;\\\">Supermarket App Invoice</h2>\\n            <p style=\\\"margin:0 0 16px;\\\">Hi Mary Tan,</p>\\n            <p style=\\\"margin:0 0 16px;\\\">Thanks for your purchase! Here is your invoice.</p>\\n            <table style=\\\"margin-bottom:16px;\\\">\\n                <tr><td><strong>Invoice</strong></td><td style=\\\"padding-left:8px;\\\">INV-20260128-58</td></tr>\\n                <tr><td><strong>Order ID</strong></td><td style=\\\"padding-left:8px;\\\">58</td></tr>\\n                <tr><td><strong>Date</strong></td><td style=\\\"padding-left:8px;\\\">28/01/2026, 16:00:46</td></tr>\\n                <tr><td><strong>Currency</strong></td><td style=\\\"padding-left:8px;\\\">SGD</td></tr>\\n            </table>\\n            <table style=\\\"width:100%; border-collapse:collapse; margin-bottom:16px;\\\">\\n                <thead>\\n                    <tr>\\n                        <th style=\\\"text-align:left; padding:8px; border-bottom:2px solid #333;\\\">Item</th>\\n                        <th style=\\\"text-align:center; padding:8px; border-bottom:2px solid #333;\\\">Qty</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Price</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Total</th>\\n                    </tr>\\n                </thead>\\n                <tbody>\\n                    \\n        <tr>\\n            <td style=\\\"padding:8px;border-bottom:1px solid #eee;\\\">Milk</td>\\n            <td style=\\\"paddi','SENT','2026-01-28 16:43:11'),(14,2,'sms','12345678','{\"orderId\":58,\"status\":\"completed\",\"amount\":\"5.00\",\"message\":\"Order #58 payment completed.\"}','SENT','2026-01-28 16:43:11'),(15,2,'email','mary@mary.com','{\"orderId\":59,\"status\":\"completed\",\"amount\":\"2.50\",\"message\":\"Hi Mary Tan,\\n\\nThanks for your purchase! Here is your invoice.\\nInvoice: INV-20260128-59\\nOrder ID: 59\\nDate: 28/01/2026, 17:11:50\\n\\nItems:\\n- fish x1 @ $1.00 = $1.00\\n\\nSubtotal: $1.00\\nDelivery fee: $1.50\\nTotal: $2.50\\n\\nCurrency: SGD\\n\\nThank you for shopping with us!\",\"subject\":\"Invoice INV-20260128-59 - Supermarket App\",\"html\":\"\\n        <div style=\\\"font-family:Arial, sans-serif; color:#222;\\\">\\n            <h2 style=\\\"margin:0 0 8px;\\\">Supermarket App Invoice</h2>\\n            <p style=\\\"margin:0 0 16px;\\\">Hi Mary Tan,</p>\\n            <p style=\\\"margin:0 0 16px;\\\">Thanks for your purchase! Here is your invoice.</p>\\n            <table style=\\\"margin-bottom:16px;\\\">\\n                <tr><td><strong>Invoice</strong></td><td style=\\\"padding-left:8px;\\\">INV-20260128-59</td></tr>\\n                <tr><td><strong>Order ID</strong></td><td style=\\\"padding-left:8px;\\\">59</td></tr>\\n                <tr><td><strong>Date</strong></td><td style=\\\"padding-left:8px;\\\">28/01/2026, 17:11:50</td></tr>\\n                <tr><td><strong>Currency</strong></td><td style=\\\"padding-left:8px;\\\">SGD</td></tr>\\n            </table>\\n            <table style=\\\"width:100%; border-collapse:collapse; margin-bottom:16px;\\\">\\n                <thead>\\n                    <tr>\\n                        <th style=\\\"text-align:left; padding:8px; border-bottom:2px solid #333;\\\">Item</th>\\n                        <th style=\\\"text-align:center; padding:8px; border-bottom:2px solid #333;\\\">Qty</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Price</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Total</th>\\n                    </tr>\\n                </thead>\\n                <tbody>\\n                    \\n        <tr>\\n            <td style=\\\"padding:8px;border-bottom:1px solid #eee;\\\">fish</td>\\n            <td style=\\\"paddi','SENT','2026-01-28 17:12:25'),(16,2,'sms','12345678','{\"orderId\":59,\"status\":\"completed\",\"amount\":\"2.50\",\"message\":\"Order #59 payment completed.\"}','SENT','2026-01-28 17:12:25'),(17,2,'email','mary@mary.com','{\"message\":\"Hi Mary Tan,\\n\\nYour refund has been processed. Here is your refund invoice.\\nInvoice: RF-8\\nRefund Amount: $2.50 SGD\\nRefund Status: COMPLETED\\nRefund Date: 28/01/2026, 17:16:46\\n\\nRefund Items:\\n- fish x1 @ $1.00 = $1.00\\n\\nOrder Total: $2.50\\nRefunded Total (to date): $2.50\\nRemaining Balance: $0.00\\n\\nThank you for shopping with us!\",\"subject\":\"Refund Invoice RF-8 - Supermarket App\",\"html\":\"<!DOCTYPE html>\\n<html lang=\\\"en\\\">\\n<head>\\n  <meta charset=\\\"UTF-8\\\">\\n  <title>Refund Invoice</title>\\n</head>\\n<body style=\\\"margin:0; padding:0; background:#f6f7fb; font-family:Segoe UI, Arial, sans-serif; color:#0f172a;\\\">\\n  <table width=\\\"100%\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" style=\\\"background:#f6f7fb; padding:24px 0;\\\">\\n    <tr>\\n      <td align=\\\"center\\\">\\n        <table width=\\\"640\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" style=\\\"background:#ffffff; border-radius:16px; box-shadow:0 12px 30px rgba(15,23,42,.08); overflow:hidden;\\\">\\n          <tr>\\n            <td style=\\\"padding:24px 28px; background:linear-gradient(135deg,#eef4ff,#fef9ff,#ecf3ff); border-bottom:1px solid #e5e7eb;\\\">\\n              <h2 style=\\\"margin:0 0 6px; font-size:22px;\\\">Refund Invoice</h2>\\n              <div style=\\\"color:#475467; font-size:14px;\\\">Invoice #: <strong>RF-8</strong></div>\\n            </td>\\n          </tr>\\n\\n          <tr>\\n            <td style=\\\"padding:22px 28px;\\\">\\n              <h3 style=\\\"margin:0 0 12px; font-size:16px; color:#111827;\\\">Refund Details</h3>\\n              <table width=\\\"100%\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" style=\\\"font-size:14px;\\\">\\n                <tr>\\n                  <td style=\\\"padding:6px 0; color:#64748b;\\\">Refund Amount</td>\\n                  <td style=\\\"padding:6px 0; text-align:right;\\\"><strong>$2.50 SGD</strong></td>\\n                </tr>\\n                <tr>\\n                  <td style=\\\"padding:6px 0; color:#64748b;\\\">Refund Status</td>\\n                  <td style=\\\"padding:6px 0; text-align:right;\\\">COMPLET','SENT','2026-01-28 17:16:45'),(18,7,'email','bobochan@gmail.com','{\"orderId\":60,\"status\":\"completed\",\"amount\":\"3.30\",\"message\":\"Hi bobochan@gmail.com,\\n\\nThanks for your purchase! Here is your invoice.\\nInvoice: INV-20260128-60\\nOrder ID: 60\\nDate: 28/01/2026, 17:43:30\\n\\nItems:\\n- Apples x1 @ $1.50 = $1.50\\n- Bananas x1 @ $0.80 = $0.80\\n- fish x1 @ $1.00 = $1.00\\n\\nSubtotal: $3.30\\nDelivery fee: $0.00\\nTotal: $3.30\\n\\nCurrency: SGD\\n\\nThank you for shopping with us!\",\"subject\":\"Invoice INV-20260128-60 - Supermarket App\",\"html\":\"\\n        <div style=\\\"font-family:Arial, sans-serif; color:#222;\\\">\\n            <h2 style=\\\"margin:0 0 8px;\\\">Supermarket App Invoice</h2>\\n            <p style=\\\"margin:0 0 16px;\\\">Hi bobochan@gmail.com,</p>\\n            <p style=\\\"margin:0 0 16px;\\\">Thanks for your purchase! Here is your invoice.</p>\\n            <table style=\\\"margin-bottom:16px;\\\">\\n                <tr><td><strong>Invoice</strong></td><td style=\\\"padding-left:8px;\\\">INV-20260128-60</td></tr>\\n                <tr><td><strong>Order ID</strong></td><td style=\\\"padding-left:8px;\\\">60</td></tr>\\n                <tr><td><strong>Date</strong></td><td style=\\\"padding-left:8px;\\\">28/01/2026, 17:43:30</td></tr>\\n                <tr><td><strong>Currency</strong></td><td style=\\\"padding-left:8px;\\\">SGD</td></tr>\\n            </table>\\n            <table style=\\\"width:100%; border-collapse:collapse; margin-bottom:16px;\\\">\\n                <thead>\\n                    <tr>\\n                        <th style=\\\"text-align:left; padding:8px; border-bottom:2px solid #333;\\\">Item</th>\\n                        <th style=\\\"text-align:center; padding:8px; border-bottom:2px solid #333;\\\">Qty</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Price</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Total</th>\\n                    </tr>\\n                </thead>\\n                <tbody>\\n                    \\n        <tr>\\n            <td style=\\\"paddi','SENT','2026-01-28 17:45:46'),(19,7,'sms','82345678','{\"orderId\":60,\"status\":\"completed\",\"amount\":\"3.30\",\"message\":\"Order #60 payment completed.\"}','SENT','2026-01-28 17:45:46'),(20,7,'email','bobochan@gmail.com','{\"message\":\"Hi bobochan@gmail.com,\\n\\nYour refund has been processed. Here is your refund invoice.\\nInvoice: RF-9\\nRefund Amount: $2.50 SGD\\nRefund Status: MANUAL\\nRefund Date: 28/01/2026, 17:58:01\\n\\nRefund Items:\\n- Apples x1 @ $1.50 = $1.50\\n- fish x1 @ $1.00 = $1.00\\n\\nOrder Total: $3.30\\nRefunded Total (to date): $2.50\\nRemaining Balance: $0.80\\n\\nThank you for shopping with us!\",\"subject\":\"Refund Invoice RF-9 - Supermarket App\",\"html\":\"<!DOCTYPE html>\\n<html lang=\\\"en\\\">\\n<head>\\n  <meta charset=\\\"UTF-8\\\">\\n  <title>Refund Invoice</title>\\n</head>\\n<body style=\\\"margin:0; padding:0; background:#f6f7fb; font-family:Segoe UI, Arial, sans-serif; color:#0f172a;\\\">\\n  <table width=\\\"100%\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" style=\\\"background:#f6f7fb; padding:24px 0;\\\">\\n    <tr>\\n      <td align=\\\"center\\\">\\n        <table width=\\\"640\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" style=\\\"background:#ffffff; border-radius:16px; box-shadow:0 12px 30px rgba(15,23,42,.08); overflow:hidden;\\\">\\n          <tr>\\n            <td style=\\\"padding:24px 28px; background:linear-gradient(135deg,#eef4ff,#fef9ff,#ecf3ff); border-bottom:1px solid #e5e7eb;\\\">\\n              <h2 style=\\\"margin:0 0 6px; font-size:22px;\\\">Refund Invoice</h2>\\n              <div style=\\\"color:#475467; font-size:14px;\\\">Invoice #: <strong>RF-9</strong></div>\\n            </td>\\n          </tr>\\n\\n          <tr>\\n            <td style=\\\"padding:22px 28px;\\\">\\n              <h3 style=\\\"margin:0 0 12px; font-size:16px; color:#111827;\\\">Refund Details</h3>\\n              <table width=\\\"100%\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" style=\\\"font-size:14px;\\\">\\n                <tr>\\n                  <td style=\\\"padding:6px 0; color:#64748b;\\\">Refund Amount</td>\\n                  <td style=\\\"padding:6px 0; text-align:right;\\\"><strong>$2.50 SGD</strong></td>\\n                </tr>\\n                <tr>\\n                  <td style=\\\"padding:6px 0; color:#64748b;\\\">Refund Status</td>\\n                  <td style=\\\"paddin','SENT','2026-01-28 17:58:00'),(21,7,'email','bobochan@gmail.com','{\"orderId\":62,\"status\":\"completed\",\"amount\":\"7.50\",\"message\":\"Hi bobochan@gmail.com,\\n\\nThanks for your purchase! Here is your invoice.\\nInvoice: INV-20260128-62\\nOrder ID: 62\\nDate: 28/01/2026, 18:10:35\\n\\nItems:\\n- Apples x5 @ $1.50 = $7.50\\n\\nSubtotal: $7.50\\nDelivery fee: $0.00\\nTotal: $7.50\\n\\nCurrency: SGD\\n\\nThank you for shopping with us!\",\"subject\":\"Invoice INV-20260128-62 - Supermarket App\",\"html\":\"\\n        <div style=\\\"font-family:Arial, sans-serif; color:#222;\\\">\\n            <h2 style=\\\"margin:0 0 8px;\\\">Supermarket App Invoice</h2>\\n            <p style=\\\"margin:0 0 16px;\\\">Hi bobochan@gmail.com,</p>\\n            <p style=\\\"margin:0 0 16px;\\\">Thanks for your purchase! Here is your invoice.</p>\\n            <table style=\\\"margin-bottom:16px;\\\">\\n                <tr><td><strong>Invoice</strong></td><td style=\\\"padding-left:8px;\\\">INV-20260128-62</td></tr>\\n                <tr><td><strong>Order ID</strong></td><td style=\\\"padding-left:8px;\\\">62</td></tr>\\n                <tr><td><strong>Date</strong></td><td style=\\\"padding-left:8px;\\\">28/01/2026, 18:10:35</td></tr>\\n                <tr><td><strong>Currency</strong></td><td style=\\\"padding-left:8px;\\\">SGD</td></tr>\\n            </table>\\n            <table style=\\\"width:100%; border-collapse:collapse; margin-bottom:16px;\\\">\\n                <thead>\\n                    <tr>\\n                        <th style=\\\"text-align:left; padding:8px; border-bottom:2px solid #333;\\\">Item</th>\\n                        <th style=\\\"text-align:center; padding:8px; border-bottom:2px solid #333;\\\">Qty</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Price</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Total</th>\\n                    </tr>\\n                </thead>\\n                <tbody>\\n                    \\n        <tr>\\n            <td style=\\\"padding:8px;border-bottom:1px solid #eee;\\\">Apples</td>\\n     ','SENT','2026-01-28 18:10:58'),(22,7,'sms','82345678','{\"orderId\":62,\"status\":\"completed\",\"amount\":\"7.50\",\"message\":\"Order #62 payment completed.\"}','SENT','2026-01-28 18:10:58'),(23,7,'email','bobochan@gmail.com','{\"orderId\":63,\"status\":\"completed\",\"amount\":\"7.00\",\"message\":\"Hi bobochan@gmail.com,\\n\\nThanks for your purchase! Here is your invoice.\\nInvoice: INV-20260128-63\\nOrder ID: 63\\nDate: 28/01/2026, 18:12:27\\n\\nItems:\\n- Milk x2 @ $3.50 = $7.00\\n\\nSubtotal: $7.00\\nDelivery fee: $0.00\\nTotal: $7.00\\n\\nCurrency: SGD\\n\\nThank you for shopping with us!\",\"subject\":\"Invoice INV-20260128-63 - Supermarket App\",\"html\":\"\\n        <div style=\\\"font-family:Arial, sans-serif; color:#222;\\\">\\n            <h2 style=\\\"margin:0 0 8px;\\\">Supermarket App Invoice</h2>\\n            <p style=\\\"margin:0 0 16px;\\\">Hi bobochan@gmail.com,</p>\\n            <p style=\\\"margin:0 0 16px;\\\">Thanks for your purchase! Here is your invoice.</p>\\n            <table style=\\\"margin-bottom:16px;\\\">\\n                <tr><td><strong>Invoice</strong></td><td style=\\\"padding-left:8px;\\\">INV-20260128-63</td></tr>\\n                <tr><td><strong>Order ID</strong></td><td style=\\\"padding-left:8px;\\\">63</td></tr>\\n                <tr><td><strong>Date</strong></td><td style=\\\"padding-left:8px;\\\">28/01/2026, 18:12:27</td></tr>\\n                <tr><td><strong>Currency</strong></td><td style=\\\"padding-left:8px;\\\">SGD</td></tr>\\n            </table>\\n            <table style=\\\"width:100%; border-collapse:collapse; margin-bottom:16px;\\\">\\n                <thead>\\n                    <tr>\\n                        <th style=\\\"text-align:left; padding:8px; border-bottom:2px solid #333;\\\">Item</th>\\n                        <th style=\\\"text-align:center; padding:8px; border-bottom:2px solid #333;\\\">Qty</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Price</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Total</th>\\n                    </tr>\\n                </thead>\\n                <tbody>\\n                    \\n        <tr>\\n            <td style=\\\"padding:8px;border-bottom:1px solid #eee;\\\">Milk</td>\\n         ','SENT','2026-01-28 18:13:06'),(24,7,'sms','82345678','{\"orderId\":63,\"status\":\"completed\",\"amount\":\"7.00\",\"message\":\"Order #63 payment completed.\"}','SENT','2026-01-28 18:13:06'),(25,7,'email','bobochan@gmail.com','{\"message\":\"Hi bobochan@gmail.com,\\n\\nYour refund has been processed. Here is your refund invoice.\\nInvoice: RF-10\\nRefund Amount: $7.00 SGD\\nRefund Status: COMPLETED\\nRefund Date: 28/01/2026, 18:22:04\\n\\nRefund Items:\\n- Milk x2 @ $3.50 = $7.00\\n\\nOrder Total: $7.00\\nRefunded Total (to date): $7.00\\nRemaining Balance: $0.00\\n\\nThank you for shopping with us!\",\"subject\":\"Refund Invoice RF-10 - Supermarket App\",\"html\":\"<!DOCTYPE html>\\n<html lang=\\\"en\\\">\\n<head>\\n  <meta charset=\\\"UTF-8\\\">\\n  <title>Refund Invoice</title>\\n</head>\\n<body style=\\\"margin:0; padding:0; background:#f6f7fb; font-family:Segoe UI, Arial, sans-serif; color:#0f172a;\\\">\\n  <table width=\\\"100%\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" style=\\\"background:#f6f7fb; padding:24px 0;\\\">\\n    <tr>\\n      <td align=\\\"center\\\">\\n        <table width=\\\"640\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" style=\\\"background:#ffffff; border-radius:16px; box-shadow:0 12px 30px rgba(15,23,42,.08); overflow:hidden;\\\">\\n          <tr>\\n            <td style=\\\"padding:24px 28px; background:linear-gradient(135deg,#eef4ff,#fef9ff,#ecf3ff); border-bottom:1px solid #e5e7eb;\\\">\\n              <h2 style=\\\"margin:0 0 6px; font-size:22px;\\\">Refund Invoice</h2>\\n              <div style=\\\"color:#475467; font-size:14px;\\\">Invoice #: <strong>RF-10</strong></div>\\n            </td>\\n          </tr>\\n\\n          <tr>\\n            <td style=\\\"padding:22px 28px;\\\">\\n              <h3 style=\\\"margin:0 0 12px; font-size:16px; color:#111827;\\\">Refund Details</h3>\\n              <table width=\\\"100%\\\" cellpadding=\\\"0\\\" cellspacing=\\\"0\\\" style=\\\"font-size:14px;\\\">\\n                <tr>\\n                  <td style=\\\"padding:6px 0; color:#64748b;\\\">Refund Amount</td>\\n                  <td style=\\\"padding:6px 0; text-align:right;\\\"><strong>$7.00 SGD</strong></td>\\n                </tr>\\n                <tr>\\n                  <td style=\\\"padding:6px 0; color:#64748b;\\\">Refund Status</td>\\n                  <td style=\\\"padding:6px 0; text-align:rig','SENT','2026-01-28 18:22:03'),(26,9,'email','b@b.com','{\"orderId\":64,\"status\":\"completed\",\"amount\":\"1.50\",\"message\":\"Hi nelsom,\\n\\nThanks for your purchase! Here is your invoice.\\nInvoice: INV-20260128-64\\nOrder ID: 64\\nDate: 28/01/2026, 18:37:09\\n\\nItems:\\n- Apples x1 @ $1.50 = $1.50\\n\\nSubtotal: $1.50\\nDelivery fee: $0.00\\nTotal: $1.50\\n\\nCurrency: SGD\\n\\nThank you for shopping with us!\",\"subject\":\"Invoice INV-20260128-64 - Supermarket App\",\"html\":\"\\n        <div style=\\\"font-family:Arial, sans-serif; color:#222;\\\">\\n            <h2 style=\\\"margin:0 0 8px;\\\">Supermarket App Invoice</h2>\\n            <p style=\\\"margin:0 0 16px;\\\">Hi nelsom,</p>\\n            <p style=\\\"margin:0 0 16px;\\\">Thanks for your purchase! Here is your invoice.</p>\\n            <table style=\\\"margin-bottom:16px;\\\">\\n                <tr><td><strong>Invoice</strong></td><td style=\\\"padding-left:8px;\\\">INV-20260128-64</td></tr>\\n                <tr><td><strong>Order ID</strong></td><td style=\\\"padding-left:8px;\\\">64</td></tr>\\n                <tr><td><strong>Date</strong></td><td style=\\\"padding-left:8px;\\\">28/01/2026, 18:37:09</td></tr>\\n                <tr><td><strong>Currency</strong></td><td style=\\\"padding-left:8px;\\\">SGD</td></tr>\\n            </table>\\n            <table style=\\\"width:100%; border-collapse:collapse; margin-bottom:16px;\\\">\\n                <thead>\\n                    <tr>\\n                        <th style=\\\"text-align:left; padding:8px; border-bottom:2px solid #333;\\\">Item</th>\\n                        <th style=\\\"text-align:center; padding:8px; border-bottom:2px solid #333;\\\">Qty</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Price</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Total</th>\\n                    </tr>\\n                </thead>\\n                <tbody>\\n                    \\n        <tr>\\n            <td style=\\\"padding:8px;border-bottom:1px solid #eee;\\\">Apples</td>\\n            <td style=\\\"paddi','SENT','2026-01-28 18:37:33'),(27,9,'sms','12345678','{\"orderId\":64,\"status\":\"completed\",\"amount\":\"1.50\",\"message\":\"Order #64 payment completed.\"}','SENT','2026-01-28 18:37:33'),(28,2,'email','mary@mary.com','{\"orderId\":65,\"status\":\"completed\",\"amount\":\"1.50\",\"message\":\"Hi Mary Tan,\\n\\nThanks for your purchase! Here is your invoice.\\nInvoice: INV-20260128-65\\nOrder ID: 65\\nDate: 28/01/2026, 19:02:12\\n\\nItems:\\n- Tomatoes x1 @ $1.50 = $1.50\\n\\nSubtotal: $1.50\\nDelivery fee: $0.00\\nTotal: $1.50\\n\\nCurrency: SGD\\n\\nThank you for shopping with us!\",\"subject\":\"Invoice INV-20260128-65 - Supermarket App\",\"html\":\"\\n        <div style=\\\"font-family:Arial, sans-serif; color:#222;\\\">\\n            <h2 style=\\\"margin:0 0 8px;\\\">Supermarket App Invoice</h2>\\n            <p style=\\\"margin:0 0 16px;\\\">Hi Mary Tan,</p>\\n            <p style=\\\"margin:0 0 16px;\\\">Thanks for your purchase! Here is your invoice.</p>\\n            <table style=\\\"margin-bottom:16px;\\\">\\n                <tr><td><strong>Invoice</strong></td><td style=\\\"padding-left:8px;\\\">INV-20260128-65</td></tr>\\n                <tr><td><strong>Order ID</strong></td><td style=\\\"padding-left:8px;\\\">65</td></tr>\\n                <tr><td><strong>Date</strong></td><td style=\\\"padding-left:8px;\\\">28/01/2026, 19:02:12</td></tr>\\n                <tr><td><strong>Currency</strong></td><td style=\\\"padding-left:8px;\\\">SGD</td></tr>\\n            </table>\\n            <table style=\\\"width:100%; border-collapse:collapse; margin-bottom:16px;\\\">\\n                <thead>\\n                    <tr>\\n                        <th style=\\\"text-align:left; padding:8px; border-bottom:2px solid #333;\\\">Item</th>\\n                        <th style=\\\"text-align:center; padding:8px; border-bottom:2px solid #333;\\\">Qty</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Price</th>\\n                        <th style=\\\"text-align:right; padding:8px; border-bottom:2px solid #333;\\\">Total</th>\\n                    </tr>\\n                </thead>\\n                <tbody>\\n                    \\n        <tr>\\n            <td style=\\\"padding:8px;border-bottom:1px solid #eee;\\\">Tomatoes</td>\\n            <td style','SENT','2026-01-28 19:02:39'),(29,2,'sms','12345678','{\"orderId\":65,\"status\":\"completed\",\"amount\":\"1.50\",\"message\":\"Order #65 payment completed.\"}','SENT','2026-01-28 19:02:39');
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_items_order_id_idx` (`order_id`),
  KEY `order_items_product_id_idx` (`product_id`),
  CONSTRAINT `order_items_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
INSERT INTO `order_items` VALUES (1,1,2,1,0.80),(2,2,2,1,0.80),(3,3,19,1,4.00),(4,4,1,1,1.50),(5,5,2,1,0.80),(6,6,1,1,1.50),(7,7,1,1,1.50),(10,11,21,2,14.70),(29,28,1,5,1.50),(30,29,1,4,1.50),(31,30,1,1,1.50),(32,31,1,5,1.50),(35,34,19,1,4.00),(36,35,23,2,1.00),(37,36,20,1,1.00),(38,37,1,1,1.50),(39,38,1,1,1.50),(40,39,1,1,1.50),(41,39,3,1,3.50),(42,40,2,1,0.80),(43,41,14,1,1.50),(44,42,1,1,1.50),(45,43,3,1,3.50),(46,44,1,1,1.50),(48,45,1,2,1.50),(57,46,1,1,1.50),(58,47,1,1,1.50),(59,48,1,1,1.50),(65,49,2,1,0.80),(66,50,3,1,3.50),(68,51,1,1,1.50),(69,52,1,1,1.50),(70,53,1,1,1.50),(73,54,1,2,1.50),(74,55,19,2,4.00),(76,56,19,1,4.00),(77,57,3,1,3.50),(80,58,3,1,3.50),(81,59,20,1,1.00),(91,60,1,1,1.50),(92,60,2,1,0.80),(93,60,20,1,1.00),(96,61,1,1,1.50),(97,62,1,5,1.50),(98,63,3,2,3.50),(99,64,1,1,1.50),(100,65,14,1,1.50);
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `delivery_method` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'pickup',
  `delivery_address` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `delivery_fee` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `payment_method` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `paypal_capture_id` varchar(80) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'PAID',
  `refunded_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `delivery_status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'packed',
  `currency_code` varchar(5) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'SGD',
  `exchange_rate` decimal(10,6) NOT NULL DEFAULT '1.000000',
  `invoice_number` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `payment_attempts` int NOT NULL DEFAULT '0',
  `last_payment_error` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `orders_user_id_idx` (`user_id`),
  CONSTRAINT `orders_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,2,2.30,'delivery','Tampines Ave 1',1.50,'2025-11-13 14:21:16',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(2,2,2.30,'delivery','Tampines Ave 1',1.50,'2025-11-13 14:57:18',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(3,2,4.00,'pickup',NULL,0.00,'2025-11-13 15:00:19',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(4,2,1.50,'pickup',NULL,0.00,'2025-11-16 02:58:46',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(5,2,0.80,'pickup',NULL,0.00,'2025-11-18 17:24:27',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(6,2,1.50,'pickup',NULL,0.00,'2025-11-18 17:25:40',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(7,2,3.00,'delivery','Tampines Ave 1',1.50,'2025-11-19 14:11:22',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(11,2,29.40,'pickup',NULL,0.00,'2025-11-20 16:36:46',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(28,7,7.50,'pickup',NULL,0.00,'2025-11-24 15:49:08',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(29,2,6.00,'pickup',NULL,0.00,'2025-11-24 17:56:21',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(30,2,1.50,'pickup',NULL,0.00,'2025-11-24 17:56:49',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(31,2,9.00,'delivery','Tampines Ave 1',1.50,'2025-11-24 18:00:53',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(34,2,4.00,'delivery','Tampines Ave 1',0.00,'2025-11-26 14:40:32',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(35,2,2.00,'pickup',NULL,0.00,'2025-11-26 16:28:04',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(36,9,1.00,'pickup',NULL,0.00,'2025-11-26 16:53:11',NULL,NULL,'PAID',0.00,'packed','SGD',1.000000,NULL,0,NULL),(37,2,1.50,'pickup',NULL,0.00,'2026-01-21 17:34:46','paypal','4U708165LT143392S','PAID',1.00,'packed','SGD',1.000000,NULL,0,NULL),(38,2,1.50,'delivery','Tampines Ave 1',0.00,'2026-01-21 18:13:36','paypal','6AC68059J88285247','PAID',0.00,'received','SGD',1.000000,NULL,0,NULL),(39,9,5.00,'pickup',NULL,0.00,'2026-01-23 01:05:32','paypal','3S512044H8471024Y','PAID',3.50,'in_transit','SGD',1.000000,NULL,0,NULL),(40,9,0.80,'pickup',NULL,0.00,'2026-01-23 01:10:16','paypal','89T40096H9664903M','PAID',0.80,'in_transit','SGD',1.000000,NULL,0,NULL),(41,9,1.50,'pickup',NULL,0.00,'2026-01-23 01:33:49','paypal','9AD51082P1013201B','PAID',0.00,'in_transit','SGD',1.000000,NULL,0,NULL),(42,9,1.50,'delivery','RP',0.00,'2026-01-23 01:37:07','paypal','78G927831E181283L','PAID',0.00,'received','SGD',1.000000,NULL,0,NULL),(43,9,3.50,'delivery','RP',0.00,'2026-01-23 02:19:02','paypal','7EC76031KE901434L','PAID',3.50,'received','SGD',1.000000,NULL,0,NULL),(44,9,1.50,'delivery','RP',0.00,'2026-01-23 04:03:14',NULL,NULL,'FAILED',0.00,'packed','SGD',1.000000,NULL,0,NULL),(45,2,3.00,'delivery','Tampines Ave 1',0.00,'2026-01-27 17:55:10','paypal','29D36792UL523561H','PAID',3.00,'packed','SGD',1.000000,NULL,0,NULL),(46,2,1.50,'delivery','Tampines Ave 1',0.00,'2026-01-27 20:23:18',NULL,NULL,'FAILED',0.00,'packed','SGD',1.000000,'INV-20260127-46',1,'Payment failed'),(47,2,1.50,'delivery','Tampines Ave 1',0.00,'2026-01-27 20:33:44',NULL,NULL,'FAILED',0.00,'packed','SGD',1.000000,'INV-20260127-47',1,'Payment failed'),(48,2,1.50,'delivery','Tampines Ave 1',0.00,'2026-01-27 20:34:53','nets',NULL,'PAID',0.00,'received','SGD',1.000000,'INV-20260127-48',0,NULL),(49,2,0.80,'delivery','Tampines Ave 1',0.00,'2026-01-27 20:55:55','paypal','0U788965KD5670028','PAID',0.00,'received','SGD',1.000000,'INV-20260127-49',0,NULL),(50,2,3.50,'delivery','Tampines Ave 1',0.00,'2026-01-27 21:04:51','paypal','51V23006AW584084D','PAID',0.00,'packed','SGD',1.000000,'INV-20260127-50',0,NULL),(51,2,1.50,'delivery','Tampines Ave 1',0.00,'2026-01-27 23:45:06','paypal','2U88451918716963F','PAID',0.00,'packed','USD',1.000000,'INV-20260127-51',0,NULL),(52,2,1.50,'delivery','Tampines Ave 1',0.00,'2026-01-27 23:47:49','paypal','2UL70974EG338525A','PAID',0.00,'packed','SGD',1.000000,'INV-20260127-52',0,NULL),(53,2,1.50,'delivery','Tampines Ave 1',0.00,'2026-01-27 23:49:47','paypal','6UF67495585202528','PAID',0.00,'in_transit','SGD',1.000000,'INV-20260127-53',0,NULL),(54,9,3.00,'delivery','RP',0.00,'2026-01-28 13:52:35','nets',NULL,'PAID',0.00,'packed','SGD',1.000000,'INV-20260128-54',0,NULL),(55,2,8.00,'delivery','Tampines Ave 1',0.00,'2026-01-28 15:04:12','stripe','pi_3SuSr0DnIhYFA03I2SFeJzlj','PAID',0.00,'packed','SGD',1.000000,'INV-20260128-55',0,NULL),(56,2,4.00,'delivery','Tampines Ave 1',0.00,'2026-01-28 15:32:54','stripe','pi_3SuTG6DnIhYFA03I1yCHUXoE','PAID',0.00,'received','SGD',1.000000,'INV-20260128-56',0,NULL),(57,2,3.50,'delivery','Tampines Ave 1',0.00,'2026-01-28 15:45:17','nets',NULL,'PAID',3.50,'packed','SGD',1.000000,'INV-20260128-57',0,NULL),(58,2,5.00,'delivery','Tampines Ave 1',1.50,'2026-01-28 16:00:46','stripe','pi_3SuULADnIhYFA03I1amRNz0i','PAID',3.50,'packed','SGD',1.000000,'INV-20260128-58',0,NULL),(59,2,2.50,'delivery','Tampines Ave 1',1.50,'2026-01-28 17:11:50','paypal','4XC661958U471833U','PAID',2.50,'packed','SGD',1.000000,'INV-20260128-59',0,NULL),(60,7,3.30,'pickup',NULL,0.00,'2026-01-28 17:43:30','stripe','pi_3SuVJjDnIhYFA03I30xnEKvw','PAID',2.50,'packed','SGD',1.000000,'INV-20260128-60',0,NULL),(61,7,1.50,'pickup',NULL,0.00,'2026-01-28 17:47:12',NULL,NULL,'PENDING',0.00,'packed','SGD',1.000000,'INV-20260128-61',0,NULL),(62,7,7.50,'pickup',NULL,0.00,'2026-01-28 18:10:35','paypal','88G76717BN9867030','PAID',0.00,'packed','SGD',1.000000,'INV-20260128-62',0,NULL),(63,7,7.00,'pickup',NULL,0.00,'2026-01-28 18:12:27','paypal','22U080559M4323126','PAID',7.00,'packed','SGD',1.000000,'INV-20260128-63',0,NULL),(64,9,1.50,'delivery','RP',0.00,'2026-01-28 18:37:09','nets',NULL,'PAID',0.00,'received','SGD',1.000000,'INV-20260128-64',0,NULL),(65,2,1.50,'pickup',NULL,0.00,'2026-01-28 19:02:12','stripe','pi_3SuWW9DnIhYFA03I3MQaIKoL','PAID',0.00,'packed','SGD',1.000000,'INV-20260128-65',0,NULL);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_attempts`
--

DROP TABLE IF EXISTS `payment_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `provider` varchar(30) COLLATE utf8mb4_general_ci NOT NULL,
  `method` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'INITIATED',
  `amount` decimal(10,2) DEFAULT NULL,
  `currency` varchar(5) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `device_fingerprint` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `failure_reason` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `provider_order_id` varchar(80) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `payment_attempts_user_id_idx` (`user_id`),
  KEY `payment_attempts_order_id_idx` (`order_id`),
  CONSTRAINT `payment_attempts_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `payment_attempts_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_attempts`
--

LOCK TABLES `payment_attempts` WRITE;
/*!40000 ALTER TABLE `payment_attempts` DISABLE KEYS */;
INSERT INTO `payment_attempts` VALUES (1,2,46,'nets','nets','INITIATED',1.50,'SGD','::1','3edb0d9e9d0352fe62cf9e67766001eb34d2ec0e3652f824be79f6917288df1e',NULL,'0lhnflkbes3j','2026-01-27 20:32:25','2026-01-27 20:32:25'),(2,2,47,'nets','nets','INITIATED',1.50,'SGD','::1','3edb0d9e9d0352fe62cf9e67766001eb34d2ec0e3652f824be79f6917288df1e',NULL,'0fw3o3rdf6cd','2026-01-27 20:33:48','2026-01-27 20:33:48'),(3,2,48,'nets','nets','SUCCEEDED',1.50,'SGD','::1','3edb0d9e9d0352fe62cf9e67766001eb34d2ec0e3652f824be79f6917288df1e',NULL,'0kthx4lkpqti','2026-01-27 20:35:22','2026-01-27 20:35:58'),(4,2,49,'paypal','paypal','SUCCEEDED',0.80,'SGD','::1','3edb0d9e9d0352fe62cf9e67766001eb34d2ec0e3652f824be79f6917288df1e',NULL,'9FR62970KX213073N','2026-01-27 20:58:06','2026-01-27 20:58:45'),(5,2,50,'paypal','paypal','SUCCEEDED',3.50,'SGD','::1','3edb0d9e9d0352fe62cf9e67766001eb34d2ec0e3652f824be79f6917288df1e',NULL,'2LH943933S618382U','2026-01-27 21:04:55','2026-01-27 21:05:19'),(6,2,51,'paypal','paypal','SUCCEEDED',1.50,'USD','::1','3edb0d9e9d0352fe62cf9e67766001eb34d2ec0e3652f824be79f6917288df1e',NULL,'26P08676D6178280R','2026-01-27 23:45:19','2026-01-27 23:45:33'),(7,2,52,'paypal','paypal','SUCCEEDED',1.50,'SGD','::1','3edb0d9e9d0352fe62cf9e67766001eb34d2ec0e3652f824be79f6917288df1e',NULL,'9UM86529YC004484T','2026-01-27 23:47:54','2026-01-27 23:48:10'),(8,2,53,'paypal','paypal','SUCCEEDED',1.50,'SGD','::1','3edb0d9e9d0352fe62cf9e67766001eb34d2ec0e3652f824be79f6917288df1e',NULL,'96W86436YA658684W','2026-01-27 23:49:53','2026-01-27 23:50:02'),(9,9,54,'nets','nets','SUCCEEDED',3.00,'SGD','::1','5e7f6addd6aa34d03035567cd3ce08096b8c08c3f056910765a2b862f4b695e1',NULL,'0u45pwlxwiop','2026-01-28 13:52:47','2026-01-28 13:52:54'),(10,2,55,'stripe','card','SUCCEEDED',8.00,'SGD','::1','3edb0d9e9d0352fe62cf9e67766001eb34d2ec0e3652f824be79f6917288df1e',NULL,'cs_test_a1YrmnGKiuBwHmd0ODPVfwaEYjDlhePBNO3ikYvGdFsUEZLCovQ9GbbPh0','2026-01-28 15:04:19','2026-01-28 15:07:56'),(11,2,56,'stripe','card','SUCCEEDED',4.00,'SGD','::1','3edb0d9e9d0352fe62cf9e67766001eb34d2ec0e3652f824be79f6917288df1e',NULL,'cs_test_a13cTFFyTthnGk62MuR0LN3RcdjjzSWs8qIFxhW5q1JWRGMlkHNQOiy10V','2026-01-28 15:33:09','2026-01-28 15:33:52'),(12,2,57,'nets','nets','SUCCEEDED',3.50,'SGD','::1','3edb0d9e9d0352fe62cf9e67766001eb34d2ec0e3652f824be79f6917288df1e',NULL,'0ox63l79oh7q','2026-01-28 15:45:26','2026-01-28 15:45:41'),(13,2,58,'stripe','card','SUCCEEDED',5.00,'SGD','::1','bc7c5b87919c5bb6738300b16d846e0f96550bed5c75603d68b41c5496c2abe6',NULL,'cs_test_a1roisXme7ek3jN29dhkymrUYrFJqQ6HZukS2GvfNrITtl4NzHJ9Frkck5','2026-01-28 16:42:59','2026-01-28 16:43:11'),(14,2,59,'paypal','paypal','SUCCEEDED',2.50,'SGD','::1','bc7c5b87919c5bb6738300b16d846e0f96550bed5c75603d68b41c5496c2abe6',NULL,'3UH656745H657590S','2026-01-28 17:12:00','2026-01-28 17:12:25'),(15,7,60,'stripe','card','SUCCEEDED',3.30,'SGD','::1','bc7c5b87919c5bb6738300b16d846e0f96550bed5c75603d68b41c5496c2abe6',NULL,'cs_test_a1zOAXlJpyJjpkqFufMC3wBlvtJdgzPM1gkTADNot53Q9AjW4U33pDQJMR','2026-01-28 17:44:20','2026-01-28 17:45:46'),(16,7,60,'stripe','card','INITIATED',3.30,'SGD','::1','bc7c5b87919c5bb6738300b16d846e0f96550bed5c75603d68b41c5496c2abe6',NULL,'cs_test_a1A1g3zLDVHHRcd9DO9JQIvelhXeIEvb79UDzMe8RoP1LzO8XKGvMkAhqm','2026-01-28 17:44:51','2026-01-28 17:44:51'),(17,7,61,'nets','nets','INITIATED',1.50,'SGD','::1','bc7c5b87919c5bb6738300b16d846e0f96550bed5c75603d68b41c5496c2abe6',NULL,'0dlgufqlcajh','2026-01-28 17:47:15','2026-01-28 17:47:15'),(18,7,61,'nets','nets','INITIATED',1.50,'SGD','::1','bc7c5b87919c5bb6738300b16d846e0f96550bed5c75603d68b41c5496c2abe6',NULL,'00iqhgws5eur','2026-01-28 17:47:21','2026-01-28 17:47:21'),(19,7,61,'nets','nets','INITIATED',1.50,'SGD','::1','bc7c5b87919c5bb6738300b16d846e0f96550bed5c75603d68b41c5496c2abe6',NULL,'091rcauniesr','2026-01-28 17:47:35','2026-01-28 17:47:35'),(20,7,62,'paypal','paypal','SUCCEEDED',7.50,'SGD','::1',NULL,NULL,'45M25826Y65089029','2026-01-28 18:10:39','2026-01-28 18:10:58'),(21,7,63,'paypal','paypal','SUCCEEDED',7.00,'SGD','::1',NULL,NULL,'6HB716162W986054W','2026-01-28 18:12:32','2026-01-28 18:13:06'),(22,9,64,'nets','nets','SUCCEEDED',1.50,'SGD','::1',NULL,NULL,'00ldlkj2fs8g','2026-01-28 18:37:12','2026-01-28 18:37:33'),(23,2,65,'stripe','card','SUCCEEDED',1.50,'SGD','::1',NULL,NULL,'cs_test_a1XaDL7f5xOoCdWkjto4zUVQIdGED6QEtFD9R2o7fkqOh3izYocNfOrpu3','2026-01-28 19:02:14','2026-01-28 19:02:39');
/*!40000 ALTER TABLE `payment_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_reviews`
--

DROP TABLE IF EXISTS `product_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int NOT NULL,
  `user_id` int NOT NULL,
  `rating` tinyint NOT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_reviews_product_id_idx` (`product_id`),
  KEY `product_reviews_user_id_idx` (`user_id`),
  CONSTRAINT `product_reviews_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `product_reviews_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_reviews`
--

LOCK TABLES `product_reviews` WRITE;
/*!40000 ALTER TABLE `product_reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `productName` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `quantity` int NOT NULL,
  `price` double(10,2) NOT NULL,
  `discountPercentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `offerMessage` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `image` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'General',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Apples',94,1.50,0.00,NULL,'apples.png','General',0),(2,'Bananas',99,0.80,0.00,NULL,'bananas.png','General',0),(3,'Milk',100,3.50,0.00,NULL,'milk.png','General',0),(4,'Bread',100,1.80,9.00,NULL,'bread.png','General',0),(14,'Tomatoes',99,1.50,0.00,NULL,'tomatoes.png','General',0),(19,'Broccoli',100,5.00,20.00,'11','Broccoli.png','General',0),(20,'fish',99,1.00,0.00,NULL,'meat.jpg','meat',0),(21,'duck meat',8,15.00,0.00,NULL,'duckmeat.jpg','Meat',1),(23,'dog head',0,1.00,0.00,NULL,'dog head.webp','Meat',1);
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refund_request_items`
--

DROP TABLE IF EXISTS `refund_request_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refund_request_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `order_item_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `refund_request_items_request_id_idx` (`request_id`),
  KEY `refund_request_items_order_item_id_idx` (`order_item_id`),
  CONSTRAINT `refund_request_items_order_item_id_fk` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE CASCADE,
  CONSTRAINT `refund_request_items_request_id_fk` FOREIGN KEY (`request_id`) REFERENCES `refund_requests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refund_request_items`
--

LOCK TABLES `refund_request_items` WRITE;
/*!40000 ALTER TABLE `refund_request_items` DISABLE KEYS */;
INSERT INTO `refund_request_items` VALUES (1,2,42,2,1,0.80),(2,3,41,3,1,3.50),(3,4,45,3,1,3.50),(4,5,48,1,2,1.50),(5,6,77,3,1,3.50),(6,7,80,3,1,3.50),(7,8,81,20,1,1.00),(8,9,91,1,1,1.50),(9,9,93,20,1,1.00),(10,10,98,3,2,3.50);
/*!40000 ALTER TABLE `refund_request_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refund_requests`
--

DROP TABLE IF EXISTS `refund_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refund_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `user_id` int NOT NULL,
  `requested_amount` decimal(10,2) NOT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `admin_note` varchar(500) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `refund_requests_order_id_idx` (`order_id`),
  KEY `refund_requests_user_id_idx` (`user_id`),
  CONSTRAINT `refund_requests_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `refund_requests_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refund_requests`
--

LOCK TABLES `refund_requests` WRITE;
/*!40000 ALTER TABLE `refund_requests` DISABLE KEYS */;
INSERT INTO `refund_requests` VALUES (1,37,2,1.00,'product expired','COMPLETED',NULL,'2026-01-21 17:54:27','2026-01-21 17:59:56'),(2,40,9,0.80,'wrong item','COMPLETED',NULL,'2026-01-23 01:23:38','2026-01-23 01:24:22'),(3,39,9,3.50,'expire','COMPLETED',NULL,'2026-01-23 01:24:53','2026-01-23 01:25:17'),(4,43,9,3.50,'testing','COMPLETED',NULL,'2026-01-23 03:22:58','2026-01-23 03:23:06'),(5,45,2,3.00,'test','COMPLETED',NULL,'2026-01-27 18:01:39','2026-01-28 15:48:27'),(6,57,2,3.50,'test','COMPLETED',NULL,'2026-01-28 15:46:33','2026-01-28 15:48:14'),(7,58,2,3.50,'test','COMPLETED',NULL,'2026-01-28 16:44:38','2026-01-28 16:44:52'),(8,59,2,2.50,'test2','COMPLETED',NULL,'2026-01-28 17:16:32','2026-01-28 17:16:45'),(9,60,7,2.50,'test1','COMPLETED',NULL,'2026-01-28 17:57:43','2026-01-28 17:58:00'),(10,63,7,7.00,NULL,'COMPLETED',NULL,'2026-01-28 18:21:41','2026-01-28 18:22:03');
/*!40000 ALTER TABLE `refund_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refunds`
--

DROP TABLE IF EXISTS `refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refunds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int DEFAULT NULL,
  `order_id` int NOT NULL,
  `paypal_refund_id` varchar(80) DEFAULT NULL,
  `paypal_capture_id` varchar(80) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(5) NOT NULL DEFAULT 'SGD',
  `status` varchar(30) NOT NULL DEFAULT 'UNKNOWN',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `refunds_request_id_idx` (`request_id`),
  KEY `refunds_order_id_idx` (`order_id`),
  CONSTRAINT `refunds_order_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `refunds_request_id_fk` FOREIGN KEY (`request_id`) REFERENCES `refund_requests` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refunds`
--

LOCK TABLES `refunds` WRITE;
/*!40000 ALTER TABLE `refunds` DISABLE KEYS */;
INSERT INTO `refunds` VALUES (1,1,37,'21R26540V46880438','4U708165LT143392S',1.00,'SGD','COMPLETED','2026-01-21 17:59:56'),(2,2,40,'9KR24328PY5325519','89T40096H9664903M',0.80,'SGD','COMPLETED','2026-01-23 01:24:22'),(3,3,39,'8VR885200V6323412','3S512044H8471024Y',3.50,'SGD','COMPLETED','2026-01-23 01:25:17'),(4,4,43,'2CF74337CC6177112','7EC76031KE901434L',3.50,'SGD','COMPLETED','2026-01-23 03:23:07'),(5,6,57,NULL,NULL,3.50,'SGD','MANUAL','2026-01-28 15:48:14'),(6,5,45,'19J98665TA4799113','29D36792UL523561H',3.00,'SGD','COMPLETED','2026-01-28 15:48:28'),(7,7,58,NULL,NULL,3.50,'SGD','MANUAL','2026-01-28 16:44:52'),(8,8,59,'06W64929UT024562H','4XC661958U471833U',2.50,'SGD','COMPLETED','2026-01-28 17:16:46'),(9,9,60,NULL,NULL,2.50,'SGD','MANUAL','2026-01-28 17:58:01'),(10,10,63,'3XB99783V6858322F','22U080559M4323126',7.00,'SGD','COMPLETED','2026-01-28 18:22:04');
/*!40000 ALTER TABLE `refunds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('-ty7me3p5gQ_LeQVJhLa_xGsJ28J40hk',1770200524,'{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2026-02-04T10:22:03.556Z\",\"httpOnly\":true,\"path\":\"/\"},\"user\":{\"id\":1,\"username\":\"Peter Lim\",\"email\":\"peter@peter.com\",\"address\":\"Woodlands Ave 2\",\"contact\":\"98765432\",\"role\":\"admin\",\"free_delivery\":0,\"is_disabled\":0,\"twofactor_secret\":null,\"is_2fa_enabled\":0},\"flash\":{}}'),('8Iz5KjUN5XjJNI_jNHeD4SmgpdoYHa__',1770133980,'{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2026-02-03T15:52:59.982Z\",\"httpOnly\":true,\"path\":\"/\"},\"user\":{\"id\":1,\"username\":\"Peter Lim\",\"email\":\"peter@peter.com\",\"address\":\"Woodlands Ave 2\",\"contact\":\"98765432\",\"role\":\"admin\",\"free_delivery\":0,\"is_disabled\":0,\"twofactor_secret\":null,\"is_2fa_enabled\":0},\"flash\":{}}'),('GiCE7Herp8imXjFHW2WVs2FsW2SeYvxQ',1770123959,'{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2026-02-03T13:05:59.413Z\",\"httpOnly\":true,\"path\":\"/\"},\"user\":{\"id\":1,\"username\":\"Peter Lim\",\"email\":\"peter@peter.com\",\"address\":\"Woodlands Ave 2\",\"contact\":\"98765432\",\"role\":\"admin\",\"free_delivery\":0,\"is_disabled\":0,\"twofactor_secret\":null,\"is_2fa_enabled\":0},\"flash\":{\"success\":[\"Tracking sent to PayPal.\"]}}'),('XtvsHWXZUpfMckrLMPsk4bDrb7wn-7I0',1770202960,'{\"cookie\":{\"originalMaxAge\":604800000,\"expires\":\"2026-02-04T11:02:39.958Z\",\"httpOnly\":true,\"path\":\"/\"},\"user\":{\"id\":2,\"username\":\"Mary Tan\",\"email\":\"mary@mary.com\",\"address\":\"Tampines Ave 1\",\"contact\":\"12345678\",\"role\":\"user\",\"free_delivery\":0,\"is_disabled\":0,\"twofactor_secret\":null,\"is_2fa_enabled\":0},\"flash\":{},\"checkout\":null,\"pendingOrderId\":null,\"paymentPending\":null,\"payment\":null}'),('xVZ2uoBAUXBEoTnBDPNvjeA6j05eoZaB',1770200532,'{\"cookie\":{\"originalMaxAge\":604799999,\"expires\":\"2026-02-04T10:22:11.680Z\",\"httpOnly\":true,\"path\":\"/\"},\"user\":{\"id\":7,\"username\":\"bobochan@gmail.com\",\"email\":\"bobochan@gmail.com\",\"address\":\"123\",\"contact\":\"82345678\",\"role\":\"user\",\"free_delivery\":0,\"is_disabled\":0,\"twofactor_secret\":null,\"is_2fa_enabled\":0},\"flash\":{},\"checkout\":{\"deliveryMethod\":\"pickup\",\"deliveryAddress\":null},\"pendingOrderId\":null,\"paymentPending\":null,\"payment\":{\"method\":\"paypal\",\"captureId\":\"22U080559M4323126\"}}');
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptions`
--

DROP TABLE IF EXISTS `subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `plan_name` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `interval_unit` varchar(10) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'month',
  `interval_count` int NOT NULL DEFAULT '1',
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(5) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'SGD',
  `provider` varchar(30) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'internal',
  `status` varchar(20) COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'ACTIVE',
  `next_billing_at` datetime DEFAULT NULL,
  `provider_subscription_id` varchar(80) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `subscriptions_user_id_idx` (`user_id`),
  CONSTRAINT `subscriptions_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptions`
--

LOCK TABLES `subscriptions` WRITE;
/*!40000 ALTER TABLE `subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(20) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `contact` varchar(10) NOT NULL,
  `role` varchar(10) NOT NULL,
  `free_delivery` tinyint(1) NOT NULL DEFAULT '0',
  `is_disabled` tinyint(1) NOT NULL DEFAULT '0',
  `twofactor_secret` varchar(255) DEFAULT NULL,
  `is_2fa_enabled` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Peter Lim','peter@peter.com','7c4a8d09ca3762af61e59520943dc26494f8941b','Woodlands Ave 2','98765432','admin',0,0,NULL,0),(2,'Mary Tan','mary@mary.com','7c4a8d09ca3762af61e59520943dc26494f8941b','Tampines Ave 1','12345678','user',0,0,NULL,0),(4,'sarahlee','sarahlee@gmail.com','7c4a8d09ca3762af61e59520943dc26494f8941b','Woodlands','98765432','user',0,0,NULL,0),(7,'bobochan@gmail.com','bobochan@gmail.com','7c4a8d09ca3762af61e59520943dc26494f8941b','123','82345678','user',0,0,NULL,0),(9,'nelsom','b@b.com','7c4a8d09ca3762af61e59520943dc26494f8941b','RP','12345678','user',1,0,NULL,0);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-28 19:08:29
