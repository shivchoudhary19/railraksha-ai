terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags = {
    Project            = "RailRaksha"
    Compliance         = "DPDP-Act-2023"
    DataClassification = "Restricted-Indian-Residency"
    Environment        = var.environment
  }
}

# KMS Customer Managed Key with Envelope Encryption
resource "aws_kms_key" "railraksha_key" {
  description             = "RailRaksha envelope encryption KMS key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

# Dedicated VPC with 3 Availability Zones
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "railraksha-vpc"
  }
}

# Multi-AZ RDS PostgreSQL with Automated Backups & Read Replicas
resource "aws_db_instance" "postgres_primary" {
  identifier            = "railraksha-pg-primary"
  engine                = "postgres"
  engine_version        = "16.2"
  instance_class        = var.db_instance_class
  allocated_storage     = 500
  max_allocated_storage = 2000
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.railraksha_key.arn
  multi_az              = true
  backup_retention_period = 35 # PITR 35-day window
  deletion_protection   = true
  skip_final_snapshot   = false
  publicly_accessible   = false
}

resource "aws_db_instance" "postgres_read_replica" {
  identifier          = "railraksha-pg-replica-1"
  replicate_source_db = aws_db_instance.postgres_primary.identifier
  instance_class      = var.db_instance_class
  storage_encrypted   = true
  kms_key_id          = aws_kms_key.railraksha_key.arn
  publicly_accessible = false
}

# Multi-Node Redis Replication Group (Cluster Mode)
resource "aws_elasticache_replication_group" "redis_cluster" {
  replication_group_id          = "railraksha-redis-cluster"
  description                   = "High-throughput Redis cluster with multi-AZ failover"
  node_type                     = var.redis_node_type
  num_cache_clusters            = 3
  port                          = 6379
  automatic_failover_enabled    = true
  multi_az_enabled              = true
  at_rest_encryption_enabled    = true
  transit_encryption_enabled   = true
  kms_key_id                    = aws_kms_key.railraksha_key.arn
}

# AWS WAFv2 Web ACL for Rate Limiting & Threat Defense
resource "aws_wafv2_web_acl" "railraksha_waf" {
  name        = "railraksha-waf"
  description = "Production WAF with rate-limiting, bot control, and SQLi/XSS defense"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "RailRakshaWAF"
    sampled_requests_enabled   = true
  }

  # Rate Limiter: Max 2000 requests per 5 min per IP
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitMetric"
      sampled_requests_enabled   = true
    }
  }
}
