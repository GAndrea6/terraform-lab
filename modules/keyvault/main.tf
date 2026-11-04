resource "azurerm_key_vault" "this" {
  name                       = var.name
  resource_group_name        = var.resource_group_name
  location                   = var.location
  tenant_id                  = var.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false
  tags                       = var.tags

  # Chi può creare i segreti (tu)
  access_policy {
    tenant_id          = var.tenant_id
    object_id          = var.admin_object_id
    secret_permissions = ["Get", "List", "Set", "Delete", "Purge", "Recover"]
  }

  # Chi può solo leggerli (l'identità dell'applicazione)
  dynamic "access_policy" {
    for_each = var.reader_object_ids
    content {
      tenant_id          = var.tenant_id
      object_id          = access_policy.value
      secret_permissions = ["Get", "List"]
    }
  }
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  value        = var.db_password
  key_vault_id = azurerm_key_vault.this.id
}