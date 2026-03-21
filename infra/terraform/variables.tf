variable "cloudflare_api_token" {
  description = "Cloudflare API token with Workers and KV permissions"
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "zone_id" {
  description = "Cloudflare zone ID for custom route (required if create_route=true)"
  type        = string
  default     = ""
}

variable "worker_name" {
  description = "Worker script name"
  type        = string
  default     = "daraja-mcp-server"
}

variable "create_route" {
  description = "Whether to create a zone route for the Worker"
  type        = bool
  default     = false
}

variable "workers_route_pattern" {
  description = "Route pattern, e.g. api.example.com/* (required when create_route=true)"
  type        = string
  default     = ""
}

variable "manage_script" {
  description = "Set true to deploy Worker script via Terraform from a pre-built JS bundle"
  type        = bool
  default     = false
}

variable "worker_bundle_path" {
  description = "Path to built Worker JS file used when manage_script=true"
  type        = string
  default     = "../../dist/index.js"
}

variable "compatibility_date" {
  description = "Workers compatibility date"
  type        = string
  default     = "2026-03-22"
}
