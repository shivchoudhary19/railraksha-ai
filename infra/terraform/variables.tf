variable "aws_region" {
  description = "Indian cloud region for strict DPDP Act data residency"
  type        = string
  default     = "ap-south-1" # AWS Mumbai
}

variable "environment" {
  description = "Environment identifier"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.100.0.0/16"
}

variable "db_instance_class" {
  description = "RDS PostgreSQL multi-AZ instance class"
  type        = string
  default     = "db.r6g.2xlarge"
}

variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.r6g.xlarge"
}
