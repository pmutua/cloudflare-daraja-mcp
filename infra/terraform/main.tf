resource "cloudflare_workers_kv_namespace" "usage" {
  account_id = var.account_id
  title      = "${var.worker_name}-usage"
}

resource "cloudflare_workers_kv_namespace" "tokens" {
  account_id = var.account_id
  title      = "${var.worker_name}-tokens"
}

resource "cloudflare_workers_kv_namespace" "transactions" {
  account_id = var.account_id
  title      = "${var.worker_name}-transactions"
}

resource "cloudflare_workers_kv_namespace" "callbacks" {
  account_id = var.account_id
  title      = "${var.worker_name}-callbacks"
}

resource "cloudflare_workers_script" "daraja" {
  count       = var.manage_script ? 1 : 0
  account_id  = var.account_id
  script_name = var.worker_name

  main_module        = basename(var.worker_bundle_path)
  content_file       = var.worker_bundle_path
  content_sha256     = filesha256(var.worker_bundle_path)
  compatibility_date = var.compatibility_date

  bindings = [
    {
      name         = "USAGE"
      type         = "kv_namespace"
      namespace_id = cloudflare_workers_kv_namespace.usage.id
    },
    {
      name         = "TOKENS"
      type         = "kv_namespace"
      namespace_id = cloudflare_workers_kv_namespace.tokens.id
    },
    {
      name         = "TRANSACTIONS"
      type         = "kv_namespace"
      namespace_id = cloudflare_workers_kv_namespace.transactions.id
    },
    {
      name         = "CALLBACKS"
      type         = "kv_namespace"
      namespace_id = cloudflare_workers_kv_namespace.callbacks.id
    },
    {
      name = "DARAJA_ENV"
      type = "plain_text"
      text = "sandbox"
    }
  ]

  observability = {
    enabled = true
    logs = {
      enabled         = true
      invocation_logs = true
    }
  }
}

resource "cloudflare_workers_route" "daraja_route" {
  count   = var.create_route ? 1 : 0
  zone_id = var.zone_id
  pattern = var.workers_route_pattern
  script  = var.worker_name
}
