output "usage_kv_namespace_id" {
  value = cloudflare_workers_kv_namespace.usage.id
}

output "tokens_kv_namespace_id" {
  value = cloudflare_workers_kv_namespace.tokens.id
}

output "transactions_kv_namespace_id" {
  value = cloudflare_workers_kv_namespace.transactions.id
}

output "callbacks_kv_namespace_id" {
  value = cloudflare_workers_kv_namespace.callbacks.id
}

output "wrangler_kv_snippet" {
  value = <<-EOT
[[kv_namespaces]]
binding = "USAGE"
id = "${cloudflare_workers_kv_namespace.usage.id}"

[[kv_namespaces]]
binding = "TOKENS"
id = "${cloudflare_workers_kv_namespace.tokens.id}"

[[kv_namespaces]]
binding = "TRANSACTIONS"
id = "${cloudflare_workers_kv_namespace.transactions.id}"

[[kv_namespaces]]
binding = "CALLBACKS"
id = "${cloudflare_workers_kv_namespace.callbacks.id}"
EOT
}
