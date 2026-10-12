output "primary_db_endpoint" {
  description = "Primary PostgreSQL write endpoint"
  value       = aws_db_instance.postgres_primary.endpoint
}

output "read_replica_endpoint" {
  description = "Read replica PostgreSQL query endpoint"
  value       = aws_db_instance.postgres_read_replica.endpoint
}

output "redis_cluster_endpoint" {
  description = "ElastiCache Redis primary configuration endpoint"
  value       = aws_elasticache_replication_group.redis_cluster.primary_endpoint_address
}

output "kms_key_arn" {
  description = "Envelope encryption KMS Key ARN"
  value       = aws_kms_key.railraksha_key.arn
}

output "waf_acl_arn" {
  description = "Regional WAFv2 Web ACL ARN"
  value       = aws_wafv2_web_acl.railraksha_waf.arn
}
