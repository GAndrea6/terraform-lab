# La password la genera Terraform: nessun umano la scrive o la vede nel codice
resource "random_password" "db" {
  length      = 24
  special     = false
  min_lower   = 4
  min_upper   = 4
  min_numeric = 4
}

resource "azurerm_postgresql_flexible_server" "this" {
  name                          = var.name
  resource_group_name           = var.resource_group_name
  location                      = var.location
  version                       = "16"
  administrator_login           = var.admin_login
  administrator_password        = random_password.db.result
  sku_name                      = "B_Standard_B1ms"
  storage_mb                    = 32768
  backup_retention_days         = 7
  geo_redundant_backup_enabled  = false
  public_network_access_enabled = true
  tags                          = var.tags

  lifecycle {
    ignore_changes = [zone]
  }
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.this.id
  collation = "en_US.utf8"
  charset   = "UTF8"
}

# Firewall: solo il tuo IP può raggiungere il database
resource "azurerm_postgresql_flexible_server_firewall_rule" "my_ip" {
  count            = var.allowed_ip != "" ? 1 : 0
  name             = "allow-my-ip"
  server_id        = azurerm_postgresql_flexible_server.this.id
  start_ip_address = var.allowed_ip
  end_ip_address   = var.allowed_ip
}