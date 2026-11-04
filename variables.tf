variable "subscription_id" {
  description = "ID della subscription Azure"
  type        = string
}

variable "project_name" {
  type    = string
  default = "lab23"
}

variable "environment" {
  description = "Ambiente (dev, test, prod)"
  type        = string
  default     = "dev"
}

variable "location" {
  description = "Regione Azure"
  type        = string
  default     = "westeurope"
}
variable "db_admin_login" {
  description = "Nome utente amministratore del database"
  type        = string
  default     = "dbadmin"
}

variable "my_ip" {
  description = "Il tuo IP pubblico, autorizzato dal firewall del database"
  type        = string
  default     = ""
}

variable "db_location" {
  description = "Regione del database (se vuota usa la regione principale)"
  type        = string
  default     = null
}