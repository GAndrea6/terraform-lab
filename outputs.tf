output "resource_group_name" {
  value = azurerm_resource_group.main.name
}

output "vnet_id" {
  value = module.networking.vnet_id
}

output "storage_account_name" {
  value = module.storage.name
}

output "acr_login_server" {
  value = module.acr.login_server
}

output "log_analytics_workspace_id" {
  value = module.monitoring.workspace_id
}

output "app_identity_client_id" {
  value = azurerm_user_assigned_identity.app.client_id
}