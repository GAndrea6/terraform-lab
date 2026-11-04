# Suffisso casuale: ACR e Storage hanno nomi unici in tutto il mondo
resource "random_string" "suffix" {
  length  = 5
  upper   = false
  special = false
}

locals {
  prefix = "${var.project_name}-${var.environment}"
  suffix = random_string.suffix.result

  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

# 1. Resource Group
resource "azurerm_resource_group" "main" {
  name     = "rg-${local.prefix}"
  location = var.location
  tags     = local.tags
}

# 2. Networking
module "networking" {
  source              = "./modules/networking"
  prefix              = local.prefix
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  tags                = local.tags
}

# 3. Storage
module "storage" {
  source              = "./modules/storage"
  name                = "st${var.project_name}${var.environment}${local.suffix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  tags                = local.tags
}

# 4. ACR
module "acr" {
  source              = "./modules/acr"
  name                = "acr${var.project_name}${var.environment}${local.suffix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  tags                = local.tags
}

# 5. Monitoring
module "monitoring" {
  source              = "./modules/monitoring"
  prefix              = local.prefix
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  tags                = local.tags
}

# 6. Identity: identità gestita dell'applicazione
resource "azurerm_user_assigned_identity" "app" {
  name                = "id-${local.prefix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  tags                = local.tags
}

# L'identità può scaricare immagini da ACR
resource "azurerm_role_assignment" "acr_pull" {
  scope                = module.acr.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

# L'identità può leggere e scrivere file nello Storage
resource "azurerm_role_assignment" "storage_blob" {
  scope                = module.storage.id
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}

data "azurerm_client_config" "current" {}

# 7. Database PostgreSQL
module "database" {
  source              = "./modules/database"
  name                = "psql-${local.prefix}-${local.suffix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = coalesce(var.db_location, var.location)
  tags                = local.tags
  admin_login         = var.db_admin_login
  database_name       = "appdb"
  allowed_ip          = var.my_ip
}

# 8. Key Vault: custodisce la password del database
module "keyvault" {
  source              = "./modules/keyvault"
  name                = "kv-${local.prefix}-${local.suffix}"
  resource_group_name = azurerm_resource_group.main.name
  location            = var.location
  tags                = local.tags
  tenant_id           = data.azurerm_client_config.current.tenant_id
  admin_object_id     = data.azurerm_client_config.current.object_id
  reader_object_ids   = [azurerm_user_assigned_identity.app.principal_id]
  db_password         = module.database.admin_password
}